import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES, envInt, getWorkerNetwork } from '@shared/config/bullmq.config';
import { ROOT_TOPICS } from '@shared/config/configuration';
import { GuardianEventLogService } from './guardian-event-log.service';

interface AuditMeta {
    instanceId: string;
    subject: string;
}

/**
 * Translates a Guardian Application-Events subject + payload into a targeted job
 * on the worker's EXISTING per-network queues. Events are TRIGGERS, never direct
 * writers of message/business_view rows — the targeted mirror/IPFS fetch
 * materialises the canonical row against the real Hedera consensusTimestamp.
 *
 * Every event that results in a trigger is recorded to guardian_event_log (audit
 * only — observability, not a source of truth). Ignored events are not recorded.
 *
 * Contract:
 *   - route() NEVER throws (it is called per stream event; a malformed payload
 *     logs at debug and returns).
 *   - Every enqueue uses a STABLE jobId + removeOnComplete. jobIds match the
 *     canonical conventions so event and poll paths dedupe to one job.
 *   - enqueueTopicSync() targets TOPIC_SYNC_PRIORITY, a separate small queue,
 *     not the bulk TOPIC_SYNC crawl (priority/lifo ordering on that one proved
 *     unreliable at 100k+ jobs — see topic-sync-priority.processor.ts).
 */
@Injectable()
export class GuardianEventRouter {
    private readonly logger = new Logger(GuardianEventRouter.name);
    private readonly network = getWorkerNetwork();

    /** Hedera addresses every entity as `shard.realm.num`. */
    private static readonly HEDERA_ENTITY_ID = /^\d+\.\d+\.\d+$/;
    private readonly seedTopicId: string;

    /**
     * Guardian re-fires the same events every few seconds while a policy runs,
     * and an unresolvable one fans out to every registry topic. These cooldowns
     * collapse that storm to at most one wake per topic per window.
     */
    private readonly wakeCooldownSec = envInt('GUARDIAN_WAKE_COOLDOWN_S', 60);
    private readonly registrySweepCooldownSec = envInt('GUARDIAN_REGISTRY_SWEEP_COOLDOWN_S', 30);

    /**
     * A discontinue request is not re-fired the way block events are, but a
     * retried API call would send it twice — this collapses that to one ladder.
     */
    private readonly discontinueCooldownSec = envInt('GUARDIAN_DISCONTINUE_COOLDOWN_S', 60);

    /**
     * The discontinue event fires when Guardian RECEIVES the request, before it
     * has submitted the HCS message — so the first poll always finds nothing.
     * These rungs re-poll the policy topic across the consensus + mirror-node
     * ingestion window. Ingesting the message is what resolves the status.
     */
    private readonly discontinueTopicPollDelaysMs = [20_000, 60_000, 180_000];

    constructor(
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC_PRIORITY) private readonly topicQueue: Queue,
        private readonly eventLog: GuardianEventLogService,
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        @Inject('REDICT_PUB') private readonly redis: Redis,
    ) {
        this.seedTopicId = this.configService.get<string>('app.seedTopicId')
            || ROOT_TOPICS[this.network]
            || '';
    }

    async route(subject: string, payload: unknown, instanceId: string): Promise<void> {
        const meta: AuditMeta = { instanceId, subject };
        try {
            const key = subject.includes('.')
                ? subject.slice(subject.lastIndexOf('.') + 1)
                : subject;
            const p = payload && typeof payload === 'object'
                ? (payload as Record<string, unknown>)
                : null;

            switch (key) {
                case 'ipfs_added_file':
                    await this.onIpfsAdded(meta, payload);
                    break;
                case 'token_minted':
                    await this.onTokenMinted(meta, p);
                    break;
                case 'block_complete':
                    await this.onBlockComplete(meta, p);
                    break;
                case 'block_event':
                    await this.onBlockEvent(meta, payload);
                    break;
                case 'policy-engine-event-publish-policies':
                case 'policy-event-policy-ready':
                    await this.onPolicyLifecycle(meta, p);
                    break;
                case 'policy-engine-event-discontinue-policy':
                    await this.onPolicyDiscontinue(meta, p);
                    break;
                default:
                    // token_mint_complete, error_logs, ipfs hooks, mrv-data, … → ignore (not a trigger).
                    break;
            }
        } catch (err) {
            // Defensive: a router failure must never break the stream loop.
            this.logger.debug(
                `route(${subject}) skipped: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    /** Records one audit row for a trigger. Best-effort (the service swallows errors). */
    private audit(meta: AuditMeta, refType: string | null, refId: string | null, action: string): Promise<void> {
        return this.eventLog.record({
            network: this.network,
            instanceId: meta.instanceId,
            subject: meta.subject,
            refType,
            refId,
            action,
        });
    }

    /**
     * A fresh CID was pinned → warm the IPFS cache via the canonical fetch path.
     *
     * The AEM docs show this payload as `{cid, url}`, but Guardian's actual
     * publish call (worker-service `worker.ts`) sends the bare CID string —
     * `this.publish(ExternalMessageEvents.IPFS_ADDED_FILE, cid)` — and the AEM
     * HTTP layer forwards NATS payloads untouched. Accept both shapes.
     */
    private async onIpfsAdded(meta: AuditMeta, payload: unknown): Promise<void> {
        const cid = typeof payload === 'string'
            ? payload
            : (payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>)['cid'] === 'string')
                ? (payload as Record<string, unknown>)['cid'] as string
                : null;
        if (!cid) {
            this.logger.debug(`ipfs_added_file: no cid extracted from payload=${JSON.stringify(payload)}`);
            return;
        }
        await this.ipfsQueue.add(
            'fetch',
            { cid, messageTimestamp: '' },
            { jobId: `ipfs-${cid}`, removeOnComplete: true },
        );
        this.logger.log(`new file pinned cid=${cid} -> IPFS fetch enqueued (worker classifies registry/policy/VC)`);
        await this.audit(meta, 'cid', cid, 'ipfs-fetch enqueued');
    }

    /**
     * A token was minted → refresh that token's serials/supply.
     *
     * Guardian also emits this event for draft tokens, which are configured in
     * its own database and never created on Hedera. Those carry a generated UUID
     * where a token ID belongs, so the identifier's shape is what separates a
     * mint worth syncing from a draft the ledger has never heard of.
     */
    private async onTokenMinted(meta: AuditMeta, p: Record<string, unknown> | null): Promise<void> {
        const tokenId = p && typeof p['tokenId'] === 'string' ? (p['tokenId'] as string) : null;
        if (!tokenId) return;
        if (!GuardianEventRouter.HEDERA_ENTITY_ID.test(tokenId)) {
            this.logger.debug(
                `token_minted ignored: "${tokenId}" is a draft token, not a ledger token id`,
            );
            return;
        }
        await this.tokenQueue.add(
            'sync',
            { tokenId, fetchNfts: true, fromSerial: 0 },
            { jobId: `token-${tokenId}-evt`, removeOnComplete: true },
        );
        this.logger.log(`token minted tokenId=${tokenId} -> token sync enqueued`);
        await this.audit(meta, 'token', tokenId, 'token-sync enqueued');
    }

    /** A block-data chain settled → trigger a targeted sync of the policy's topic. */
    private async onBlockComplete(meta: AuditMeta, p: Record<string, unknown> | null): Promise<void> {
        if (!p) return;
        const status = typeof p['status'] === 'string' ? (p['status'] as string) : '';
        if (status !== 'success') return;
        const policyId = typeof p['policyId'] === 'string' ? (p['policyId'] as string) : '';
        if (!policyId) return;

        const topicId = await this.resolvePolicyTopic(policyId);
        if (topicId) {
            await this.enqueueTopicSync(topicId);
        } else {
            // Policy not crawled locally yet — no topic to target. Wake every
            // known registry topic instead of doing nothing (see
            // wakeRegistryTopics doc). The next block_complete (Guardian
            // re-fires these every few seconds) resolves once that catches up.
            await this.wakeRegistryTopics();
        }
        this.logger.log(
            `policy block settled policyId=${policyId} status=${status}` +
            (topicId ? ` -> topic ${topicId} sync enqueued` : ' (policy topic not yet known locally — woke registry topics)'),
        );
        await this.audit(meta, 'policy', policyId, topicId ? `topic-sync ${topicId}` : 'no topic resolved — woke registry');
    }

    /**
     * Policy block produced an external event. The documented payload carries no
     * topicId/policyId, so we can only act defensively when one is present.
     */
    private async onBlockEvent(meta: AuditMeta, payload: unknown): Promise<void> {
        const entries = Array.isArray(payload) ? payload : [];
        for (const entry of entries) {
            if (!entry || typeof entry !== 'object') continue;
            const e = entry as Record<string, unknown>;
            const type = typeof e['type'] === 'string' ? (e['type'] as string) : '';
            if (type !== 'Set' && type !== 'Run') continue;
            const policyId = typeof e['policyId'] === 'string' ? (e['policyId'] as string) : '';
            if (!policyId) continue; // no topic resolvable from the documented shape → drop
            const topicId = await this.resolvePolicyTopic(policyId);
            if (topicId) {
                await this.enqueueTopicSync(topicId);
                this.logger.log(`policy block event (${type}) policyId=${policyId} -> topic ${topicId} sync enqueued`);
                await this.audit(meta, 'policy', policyId, `topic-sync ${topicId}`);
            } else {
                await this.wakeRegistryTopics();
                await this.audit(meta, 'policy', policyId, 'no topic resolved — woke registry');
            }
        }
    }

    /**
     * Policy published / ready. Payload shape is undocumented (Phase 0): only act
     * on a plainly-present top-level topic/policy id, never parse nested fields.
     */
    private async onPolicyLifecycle(meta: AuditMeta, p: Record<string, unknown> | null): Promise<void> {
        if (!p) return;
        const directTopic =
            (typeof p['instanceTopicId'] === 'string' && p['instanceTopicId']) ||
            (typeof p['policyTopicId'] === 'string' && p['policyTopicId']) ||
            (typeof p['topicId'] === 'string' && p['topicId']) || '';
        if (directTopic) {
            await this.enqueueTopicSync(directTopic as string);
            this.logger.log(`policy published/ready -> topic ${directTopic} sync enqueued`);
            await this.audit(meta, 'topic', directTopic as string, `topic-sync ${directTopic}`);
            return;
        }
        const policyId = typeof p['policyId'] === 'string' ? (p['policyId'] as string) : '';
        if (!policyId) return;
        const topicId = await this.resolvePolicyTopic(policyId);
        if (topicId) {
            await this.enqueueTopicSync(topicId);
            this.logger.log(`policy published/ready policyId=${policyId} -> topic ${topicId} sync enqueued`);
            await this.audit(meta, 'policy', policyId, `topic-sync ${topicId}`);
        } else {
            await this.wakeRegistryTopics();
            await this.audit(meta, 'policy', policyId, 'no topic resolved — woke registry');
        }
    }

    /**
     * A methodology was discontinued (immediately, or deferred to a date).
     *
     * The payload is Guardian's REQUEST — `{ policyId, owner, date }` — sent
     * before the `Policy` / `discontinue-policy` HCS message exists, and the
     * request can still be rejected after this fires. So this only ever
     * triggers: the real message is ingested from the mirror node as usual, and
     * PolicyStatusProcessor decides from it.
     *
     * Once the message lands, MessageProcessProcessor enqueues the policy-status 
     * job itself — enqueuing one here as well would just duplicate that, and 
     * would guess at the state before the message it depends on exists.
     *
     * No registry-wake fallback when the policy is unknown locally: Standard
     * Registry topics are not where this message lands. The bulk crawl and the
     * reconciler's watch list still pick it up — this path only makes it faster.
     */
    private async onPolicyDiscontinue(meta: AuditMeta, p: Record<string, unknown> | null): Promise<void> {
        const policyId = p && typeof p['policyId'] === 'string' ? (p['policyId'] as string) : '';
        if (!policyId) return;

        if (!await this.acquireCooldown(
            `se:policy-discontinue:${this.network}:${policyId}`, this.discontinueCooldownSec)) {
            this.logger.debug(`Discontinue for policyId=${policyId} skipped — still within cooldown`);
            return;
        }

        const deferred = p?.['date'] != null && p['date'] !== '';
        const rows: Array<{ policyTopicId: string | null }> =
            await this.dataSource.query(
                `SELECT "policyTopicId" FROM policy WHERE "policyId" = $1 LIMIT 1`,
                [policyId],
            );
        const policyTopicId = rows[0]?.policyTopicId;

        if (!policyTopicId) {
            this.logger.log(
                `policy ${deferred ? 'deferred-' : ''}discontinue policyId=${policyId} ` +
                '— policy not known locally, left to the crawl + reconciler watch list',
            );
            await this.audit(meta, 'policy', policyId, 'no topic resolved — left to crawl');
            return;
        }

        // One tag per event, shared by every rung, so this event's polls never
        // collide with an earlier edit of the same discontinuation.
        const eventTag = Math.floor(Date.now() / 1000);

        await this.enqueueTopicSync(policyTopicId);
        for (const delayMs of this.discontinueTopicPollDelaysMs) {
            await this.enqueueDelayedTopicSync(policyTopicId, delayMs, `disc-${eventTag}-${delayMs}`);
        }

        this.logger.log(
            `policy ${deferred ? 'deferred-' : ''}discontinue policyId=${policyId} -> policy topic ` +
            `${policyTopicId} polls enqueued`,
        );
        await this.audit(meta, 'policy', policyId, `topic-sync ${policyTopicId}`);
    }

    /** Indexed lookup: policyId → the instance topic (where VCs live), else policy topic. */
    private async resolvePolicyTopic(policyId: string): Promise<string | null> {
        const rows: Array<{ policyTopicId: string | null; instanceTopicId: string | null }> =
            await this.dataSource.query(
                `SELECT "policyTopicId", "instanceTopicId" FROM policy WHERE "policyId" = $1 LIMIT 1`,
                [policyId],
            );
        const row = rows[0];
        if (!row) return null;
        return row.instanceTopicId || row.policyTopicId || null;
    }

    /**
     * Forces an immediate priority re-poll of every topic where a
     * policy-related announcement could land. Used when a policy-related
     * event can't be resolved to a specific topic (the policy hasn't been
     * crawled locally yet, so `policy` has no row for it).
     *
     * Two distinct cases, two distinct topics:
     *   - A brand-new Standard Registry announces itself on the network's
     *     global seed/root topic (ROOT_TOPICS / SEED_TOPIC_ID).
     *   - A new policy published by an ALREADY-registered Standard Registry
     *     lands on that SR's own topic instead — never the global root. That
     *     topic was discovered long ago (at SR registration), so it never got
     *     `oneTimePriority` and sits on the bulk queue's backoff like any of
     *     the other 100k+ topics, even though a message relevant right now
     *     just landed on it. Waking only the global seed can never surface
     *     this case, no matter how many times it's retried.
     *
     * So this wakes the seed topic (covers new-SR discovery) AND every
     * already-known Standard Registry topic (covers new-policy-on-existing-SR)
     * — a small, bounded set, one per registry.
     */
    private async wakeRegistryTopics(): Promise<void> {
        // Guardian re-fires unresolvable policy events every few seconds, and
        // each one fans out across every registry topic. Without this gate the
        // sweep runs continuously and the priority lane never drains.
        if (!await this.acquireCooldown(
            `se:wake-registries:${this.network}`, this.registrySweepCooldownSec)) {
            this.logger.debug('Registry wake sweep skipped — still within cooldown');
            return;
        }

        if (this.seedTopicId) {
            await this.enqueueTopicSync(this.seedTopicId);
        }

        const rows: Array<{ topicId: string }> = await this.dataSource.query(
            `SELECT DISTINCT "topicId" FROM message WHERE type = 'Standard Registry'`,
        );
        for (const row of rows) {
            if (row.topicId && row.topicId !== this.seedTopicId) {
                await this.enqueueTopicSync(row.topicId);
            }
        }
    }

    /**
     * Best-effort distributed cooldown: SET NX EX succeeds only for the first
     * caller in the window. Redis being unavailable must never stop an event
     * from routing, so a failure here falls through to "not throttled".
     */
    private async acquireCooldown(key: string, ttlSec: number): Promise<boolean> {
        if (ttlSec <= 0) return true;
        try {
            return await this.redis.set(key, '1', 'EX', ttlSec, 'NX') === 'OK';
        } catch {
            return true;
        }
    }

    /**
     * Targeted topic sync onto TOPIC_SYNC_PRIORITY (injected as topicQueue),
     * never the bulk TOPIC_SYNC crawl — see the class doc comment for why.
     *
     * `fromSequenceNumber: 0` means "resume from the persisted watermark"; the
     * topic-sync processors clamp it to topic_cache.messages, so this is a cheap
     * head-poll rather than a full re-crawl of the topic.
     *
     * Rather than remove-then-add (which races another producer and can delete a
     * job a worker has already picked up), this promotes an existing delayed job
     * and otherwise leaves in-flight work alone: a waiting or active job is
     * already going to do exactly what this event is asking for.
     */
    private async enqueueTopicSync(topicId: string): Promise<void> {
        if (!await this.acquireCooldown(
            `se:wake:${this.network}:${topicId}`, this.wakeCooldownSec)) {
            this.logger.debug(`Topic ${topicId} wake skipped — still within cooldown`);
            return;
        }

        // Mark the topic as due now and urgent. In dispatcher mode this is what
        // makes the poll happen; the direct enqueue below still runs so latency
        // does not depend on the next dispatcher tick. In chain mode it simply
        // keeps the persisted schedule honest.
        await this.dataSource.query(
            `UPDATE topic_cache
                SET "nextPollAt" = now(), "pollPriority" = 10
              WHERE "topicId" = $1`,
            [topicId],
        ).catch(() => {
            // The topic may not be in topic_cache yet — the enqueue below still
            // discovers it.
        });

        const jobId = `topic-${topicId}-evt`;
        const existing = await this.topicQueue.getJob(jobId).catch(() => undefined);

        if (existing) {
            const state = await existing.getState().catch(() => 'unknown');
            if (state === 'delayed') {
                // Bring the backoff-delayed poll forward instead of duplicating it.
                await existing.promote().catch(() => { });
                return;
            }
            if (state === 'waiting' || state === 'active' || state === 'prioritized') {
                return;
            }
            // Finished (completed/failed) — clear it so the id is free to re-add.
            await existing.remove().catch(() => { });
        }

        await this.topicQueue.add(
            'sync',
            { topicId, fromSequenceNumber: 0, isOrgTopic: true },
            { jobId, removeOnComplete: true },
        );
    }

    /**
     * A scheduled priority poll, for when the message an event announces cannot
     * be on the mirror node yet.
     *
     * Deliberately bypasses both of enqueueTopicSync()'s guards: the wake
     * cooldown would drop every rung after the first, and its single stable
     * `topic-<id>-evt` jobId would treat a waiting rung as "already covered".
     * Each rung therefore needs its own id. Like every topic sync it resumes
     * from the persisted watermark, so a rung that finds nothing is one cheap
     * head-poll.
     */
    private async enqueueDelayedTopicSync(topicId: string, delayMs: number, tag: string): Promise<void> {
        await this.topicQueue.add(
            'sync',
            { topicId, fromSequenceNumber: 0, isOrgTopic: true },
            { jobId: `topic-${topicId}-${tag}`, delay: delayMs, removeOnComplete: true },
        );
    }
}

import {
    Processor,
    WorkerHost,
    OnWorkerEvent,
    InjectQueue,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES, getWorkerOptions } from '@shared/config/bullmq.config';
import { ROOT_TOPICS } from '@shared/config/configuration';
import {
    ParsedMessage,
    parseMessageJson,
    extractDiscoverableTopics,
    extractTokenIds,
    DISCONTINUE_ACTIONS,
} from '@shared/utils/message-parser';
import { isTopicBlocked } from '@shared/config/topic-blocklist';
import { isRegistryAllowlistActive, isTopicAllowedFromSeed } from '@shared/config/registry-allowlist';

export interface MessageProcessJobData {
    consensusTimestamp: string;
    topicId: string;
    // True when the topic-sync job that found this message ran on
    // TOPIC_SYNC_PRIORITY (root/registry topic, guardian-sync events, or a
    // topic that itself cascaded from one of those).
    fromPriorityLane?: boolean;
}

// Message types for which IPFS fetch is always enqueued immediately (not VCs).
const EAGER_IPFS_TYPES = new Set([
    'Standard Registry',
    'Tag',
    'Token',
    //'VP-Document' TODO: Check the relationship attribute whether we can use it
]);

@Processor(QUEUE_NAMES.MESSAGE_PARSE, getWorkerOptions(QUEUE_NAMES.MESSAGE_PARSE))
export class MessageProcessProcessor extends WorkerHost {
    private readonly logger = new Logger(MessageProcessProcessor.name);
    private readonly seedTopicId: string;

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_DECODE) private readonly policyDecodeQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC_PRIORITY) private readonly topicPriorityQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_STATUS) private readonly policyStatusQueue: Queue,
    ) {
        super();
        const network = this.configService.get<string>('app.hedera.network') || 'testnet';
        this.seedTopicId = this.configService.get<string>('app.seedTopicId')
            || ROOT_TOPICS[network]
            || '';
    }

    async process(job: Job<MessageProcessJobData>): Promise<void> {
        const { consensusTimestamp, topicId, fromPriorityLane = false } = job.data;

        if (isTopicBlocked(topicId)) {
            this.logger.debug(`Topic ${topicId} is blocklisted — skipping message ${consensusTimestamp}`);
            return;
        }

        // Read from message_cache
        // TODO: Optimise to read bulk
        const rows = await this.dataSource.query(
            `SELECT * FROM message_cache WHERE "consensusTimestamp" = $1 LIMIT 1`,
            [consensusTimestamp],
        );

        if (rows.length === 0) {
            this.logger.warn(
                `Message cache entry not found for ${consensusTimestamp}`,
            );
            return;
        }

        const cacheEntry = rows[0];

        // Reassemble HCS chunks if needed. Hedera caps each consensus message at
        // 1024 bytes; larger payloads ship as multiple chunks sharing a chunkId.
        // Each chunk is independent base64 — decode each to bytes, concat bytes,
        // then UTF-8 decode the whole thing.
        const decoded = await this.decodeMessage(cacheEntry, consensusTimestamp);
        if (decoded === null) return;       // waiting for more chunks
        if (decoded === '') {
            this.logger.warn(`Failed to base64 decode message ${consensusTimestamp}`);
            await this.updateCacheStatus(consensusTimestamp, 'DECODE_ERROR');
            return;
        }

        // Parse JSON
        const parsed = parseMessageJson(decoded);
        if (!parsed) {
            this.logger.warn(
                `Failed to parse JSON for message ${consensusTimestamp}`,
            );
            await this.updateCacheStatus(consensusTimestamp, 'PARSE_ERROR');
            return;
        }

        // Upsert into message table
        const [{ id: messageId }]: Array<{ id: string }> = await this.dataSource.query(
            `INSERT INTO message (
                "consensusTimestamp",
                "topicId",
                owner,
                uuid,
                type,
                action,
                status,
                "statusReason",
                "statusMessage",
                lang,
                "responseType",
                "sequenceNumber",
                files,
                options,
                topics,
                tokens,
                "dataSource",
                "lastUpdate",
                "createdAt",
                "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'mirror_node', $17, NOW(), NOW())
            ON CONFLICT ("consensusTimestamp") DO UPDATE SET
                owner = COALESCE(EXCLUDED.owner, message.owner),
                uuid = COALESCE(EXCLUDED.uuid, message.uuid),
                type = EXCLUDED.type,
                action = EXCLUDED.action,
                status = COALESCE(EXCLUDED.status, message.status),
                "statusReason" = COALESCE(EXCLUDED."statusReason", message."statusReason"),
                "statusMessage" = COALESCE(EXCLUDED."statusMessage", message."statusMessage"),
                lang = COALESCE(EXCLUDED.lang, message.lang),
                "responseType" = COALESCE(EXCLUDED."responseType", message."responseType"),
                "sequenceNumber" = EXCLUDED."sequenceNumber",
                files = EXCLUDED.files,
                options = COALESCE(message.options, '{}'::jsonb) || COALESCE(EXCLUDED.options, '{}'::jsonb),
                topics = EXCLUDED.topics,
                tokens = EXCLUDED.tokens,
                "dataSource" = CASE
                    WHEN message."dataSource" = 'guardian_api' THEN 'both'
                    ELSE 'mirror_node'
                END,
                "lastUpdate" = EXCLUDED."lastUpdate",
                "updatedAt" = NOW()
            RETURNING id`,
            [
                consensusTimestamp,
                topicId,
                parsed.owner || cacheEntry.owner,
                parsed.uuid,
                parsed.type,
                parsed.action,
                parsed.status,
                parsed.statusReason,
                parsed.statusMessage,
                parsed.lang,
                parsed.responseType,
                cacheEntry.sequenceNumber,
                parsed.files.length > 0 ? parsed.files : null,
                Object.keys(parsed.options).length > 0
                    ? JSON.stringify(parsed.options)
                    : null,
                parsed.topics.length > 0 ? parsed.topics : null,
                parsed.tokens.length > 0 ? parsed.tokens : null,
                Date.now().toString(),
            ],
        );

        // Reconcile message_ipfs_cid — the precomputed (cid, message) relationship
        // GET /:network/ipfs-status reads instead of unnest()ing message.files
        // live on every request. `files` can change on reprocess (project-reparse
        // requeues from sequence 0), so this deletes whatever this message used to
        // reference that it no longer does, then inserts whatever's new.
        // `cid <> ALL($2)` against an empty array is vacuously true — deletes
        // every existing row for this message when files is now empty, correctly.
        await this.dataSource.query(
            `DELETE FROM message_ipfs_cid WHERE "messageId" = $1 AND cid <> ALL($2::text[])`,
            [messageId, parsed.files],
        );
        if (parsed.files.length > 0) {
            await this.dataSource.query(
                `INSERT INTO message_ipfs_cid (cid, "messageId", "topicId", "messageType")
                 SELECT unnest($1::text[]), $2, $3, $4
                 ON CONFLICT (cid, "messageId") DO NOTHING`,
                [parsed.files, messageId, topicId, parsed.type],
            );
        }

        const isPublishedPolicy =
            parsed.type === 'Instance-Policy' &&
            (parsed.action || '').toLowerCase() === 'publish-policy';

        if (isPublishedPolicy) {
            const optionTopicId = parsed.options['topicId'];
            const policyTopicId = typeof optionTopicId === 'string' && optionTopicId.length > 0
                ? optionTopicId
                : topicId;

            const optionInstanceTopicId = parsed.options['instanceTopicId'];
            const instanceTopicId = typeof optionInstanceTopicId === 'string' && optionInstanceTopicId.length > 0
                ? optionInstanceTopicId
                : null;

            for (const cid of parsed.files) {
                await this.policyDecodeQueue.add('decode', {
                    cid,
                    messageTimestamp: consensusTimestamp,
                    policyTopicId,
                    instanceTopicId,
                }, {
                    // Keyed on the CID alone so this dedupes against the scheduler's
                    // seeding, which enqueues the same unit of work — and against
                    // the decode lease, which conflicts on "sourceCid".
                    jobId: `policy-decode-${cid}`,
                });
            }

            // Register the policy topic with the policy-status queue, so a
            // discontinuation that was already on-chain before this publish was
            // ingested resolves immediately instead of waiting for the reconciler.
            // Keyed on the topic the message physically landed on, because that is
            // what PolicyStatusProcessor selects by.
            await this.enqueuePolicyStatus(topicId, 'publish', consensusTimestamp);
        }

        // A methodology being discontinued (immediately or on a future date).
        // Guardian sends these as `Policy` messages to the same policy topic as
        // the publish message, so they arrive through this same path.
        // The topic is enough to resolve it: PolicyStatusProcessor re-reads every
        // discontinue message on the topic and attributes each to the version it
        // names, so a message that names no version is reported there rather than
        // being filtered out here.
        if (parsed.type === 'Policy' && parsed.action && DISCONTINUE_ACTIONS.has(parsed.action)) {
            await this.enqueuePolicyStatus(topicId, 'discontinue', consensusTimestamp);
        }

        // ── IPFS fetch strategy ────────────────────────────────────────────────
        // VC-Document fetches are deferred until the parent policy is decoded
        // so we don't waste gateway slots on VCs from broken methodologies.
        // All other types (Schema, Standard Registry, Instance-Policy, etc.)
        // are fetched eagerly as before.
        if (parsed.type === 'VC-Document') {
            await this.enqueueVcIpfsFetchIfReady(parsed, consensusTimestamp, topicId);
        } else if (EAGER_IPFS_TYPES.has(parsed.type)) {
            for (const cid of parsed.files) {
                await this.ipfsQueue.add(
                    'fetch',
                    { cid, messageTimestamp: consensusTimestamp },
                    { jobId: `ipfs-${cid}` },
                );
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Discover and enqueue child topics.
        // When ONLY_REGISTRY_TOPIC is set, only follow topics from the seed
        // topic that appear in the allowlist. Deeper discoveries are unfiltered.
        const discoveredTopics = extractDiscoverableTopics(parsed, topicId);
        const filterSeedDiscovery = topicId === this.seedTopicId && isRegistryAllowlistActive();
        for (const topic of discoveredTopics) {
            if (filterSeedDiscovery && !isTopicAllowedFromSeed(topic.topicId)) {
                this.logger.debug(
                    `Skipping topic ${topic.topicId} — not in ONLY_REGISTRY_TOPIC allowlist`,
                );
                continue;
            }
            const targetQueue = fromPriorityLane ? this.topicPriorityQueue : this.topicQueue;
            await targetQueue.add(
                'sync',
                {
                    topicId: topic.topicId,
                    fromSequenceNumber: 0,
                    isOrgTopic: topic.isOrgTopic,
                    oneTimePriority: fromPriorityLane,
                },
                {
                    jobId: `topic-${topic.topicId}-0`,
                },
            );
        }

        // Enqueue token sync for discovered tokens, coalesced per token per
        // minute rather than per (token, message). A token referenced by a
        // thousand messages used to produce a thousand identical full syncs, each
        // one a getToken plus a serial walk.
        //
        // The time bucket matters. Keying on the token alone looked tidier but
        // tied the dedup window to job retention: once a sync completed, every
        // later message about that token enqueued nothing at all until the
        // finished job aged out, and nothing else re-syncs a token in the
        // meantime — scheduleTokenSyncs only runs during boot seeding — so those
        // updates were silently dropped.
        const tokenBucket = Math.floor(Date.now() / 60_000);
        const tokenIds = extractTokenIds(parsed);
        for (const tokenId of tokenIds) {
            await this.tokenQueue.add(
                'sync',
                {
                    tokenId,
                    fetchNfts: true,
                    fromSerial: 0,
                },
                {
                    jobId: `token-${tokenId}-${tokenBucket}`,
                },
            );
        }

        // Update cache status
        await this.updateCacheStatus(consensusTimestamp, 'PROCESSED');

        this.logger.debug(
            `Processed message ${consensusTimestamp}: type=${parsed.type} action=${parsed.action}`,
        );
    }

    /**
     * Asks the policy-status queue to re-resolve one methodology's discontinue
     * state.
     *
     * The jobId is scoped to the triggering MESSAGE, never to the methodology
     * alone: finished jobs are retained for QUEUE_KEEP_COMPLETED_AGE_S (an hour
     * by default) and re-adding a retained jobId is silently dropped — which
     * would swallow exactly the case that matters, an edited deferral arriving
     * minutes after the discontinuation it replaces.
     */
    private async enqueuePolicyStatus(
        policyTopicId: string,
        reason: 'publish' | 'discontinue',
        consensusTimestamp: string,
    ): Promise<void> {
        await this.policyStatusQueue.add(
            'resolve',
            { policyTopicId, reason },
            { jobId: `policy-status-${policyTopicId}-${reason}-${consensusTimestamp}` },
        );
    }

    /**
     * For a VC-Document: walk the topic parent chain to find the nearest policy
     * topic ID, then check the policy table. Enqueues IPFS fetch only when the
     * policy is decoded successfully. If the policy topic cannot be resolved, or
     * its decodeStatus is not 'decoded', the fetch is deferred; it will be
     * backfilled by PolicyDecodeProcessor once that policy succeeds, or by the
     * boot-time backfill in SyncSchedulerService.
     */
    private async enqueueVcIpfsFetchIfReady(
        parsed: ParsedMessage,
        consensusTimestamp: string,
        topicId: string,
    ): Promise<void> {
        if (parsed.files.length === 0) return;

        // Registry profile topics aren't under any policy. Their VCs carry the
        // OrganizationName used as the registry display-name fallback in
        // BusinessViewBuilderProcessor, so they must fetch eagerly.
        if (await this.isStandardRegistryProfileTopic(topicId)) {
            for (const cid of parsed.files) {
                await this.ipfsQueue.add(
                    'fetch',
                    { cid, messageTimestamp: consensusTimestamp },
                    { jobId: `ipfs-${cid}` },
                );
            }
            return;
        }

        const policyTopicId = await this.resolveParentPolicyTopicId(topicId);
        if (!policyTopicId) {
            this.logger.debug(
                `VC ${consensusTimestamp}: could not resolve policy topic — deferring IPFS fetch`,
            );
            return;
        }

        const statusRows: Array<{ decodeStatus: string }> = await this.dataSource.query(
            `SELECT "decodeStatus" FROM policy WHERE "policyTopicId" = $1 LIMIT 1`,
            [policyTopicId],
        );

        if (statusRows.length === 0 || statusRows[0].decodeStatus !== 'decoded') {
            this.logger.debug(
                `VC ${consensusTimestamp}: policy=${policyTopicId} not yet decoded — deferring IPFS fetch`,
            );
            return;
        }

        for (const cid of parsed.files) {
            await this.ipfsQueue.add(
                'fetch',
                { cid, messageTimestamp: consensusTimestamp },
                { jobId: `ipfs-${cid}` },
            );
        }
    }

    /**
     * Returns true if the given topic is the profile/DID topic of any Standard
     * Registry (i.e., referenced by `options.topicId` on a `Standard Registry`
     * announcement message in the root topic).
     */
    // TODO: Optimise this get, cache all the standard registries in memory, to reduct DB load
    private async isStandardRegistryProfileTopic(topicId: string): Promise<boolean> {
        const rows: Array<{ ok: number }> = await this.dataSource.query(
            `SELECT 1 AS ok
             FROM message
             WHERE type = 'Standard Registry'
               AND options->>'topicId' = $1
             LIMIT 1`,
            [topicId],
        );
        return rows.length > 0;
    }

    /**
     * Walks the topic parent chain (via Topic messages) to find the Instance-Policy
     * topic ID that is the logical policy owner for a given topic.
     *
     * Stops at the first ancestor that appears in message as an Instance-Policy row.
     * Returns null if the chain is exhausted without finding a policy topic.
     *
     * Cached per-call with a local Map to avoid repeated DB round trips when
     * multiple VCs from the same topic are processed in one job batch.
     */
    private async resolveParentPolicyTopicId(topicId: string): Promise<string | null> {
        // Walk up to 12 hops — the parent chain is always shallow in practice.
        let currentTopicId: string | null = topicId;
        const visited = new Set<string>();

        for (let i = 0; i < 12; i++) {
            if (!currentTopicId || visited.has(currentTopicId)) break;
            visited.add(currentTopicId);

            // Check if this topic is itself an Instance-Policy topic
            const policyRows: Array<{ topicId: string }> = await this.dataSource.query(
                `SELECT "topicId"
                 FROM message
                 WHERE type = 'Instance-Policy'
                   AND action = 'publish-policy'
                   AND "topicId" = $1
                 LIMIT 1`,
                [currentTopicId],
            );
            if (policyRows.length > 0) return currentTopicId;

            // Also check instanceTopicId — policies reference their instance topic
            const instRows: Array<{ topicId: string }> = await this.dataSource.query(
                `SELECT "topicId"
                 FROM message
                 WHERE type = 'Instance-Policy'
                   AND action = 'publish-policy'
                   AND options->>'instanceTopicId' = $1
                 LIMIT 1`,
                [currentTopicId],
            );
            if (instRows.length > 0) return instRows[0].topicId;

            // Walk one level up via Topic parentId
            const parentRows: Array<{ parent_id: string | null }> = await this.dataSource.query(
                `SELECT options->>'parentId' AS parent_id
                 FROM message
                 WHERE type = 'Topic' AND "topicId" = $1
                 LIMIT 1`,
                [currentTopicId],
            );
            currentTopicId = parentRows[0]?.parent_id ?? null;
        }

        return null;
    }

    private async updateCacheStatus(
        consensusTimestamp: string,
        status: string,
    ): Promise<void> {
        await this.dataSource.query(
            `UPDATE message_cache SET status = $1, "lastUpdate" = $2 WHERE "consensusTimestamp" = $3`,
            [status, Date.now().toString(), consensusTimestamp],
        );
    }

    /**
     * Returns the assembled UTF-8 payload, OR:
     *   - `null` when this is a multi-chunk message and not all chunks have
     *     landed yet (the last chunk's processing run will reassemble).
     *   - `''` when base64 decoding fails (caller marks DECODE_ERROR).
     */
    private async decodeMessage(
        cacheEntry: { message: string; chunkId: string | null; chunkTotal: number | null },
        consensusTimestamp: string,
    ): Promise<string | null> {
        const total = cacheEntry.chunkTotal ?? 1;
        if (!cacheEntry.chunkId || total <= 1) {
            try {
                return Buffer.from(cacheEntry.message, 'base64').toString('utf-8');
            } catch {
                return '';
            }
        }

        const chunks: Array<{ message: string }> = await this.dataSource.query(
            `SELECT message FROM message_cache
             WHERE "chunkId" = $1
             ORDER BY "chunkNumber"`,
            [cacheEntry.chunkId],
        );
        if (chunks.length < total) {
            this.logger.debug(
                `Message ${consensusTimestamp} chunk ${chunks.length}/${total} — waiting for more`,
            );
            return null;
        }

        try {
            const buffers = chunks.map(c => Buffer.from(c.message, 'base64'));
            return Buffer.concat(buffers).toString('utf-8');
        } catch {
            return '';
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<MessageProcessJobData>, error: Error): void {
        this.logger.error(
            `Message process job ${job.id} failed for ${job.data.consensusTimestamp}: ${error.message}`,
            error.stack,
        );
    }
}

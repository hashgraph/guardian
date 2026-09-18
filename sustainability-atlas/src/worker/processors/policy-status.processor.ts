import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES, getWorkerOptions } from '@shared/config/bullmq.config';
import { DISCONTINUE_ACTIONS } from '@shared/utils/message-parser';

export interface PolicyStatusJobData {
    /**
     * The policy topic to resolve. This is the topic Guardian posts BOTH the
     * publish messages and the discontinue messages to, so one job settles every
     * published version of the policy at once.
     */
    policyTopicId: string;
    /** What produced this job — logged, and useful when reading the queue dashboard. */
    reason: 'publish' | 'discontinue' | 'watch';
}

/** A discontinue message that passed every validation. */
interface ValidDiscontinuation {
    consensusTimestamp: string;
    action: string;
    effectiveAt: Date;
}

interface PublishRow {
    consensusTimestamp: string;
    owner: string | null;
    instanceTopicId: string;
}

interface DiscontinueRow {
    consensusTimestamp: string;
    owner: string | null;
    action: string | null;
    options: Record<string, unknown> | null;
}

/**
 * Converts a Hedera consensus timestamp ("seconds.nanoseconds") to a BigInt of
 * nanoseconds for exact ordering.
 *
 * Number() is not safe here: the value carries 19 significant digits and a
 * double holds 15–16, so two messages in the same second can compare equal —
 * precisely the case this processor exists to order correctly.
 */
function tsToNanos(consensusTimestamp: string): bigint {
    const [seconds, nanos = ''] = consensusTimestamp.split('.');
    return BigInt(seconds) * 1_000_000_000n + BigInt(nanos.padEnd(9, '0').slice(0, 9));
}

/** Consensus timestamp → Date (millisecond resolution is plenty for a display date). */
function tsToDate(consensusTimestamp: string): Date {
    return new Date(Number(tsToNanos(consensusTimestamp) / 1_000_000n));
}

/**
 * Resolves, for one policy topic, whether each of its published versions has
 * been discontinued and when.
 *
 * Guardian records a discontinuation as a `Policy` message on the POLICY topic,
 * in one of two flavours: `discontinue-policy` (immediate) and
 * `deferred-discontinue-policy` (a future `effectiveDate`). Nothing is published
 * when a deferred date arrives — Guardian only updates its own database on an
 * hourly cron — so this processor stores the effective DATE and the read path
 * compares it against now(). A deferred discontinuation therefore takes effect
 * on its own date with no message, no cron and no re-ingest here.
 *
 * The job is keyed on the policy topic rather than on a single published version
 * because that is the unit the messages actually share: the publish messages for
 * every version and every discontinue message aimed at any of them all land on
 * the same topic. Two indexed reads therefore settle the whole policy, and a
 * discontinuation ingested before the publish it refers to needs no special
 * case — whichever message arrives second re-runs this with both in hand.
 *
 * A version can accumulate SEVERAL discontinue messages: a deferred
 * discontinuation can be edited (to a new or identical date), or superseded by
 * an immediate one. Only the newest valid message for that version may take
 * effect, which is why this resolves from the full candidate set on every run
 * rather than reacting to one message in isolation — that also makes it
 * naturally idempotent and immune to ingest order.
 *
 * Reads the local `message` table rather than the mirror node: the policy topic
 * is already synced by TopicSyncProcessor, so re-fetching would spend the
 * rate-limited mirror-node budget twice for data already in Postgres.
 */
@Processor(QUEUE_NAMES.POLICY_STATUS, getWorkerOptions(QUEUE_NAMES.POLICY_STATUS))
export class PolicyStatusProcessor extends WorkerHost {
    private readonly logger = new Logger(PolicyStatusProcessor.name);

    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async process(job: Job<PolicyStatusJobData>): Promise<void> {
        const { policyTopicId, reason } = job.data;
        if (!policyTopicId) return;

        // 1. Every published version on this topic. Each validation below is
        //    relative to the version's own publish message, so a discontinuation
        //    naming a version we have not ingested yet has nothing to validate
        //    against and is left for the run that follows that publish.
        const publishes: PublishRow[] = await this.dataSource.query(
            `SELECT "consensusTimestamp", owner, options->>'instanceTopicId' AS "instanceTopicId"
               FROM message
              WHERE type = 'Instance-Policy'
                AND action = 'publish-policy'
                AND "topicId" = $1
                AND options->>'instanceTopicId' IS NOT NULL`,
            [policyTopicId],
        );

        if (publishes.length === 0) {
            this.logger.debug(
                `policyTopicId=${policyTopicId}: no publish-policy message yet — skipping (reason=${reason})`,
            );
            return;
        }

        // Newest publish per version — a version is normally published once, but
        // re-publishing the same instance topic must not change which message the
        // ordering checks compare against.
        const publishByVersion = new Map<string, PublishRow>();
        for (const publish of publishes) {
            const previous = publishByVersion.get(publish.instanceTopicId);
            if (!previous || tsToNanos(publish.consensusTimestamp) > tsToNanos(previous.consensusTimestamp)) {
                publishByVersion.set(publish.instanceTopicId, publish);
            }
        }

        // 2. Every discontinue message on this topic, whichever version it names.
        const candidates: DiscontinueRow[] = await this.dataSource.query(
            `SELECT "consensusTimestamp", owner, action, options
               FROM message
              WHERE type = 'Policy'
                AND action = ANY($2::text[])
                AND "topicId" = $1`,
            [policyTopicId, [...DISCONTINUE_ACTIONS]],
        );

        // 3. Attribute each to the version it names and validate it there.
        const validByVersion = new Map<string, ValidDiscontinuation[]>();
        for (const candidate of candidates) {
            const instanceTopicId = candidate.options?.['instanceTopicId'];
            if (typeof instanceTopicId !== 'string' || !instanceTopicId) {
                // Messages ingested before the parser knew the discontinue actions
                // were stored with the generic `Policy` shape, which drops
                // instanceTopicId. The reconciler re-parses those from message_cache,
                // so this can appear briefly right after a deploy. If it keeps
                // appearing for one message, its cache entry is gone and it cannot
                // be re-parsed without re-crawling the topic.
                this.logger.debug(
                    `policyTopicId=${policyTopicId}: ${candidate.action} message ` +
                    `${candidate.consensusTimestamp} names no instanceTopicId — cannot attribute it`,
                );
                continue;
            }

            const publish = publishByVersion.get(instanceTopicId);
            if (!publish) {
                this.logger.debug(
                    `policyTopicId=${policyTopicId}: ${candidate.action} message ` +
                    `${candidate.consensusTimestamp} names ${instanceTopicId}, which has no ` +
                    `publish-policy message here yet — leaving it for the next run`,
                );
                continue;
            }

            const resolved = this.validate(candidate, publish, instanceTopicId);
            if (!resolved) continue;

            const existing = validByVersion.get(instanceTopicId);
            if (existing) existing.push(resolved);
            else validByVersion.set(instanceTopicId, [resolved]);
        }

        // 4. Write each version. Versions with no valid discontinuation are written
        //    too, with explicit nulls, so a previously-stored value is cleared if it
        //    ever stops being valid.
        let rowsUpdated = 0;
        const summary: string[] = [];

        for (const instanceTopicId of publishByVersion.keys()) {
            // Newest wins. This is the edited-deferral rule: a later deferral (new
            // or identical date) or a later immediate discontinuation supersedes
            // whatever came before it.
            const valid = validByVersion.get(instanceTopicId) ?? [];
            valid.sort((a, b) => (tsToNanos(a.consensusTimestamp) < tsToNanos(b.consensusTimestamp) ? 1 : -1));
            const winner = valid[0] ?? null;

            const updated = await this.writeVersion(instanceTopicId, winner, valid.length);
            if (updated === 0) continue;

            rowsUpdated += updated;
            summary.push(
                winner
                    ? `${instanceTopicId} → ${winner.effectiveAt.toISOString()} via ${winner.action} ` +
                    `(message ${winner.consensusTimestamp}, superseded ${valid.length - 1}, ${updated} row(s))`
                    : `${instanceTopicId} → cleared (${updated} row(s))`,
            );
        }

        if (rowsUpdated > 0) {
            this.logger.log(
                `policyTopicId=${policyTopicId}: ${publishByVersion.size} version(s), ` +
                `${candidates.length} discontinue candidate(s) — ${summary.join('; ')}`,
            );
        }
    }

    /**
     * Applies the resolved state to every METHODOLOGY row of one version.
     *
     * Republish churn means several business_view rows can share one
     * relatedTopicId, so this is deliberately not a single-row update.
     */
    private async writeVersion(
        instanceTopicId: string,
        winner: ValidDiscontinuation | null,
        validCount: number,
    ): Promise<number> {
        const payload = winner
            ? {
                discontinuedAt: winner.effectiveAt.toISOString(),
                discontinuedAction: winner.action,
                discontinuedMessageTimestamp: winner.consensusTimestamp,
                discontinuedSupersededCount: validCount - 1,
            }
            : {
                discontinuedAt: null,
                discontinuedAction: null,
                discontinuedMessageTimestamp: null,
                discontinuedSupersededCount: null,
            };

        // COALESCE because `NULL || jsonb` is NULL — a row with no businessData
        // would silently never be updated otherwise. The IS DISTINCT FROM guard
        // keeps a no-op run from rewriting the row (and churning its indexes),
        // mirroring the business-view builder's own unchanged-guard.
        const updated: Array<{ id: string }> = await this.dataSource.query(
            `UPDATE business_view
                SET "businessData" = COALESCE("businessData", '{}'::jsonb) || $2::jsonb,
                    "lastUpdate"   = $3,
                    "updatedAt"    = NOW()
              WHERE "viewType" = 'METHODOLOGY'
                AND "relatedTopicId" = $1
                AND (COALESCE("businessData", '{}'::jsonb) || $2::jsonb)
                    IS DISTINCT FROM COALESCE("businessData", '{}'::jsonb)
              RETURNING id`,
            [instanceTopicId, JSON.stringify(payload), Date.now().toString()],
        );

        return updated.length;
    }

    /**
     * Applies every validation a discontinue message must pass, returning its
     * resolved effective date, or null if it is rejected and rejection is logged at debug.
     *
     * The owner check matters because a `Policy` message naming someone else's
     * instanceTopicId would otherwise be able to mark a methodology it has no
     * relationship to as discontinued. The topic is no longer checked here: both
     * rows are read from the same topic, so they cannot disagree.
     */
    private validate(
        candidate: DiscontinueRow,
        publish: PublishRow,
        instanceTopicId: string,
    ): ValidDiscontinuation | null {
        const reject = (why: string): null => {
            this.logger.debug(
                `instanceTopicId=${instanceTopicId}: ignoring ${candidate.action} ` +
                `message ${candidate.consensusTimestamp} — ${why}`,
            );
            return null;
        };

        if (candidate.owner !== publish.owner) {
            return reject(`owner ${candidate.owner} does not match the publisher ${publish.owner}`);
        }
        if (tsToNanos(candidate.consensusTimestamp) <= tsToNanos(publish.consensusTimestamp)) {
            return reject(`predates its own publish message ${publish.consensusTimestamp}`);
        }

        const rawEffective = candidate.options?.['effectiveDate'];
        const isDeferred = candidate.action === 'deferred-discontinue-policy';
        let effectiveAt: Date;

        if (typeof rawEffective === 'string' && rawEffective) {
            effectiveAt = new Date(rawEffective);
            if (Number.isNaN(effectiveAt.getTime())) {
                return reject(`effectiveDate "${rawEffective}" is not a valid date`);
            }
        } else if (isDeferred) {
            // A deferred discontinuation IS its date — without one there is
            // nothing to act on, and assuming "now" would stop a policy early.
            return reject('deferred discontinuation carries no effectiveDate');
        } else {
            // An immediate discontinuation takes effect when it was sent.
            effectiveAt = tsToDate(candidate.consensusTimestamp);
        }

        if (effectiveAt.getTime() < tsToDate(publish.consensusTimestamp).getTime()) {
            return reject(`effective date ${effectiveAt.toISOString()} predates the publish message`);
        }

        return {
            consensusTimestamp: candidate.consensusTimestamp,
            action: candidate.action ?? 'discontinue-policy',
            effectiveAt,
        };
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<PolicyStatusJobData>, error: Error): void {
        this.logger.error(
            `Policy status job ${job.id} failed for ${job.data?.policyTopicId}: ${error.message}`,
            error.stack,
        );
    }
}

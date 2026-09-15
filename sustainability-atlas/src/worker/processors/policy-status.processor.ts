import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES, getWorkerOptions } from '@shared/config/bullmq.config';
import { DISCONTINUE_ACTIONS } from '@shared/utils/message-parser';

export interface PolicyStatusJobData {
    /** The published methodology version this job resolves (Instance-Policy options.instanceTopicId). */
    instanceTopicId: string;
    /** What produced this job — logged, and useful when reading the queue dashboard. */
    reason: 'publish' | 'discontinue' | 'sweep';
    /**
     * Set on the one delayed retry a job schedules for itself when the
     * business_view row does not exist yet (see process()). Prevents a job from
     * re-enqueuing itself forever.
     */
    retried?: boolean;
}

/**
 * Job name for the periodic sweep. A sweep carries no instanceTopicId: it fans
 * out one resolve job per known methodology (see SyncSchedulerService).
 */
export const POLICY_STATUS_SWEEP_JOB = 'sweep-policy-status';

/** How long to wait before the single self-retry — longer than one business-view build cycle. */
const MISSING_ROW_RETRY_DELAY_MS = 3 * 60 * 1000;

/** A discontinue message that passed every validation. */
interface ValidDiscontinuation {
    consensusTimestamp: string;
    action: string;
    effectiveAt: Date;
}

interface MessageRow {
    consensusTimestamp: string;
    topicId: string;
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
 * Resolves whether a published methodology has been discontinued, and when.
 *
 * Guardian records a discontinuation as a `Policy` message on the policy topic,
 * in one of two flavours: `discontinue-policy` (immediate) and
 * `deferred-discontinue-policy` (a future `effectiveDate`). Nothing is published
 * when a deferred date arrives — Guardian only updates its own database on an
 * hourly cron — so this processor stores the effective DATE and the read path
 * compares it against now(). A deferred discontinuation therefore takes effect
 * on its own date with no message, no cron and no re-ingest here.
 *
 * A methodology can accumulate SEVERAL discontinue messages: a deferred
 * discontinuation can be edited (to a new or identical date), or superseded by
 * an immediate one. Only the newest valid message may take effect, which is why
 * this resolves from the full candidate set on every run rather than reacting to
 * one message in isolation — that also makes it naturally idempotent and immune
 * to the order in which messages happen to be ingested.
 *
 * Reads the local `message` table rather than the mirror node: the policy topic
 * is already synced by TopicSyncProcessor, so re-fetching would spend the
 * rate-limited mirror-node budget twice for data already in Postgres.
 */
@Processor(QUEUE_NAMES.POLICY_STATUS, getWorkerOptions(QUEUE_NAMES.POLICY_STATUS))
export class PolicyStatusProcessor extends WorkerHost {
    private readonly logger = new Logger(PolicyStatusProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        @InjectQueue(QUEUE_NAMES.POLICY_STATUS) private readonly policyStatusQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<PolicyStatusJobData>): Promise<void> {
        if (job.name === POLICY_STATUS_SWEEP_JOB) {
            await this.sweep();
            return;
        }

        const { instanceTopicId, reason, retried = false } = job.data;
        if (!instanceTopicId) return;

        // 1. The publish message this instance topic belongs to. Every validation
        //    below is relative to it, so without it there is nothing to validate
        //    against — the discontinue simply arrived first (message-parse runs
        //    jobs concurrently). The publish trigger re-runs this when it lands.
        const [publish]: MessageRow[] = await this.dataSource.query(
            `SELECT "consensusTimestamp", "topicId", owner, action, options
               FROM message
              WHERE type = 'Instance-Policy'
                AND action = 'publish-policy'
                AND options->>'instanceTopicId' = $1
              ORDER BY "consensusTimestamp"::numeric DESC
              LIMIT 1`,
            [instanceTopicId],
        );

        if (!publish) {
            this.logger.debug(
                `instanceTopicId=${instanceTopicId}: no publish-policy message yet — skipping (reason=${reason})`,
            );
            return;
        }

        // 2. Every discontinue candidate for this version. Rare rows, served by
        //    the existing (type, action) index.
        const candidates: MessageRow[] = await this.dataSource.query(
            `SELECT "consensusTimestamp", "topicId", owner, action, options
               FROM message
              WHERE type = 'Policy'
                AND action = ANY($1::text[])
                AND options->>'instanceTopicId' = $2`,
            [[...DISCONTINUE_ACTIONS], instanceTopicId],
        );

        // 3. Validate each independently, logging why any is rejected.
        const valid: ValidDiscontinuation[] = [];
        for (const candidate of candidates) {
            const resolved = this.validate(candidate, publish, instanceTopicId);
            if (resolved) valid.push(resolved);
        }

        // 4. Newest wins. This is the edited-deferral rule: a later deferral (new
        //    or identical date) or a later immediate discontinuation supersedes
        //    whatever came before it.
        valid.sort((a, b) => (tsToNanos(a.consensusTimestamp) < tsToNanos(b.consensusTimestamp) ? 1 : -1));
        const winner = valid[0] ?? null;

        // 5. Write onto every METHODOLOGY row of this instance topic — republish
        //    churn means several business_view rows can share one relatedTopicId.
        //    Nulls are written explicitly so a previously-stored value is cleared
        //    if it ever stops being valid.
        const payload = winner
            ? {
                discontinuedAt: winner.effectiveAt.toISOString(),
                discontinuedAction: winner.action,
                discontinuedMessageTimestamp: winner.consensusTimestamp,
                discontinuedSupersededCount: valid.length - 1,
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

        if (updated.length > 0) {
            this.logger.log(
                `instanceTopicId=${instanceTopicId}: ${candidates.length} candidate(s), ${valid.length} valid, ` +
                (winner
                    ? `discontinued at ${payload.discontinuedAt} via ${winner.action} ` +
                      `(message ${winner.consensusTimestamp}, superseded ${valid.length - 1})`
                    : 'no valid discontinuation — cleared') +
                ` → ${updated.length} business_view row(s) updated`,
            );
            return;
        }

        // 6. Nothing updated. Either the state was already correct (the common
        //    case, e.g. a sweep), or the business_view row does not exist yet —
        //    the builder only runs every 2 minutes, so a freshly published
        //    methodology can be discontinued before its row is ever created.
        //    One delayed retry covers that; the sweep is the longer-term backstop.
        if (winner && !retried && !(await this.methodologyRowExists(instanceTopicId))) {
            await this.policyStatusQueue.add(
                'resolve',
                { instanceTopicId, reason, retried: true },
                {
                    jobId: `policy-status-${instanceTopicId}-retry-${Date.now()}`,
                    delay: MISSING_ROW_RETRY_DELAY_MS,
                    removeOnComplete: true,
                },
            );
            this.logger.debug(
                `instanceTopicId=${instanceTopicId}: no business_view row yet — retrying in ` +
                `${MISSING_ROW_RETRY_DELAY_MS / 1000}s`,
            );
        }
    }

    /**
     * Fans out one resolve job per known methodology.
     *
     * Driven from the DISTINCT relatedTopicId of METHODOLOGY rows (~hundreds,
     * not the ~20k raw rows republish churn produces), plus any instance topic
     * named by a discontinue message that has no business_view row yet — the
     * latter is how a discontinuation ingested before its own publish message
     * eventually resolves.
     *
     * The time bucket in the jobId keeps consecutive sweeps from colliding with
     * the retained-jobId dedup window, while still collapsing duplicates within
     * a single sweep.
     */
    private async sweep(): Promise<void> {
        const rows: Array<{ instance_topic_id: string }> = await this.dataSource.query(
            `SELECT DISTINCT "relatedTopicId" AS instance_topic_id
               FROM business_view
              WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" IS NOT NULL
              UNION
             SELECT DISTINCT options->>'instanceTopicId' AS instance_topic_id
               FROM message
              WHERE type = 'Policy'
                AND action = ANY($1::text[])
                AND options->>'instanceTopicId' IS NOT NULL`,
            [[...DISCONTINUE_ACTIONS]],
        );

        const bucket = Math.floor(Date.now() / 60_000);
        await this.policyStatusQueue.addBulk(
            rows.map(row => ({
                name: 'resolve',
                data: { instanceTopicId: row.instance_topic_id, reason: 'sweep' as const },
                opts: {
                    jobId: `policy-status-${row.instance_topic_id}-sweep-${bucket}`,
                    removeOnComplete: true,
                },
            })),
        );

        this.logger.log(`Policy status sweep: ${rows.length} methodology job(s) enqueued`);
    }

    /**
     * Applies every validation a discontinue message must pass, returning its
     * resolved effective date, or null (with a warning) if it is rejected.
     *
     * The topic and owner checks matter because a `Policy` message naming
     * someone else's instanceTopicId would otherwise be able to mark a
     * methodology it has no relationship to as discontinued.
     */
    private validate(
        candidate: MessageRow,
        publish: MessageRow,
        instanceTopicId: string,
    ): ValidDiscontinuation | null {
        const reject = (why: string): null => {
            this.logger.warn(
                `instanceTopicId=${instanceTopicId}: ignoring ${candidate.action} ` +
                `message ${candidate.consensusTimestamp} — ${why}`,
            );
            return null;
        };

        if (candidate.topicId !== publish.topicId) {
            return reject(`posted to topic ${candidate.topicId}, not the policy topic ${publish.topicId}`);
        }
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

    private async methodologyRowExists(instanceTopicId: string): Promise<boolean> {
        const rows: Array<{ ok: number }> = await this.dataSource.query(
            `SELECT 1 AS ok FROM business_view
              WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" = $1
              LIMIT 1`,
            [instanceTopicId],
        );
        return rows.length > 0;
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<PolicyStatusJobData>, error: Error): void {
        this.logger.error(
            `Policy status job ${job.id} failed for ${job.data?.instanceTopicId}: ${error.message}`,
            error.stack,
        );
    }
}

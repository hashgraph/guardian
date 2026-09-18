import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import JSZip from 'jszip';
import { QUEUE_NAMES, envInt, getWorkerOptions } from '@shared/config/bullmq.config';
import { canEnqueueBulk } from '@shared/redis/redis-headroom';
import { IpfsService } from '../services/ipfs.service';
import { PolicyMappingPipelineService } from '../mapping/policy-pipeline.service';
import { POLICY_ZIP_STORAGE, PolicyZipStorage } from '../services/storage/policy-zip-storage.interface';
import { getBlockedTopics, isTopicBlocked } from '@shared/config/topic-blocklist';

export interface PolicyDecodeJobData {
    cid: string;
    messageTimestamp: string;
    policyTopicId: string;
    instanceTopicId?: string | null;
}

const MAX_ATTEMPTS = 5;

// Lock/stall values (JSZip + schema parse blocks the event loop well past
// BullMQ's 30 s default lock) now come from getWorkerOptions, which reads the
// same POLICY_DECODE_LOCK_DURATION/STALLED_INTERVAL env vars and adds the
// concurrency this decorator was never passing.
@Processor(QUEUE_NAMES.POLICY_DECODE, getWorkerOptions(QUEUE_NAMES.POLICY_DECODE))
export class PolicyDecodeProcessor extends WorkerHost {
    private readonly logger = new Logger(PolicyDecodeProcessor.name);

    constructor(
        private readonly ipfsService: IpfsService,
        private readonly dataSource: DataSource,
        private readonly policyMappingPipeline: PolicyMappingPipelineService,
        @Inject(POLICY_ZIP_STORAGE) private readonly zipStorage: PolicyZipStorage,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
        @Inject('REDICT_PUB') private readonly redis: Redis,
    ) {
        super();
    }

    async process(job: Job<PolicyDecodeJobData>): Promise<void> {
        const { cid, policyTopicId, instanceTopicId } = job.data;

        if (!cid || !policyTopicId) {
            const message =
                `PolicyDecodeProcessor received invalid job data (jobId=${job.id}): ` +
                `cid=${cid ? 'present' : 'MISSING'}, policyTopicId=${policyTopicId ? 'present' : 'MISSING'}. ` +
                `Refusing to proceed — this would otherwise hit the "policyTopicId" NOT NULL constraint on policy.`;
            this.logger.error(message);
            throw new Error(message);
        }

        try {
            await this.runDecode(cid, policyTopicId, instanceTopicId ?? null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.markFailed(cid, message);
            throw error;
        }
    }

    private async runDecode(cid: string, policyTopicId: string, instanceTopicId: string | null): Promise<void> {
        // Dedup / retry guard keyed by sourceCid.
        const guard = await this.checkAndReservePending(cid, policyTopicId);
        if (guard === 'skip') return;

        // Step 1: fetch zip via storage (or download + persist on miss).
        const zipBuffer = await this.loadZip(cid);
        const zip = await JSZip.loadAsync(zipBuffer);

        // Step 2: parse zip into raw structures.
        const rawPolicyJson = await this.readJsonFile(zip, 'policy.json') ?? {};
        const rawSchemaJson = await this.readSchemasFolder(zip);
        const rawTokensJson = await this.readTokensFolder(zip);
        const rawTagsJson   = await this.readTagsFolder(zip);

        // Per-version ObjectId-style identifier that matches
        // `VC.credentialSubject[0].policyId`. Newer policy.json carries it as
        // top-level `id`; older versions only have `policyTag`.
        const policyId = String(rawPolicyJson['id'] ?? rawPolicyJson['policyTag'] ?? rawPolicyJson['_id'] ?? '');
        const version = String(rawPolicyJson['version'] ?? '');
        if (!policyId) {
            throw new Error(`policy.json missing id/policyTag for cid=${cid}`);
        }

        // Step 3: run the policy mapping pipeline.
        const { policyMapping, schemaFields } = await this.policyMappingPipeline.execute({
            rawPolicyJson,
            rawSchemas: rawSchemaJson,
        });

        // Step 4: upsert the decoded policy row.
        await this.dataSource.query(
            `UPDATE policy
             SET "policyId" = $2,
                 version = $3,
                 "instanceTopicId" = $4,
                 "rawPolicyJson" = $5::jsonb,
                 "rawSchemaJson" = $6::jsonb,
                 "rawTokensJson" = $7::jsonb,
                 "rawTagsJson"   = $8::jsonb,
                 "policyMapping" = $9::jsonb,
                 "schemaFields"  = $10::jsonb,
                 "decodeStatus"  = 'decoded',
                 "mappingSource" = 'auto',
                 error           = NULL,
                 "updatedAt"     = now()
             WHERE "sourceCid" = $1`,
            [
                cid,
                policyId,
                version,
                instanceTopicId,
                JSON.stringify(rawPolicyJson),
                JSON.stringify(rawSchemaJson),
                JSON.stringify(rawTokensJson),
                JSON.stringify(rawTagsJson),
                JSON.stringify(policyMapping),
                JSON.stringify(schemaFields),
            ],
        );

        // Step 4b: drop other rows that represent the same logical version of
        // this policy (same policyTopicId + version) under a different sourceCid.
        // Republishes can land with a fresh CID + Mongo _id but identical
        // version label — without this cleanup, failed/stale rows shadow the
        // successful decode in the listing and detail views.
        await this.dataSource.query(
            `DELETE FROM policy
             WHERE "policyTopicId" = $1
               AND COALESCE(version, '') = COALESCE($2, '')
               AND "sourceCid" <> $3`,
            [policyTopicId, version, cid],
        );

        // Step 5: backfill deferred VC IPFS fetches under this policy's subtree.
        await this.backfillDeferredVcFetches(policyTopicId);

        this.logger.log(
            `Decoded policy cid=${cid} policyId=${policyId} version=${version}`,
        );
    }

    // -----------------------------------------------------------------------
    // Dedup + retry guard
    // -----------------------------------------------------------------------

    private async checkAndReservePending(
        cid: string,
        policyTopicId: string,
    ): Promise<'skip' | 'proceed'> {
        const ipfsTimeoutMs = Number(process.env.IPFS_FETCH_TIMEOUT ?? '180000');
        const staleMs = ipfsTimeoutMs * 10;

        // The lease IS the update: the ON CONFLICT branch only fires when this
        // caller is allowed to run, so a returned row means we hold it and zero
        // rows means someone else does (or the policy is finished).
        //
        // The previous version computed a `reserved` flag in RETURNING, which
        // reads the row AFTER the update has already set lastAttemptAt = now().
        // That made the freshness test trivially true (and `AND` bound tighter
        // than `OR`), so every concurrent caller was told it held the lease and
        // two workers could decode the same zip at once.
        //
        // 'pending' stays the in-flight marker rather than a new 'decoding'
        // status because the public API maps this column onto its own
        // success/pending/failed vocabulary.
        const rows: Array<{ decodeStatus: string; attempts: number }> =
            await this.dataSource.query(
                `INSERT INTO policy
                     ("sourceCid", "policyTopicId", "policyId", version, "decodeStatus", attempts, "lastAttemptAt")
                 VALUES ($1, $2, NULL, NULL, 'pending', 1, now())
                 ON CONFLICT ("sourceCid") DO UPDATE SET
                     "decodeStatus"  = 'pending',
                     attempts        = policy.attempts + 1,
                     "lastAttemptAt" = now(),
                     "updatedAt"     = now()
                 WHERE
                     -- never redo work that already succeeded
                     policy."decodeStatus" <> 'decoded'
                     -- stop retrying a policy that has exhausted its attempts
                     AND NOT (policy."decodeStatus" = 'failed' AND policy.attempts >= $4)
                     -- another worker holds a lease that has not gone stale yet
                     AND NOT (policy."decodeStatus" = 'pending'
                              AND policy."lastAttemptAt" > now() - ($3 || ' milliseconds')::interval)
                 RETURNING "decodeStatus", attempts`,
                [cid, policyTopicId, staleMs, MAX_ATTEMPTS],
            );

        if (rows[0]) return 'proceed';

        // Lease refused — read the row back only to explain why in the log.
        const [state]: Array<{ decodeStatus: string; attempts: number }> =
            await this.dataSource.query(
                `SELECT "decodeStatus", attempts FROM policy WHERE "sourceCid" = $1 LIMIT 1`,
                [cid],
            );

        if (!state) {
            this.logger.warn(`policy upsert returned no row for cid=${cid}`);
        } else if (state.decodeStatus === 'decoded') {
            this.logger.debug(`policy cid=${cid} already decoded — skipping`);
        } else if (state.decodeStatus === 'failed') {
            this.logger.warn(
                `policy cid=${cid} permanently failed (attempts=${state.attempts}) — skipping`,
            );
        } else {
            this.logger.debug(`policy cid=${cid} already pending in another worker — skipping`);
        }
        return 'skip';
    }

    private async markFailed(cid: string, message: string): Promise<void> {
        await this.dataSource.query(
            `UPDATE policy
             SET "decodeStatus" = 'failed',
                 error          = $2,
                 "updatedAt"    = now()
             WHERE "sourceCid" = $1`,
            [cid, message],
        );
    }

    // -----------------------------------------------------------------------
    // Zip loading + parsing
    // -----------------------------------------------------------------------

    private async loadZip(cid: string): Promise<Buffer> {
        // IpfsService.fetchContent handles both the cache lookup and the
        // post-fetch cache write internally (normalizing to v1 base32), so
        // this method is just a thin pass-through. Keeping it for symmetry
        // with the rest of the processor and to centralize future zip-only
        // concerns (e.g. content validation).
        return this.ipfsService.fetchContent(cid);
    }

    private async readJsonFile(zip: JSZip, path: string): Promise<Record<string, unknown> | null> {
        const f = zip.file(path);
        if (!f) return null;
        try {
            const raw = await f.async('string');
            return JSON.parse(raw) as Record<string, unknown>;
        } catch (err) {
            this.logger.warn(`Could not parse ${path}: ${err instanceof Error ? err.message : err}`);
            return null;
        }
    }

    /**
     * Reads every `schemas/*.json` (and equivalents) into a `{ iri: schemaDoc }`
     * map. Falls back to filename when the document carries no `iri`.
     */
    private async readSchemasFolder(zip: JSZip): Promise<Record<string, Record<string, unknown>>> {
        const out: Record<string, Record<string, unknown>> = {};
        const files = zip.file(/^schemas\/.*\.json$/i);
        for (const f of files) {
            try {
                const raw = await f.async('string');
                const doc = JSON.parse(raw) as Record<string, unknown>;
                const iri = String(doc['iri'] ?? doc['$id'] ?? f.name.replace(/^schemas\//, '').replace(/\.json$/, ''));
                out[iri] = doc;
            } catch (err) {
                this.logger.warn(`Failed to parse ${f.name}: ${err instanceof Error ? err.message : err}`);
            }
        }
        return out;
    }

    /**
     * Reads every `tags/*.json` into a `{ key: tagDoc }` map. Falls back to
     * filename when the document carries no `uuid`/`id`.
     */
    private async readTagsFolder(zip: JSZip): Promise<Record<string, Record<string, unknown>>> {
        const out: Record<string, Record<string, unknown>> = {};
        const files = zip.file(/^tags\/.*\.json$/i);
        for (const f of files) {
            try {
                const raw = await f.async('string');
                const doc = JSON.parse(raw) as Record<string, unknown>;
                const key = String(doc['uuid'] ?? doc['id'] ?? f.name.replace(/^tags\//, '').replace(/\.json$/, ''));
                out[key] = doc;
            } catch (err) {
                this.logger.warn(`Failed to parse ${f.name}: ${err instanceof Error ? err.message : err}`);
            }
        }
        return out;
    }

    private async readTokensFolder(zip: JSZip): Promise<Record<string, Record<string, unknown>>> {
        const out: Record<string, Record<string, unknown>> = {};
        const files = zip.file(/^tokens\/.*\.json$/i);
        for (const f of files) {
            try {
                const raw = await f.async('string');
                const doc = JSON.parse(raw) as Record<string, unknown>;
                const tokenId = String(doc['tokenId'] ?? f.name.replace(/^tokens\//, '').replace(/\.json$/, ''));
                out[tokenId] = doc;
            } catch (err) {
                this.logger.warn(`Failed to parse ${f.name}: ${err instanceof Error ? err.message : err}`);
            }
        }
        return out;
    }

    // -----------------------------------------------------------------------
    // Deferred VC fetch backfill (unchanged from previous implementation).
    // -----------------------------------------------------------------------

    private async backfillDeferredVcFetches(policyTopicId: string): Promise<void> {
        if (isTopicBlocked(policyTopicId)) {
            this.logger.debug(`Policy topic ${policyTopicId} is blocklisted — skipping VC backfill`);
            return;
        }

        // Skip the entire subtree walk for the root if it's blocked; otherwise
        // exclude any blocklisted descendants from the recursion. The blocklist
        // is small (typically <10 entries) so passing it as an array literal is
        // fine.
        const blocked = getBlockedTopics();
        const rows: Array<{ consensusTimestamp: string; cid: string }> =
            await this.dataSource.query(
                `WITH RECURSIVE descendants AS (
                     SELECT $1::text AS "topicId"
                     UNION ALL
                     SELECT t."topicId"
                     FROM message t
                     JOIN descendants d ON (t.options->>'parentId') = d."topicId"
                     WHERE t.type = 'Topic'
                       AND NOT (t."topicId" = ANY($2::text[]))
                 )
                 SELECT m."consensusTimestamp", unnest(m.files) AS cid
                 FROM message m
                 JOIN descendants d ON d."topicId" = m."topicId"
                 WHERE m.type = 'VC-Document'
                   AND m.documents IS NULL
                   AND m.files IS NOT NULL
                   AND NOT (m."topicId" = ANY($2::text[]))
                 LIMIT $3`,
                [policyTopicId, blocked, envInt('BACKFILL_BATCH', 2000)],
            );
        if (rows.length === 0) return;

        // A single decode can fan out to every un-fetched VC in an entire topic
        // subtree, all of it landing in the narrowest lane in the system. Now
        // bounded by BACKFILL_BATCH, and skipped altogether when Redict is short
        // on memory or that lane is already deep — the boot backfill re-runs this
        // same query later, so deferring loses nothing.
        if (!await canEnqueueBulk(this.redis, this.ipfsQueue, 'deferred VC backfill')) return;

        const enqueued = rows.length;
        await this.ipfsQueue.addBulk(rows.map(row => ({
            name: 'fetch',
            data: { cid: row.cid, messageTimestamp: row.consensusTimestamp },
            opts: { jobId: `ipfs-${row.cid}` },
        })));

        if (enqueued > 0) {
            this.logger.log(
                `Backfilled ${enqueued} deferred VC IPFS fetch(es) for topic=${policyTopicId}`,
            );
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<PolicyDecodeJobData>, error: Error): void {
        this.logger.error(
            `Policy decode job ${job.id} failed for cid ${job.data.cid}: ${error.message}`,
            error.stack,
        );
    }
}

import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import JSZip from 'jszip';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
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

@Processor(QUEUE_NAMES.POLICY_DECODE)
export class PolicyDecodeProcessor extends WorkerHost {
    private readonly logger = new Logger(PolicyDecodeProcessor.name);

    constructor(
        private readonly ipfsService: IpfsService,
        private readonly dataSource: DataSource,
        private readonly policyMappingPipeline: PolicyMappingPipelineService,
        @Inject(POLICY_ZIP_STORAGE) private readonly zipStorage: PolicyZipStorage,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<PolicyDecodeJobData>): Promise<void> {
        const { cid, policyTopicId, instanceTopicId } = job.data;

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

        // Atomic UPSERT: returns the row's state after the operation. The CASE
        // expression decides whether to reset to 'pending' or leave it.
        const rows: Array<{ decodeStatus: string; attempts: number; lastAttemptAt: Date | null; reserved: boolean }> =
            await this.dataSource.query(
                `INSERT INTO policy
                     ("sourceCid", "policyTopicId", "policyId", version, "decodeStatus", attempts, "lastAttemptAt")
                 VALUES ($1, $2, NULL, NULL, 'pending', 1, now())
                 ON CONFLICT ("sourceCid") DO UPDATE SET
                     "decodeStatus" = CASE
                         WHEN policy."decodeStatus" = 'decoded'                            THEN 'decoded'
                         WHEN policy."decodeStatus" = 'pending'
                              AND policy."lastAttemptAt" > now() - ($3 || ' milliseconds')::interval
                              THEN 'pending'
                         WHEN policy."decodeStatus" = 'failed' AND policy.attempts >= $4   THEN 'failed'
                         ELSE 'pending'
                     END,
                     attempts = CASE
                         WHEN policy."decodeStatus" = 'decoded'                            THEN policy.attempts
                         WHEN policy."decodeStatus" = 'pending'
                              AND policy."lastAttemptAt" > now() - ($3 || ' milliseconds')::interval
                              THEN policy.attempts
                         WHEN policy."decodeStatus" = 'failed' AND policy.attempts >= $4   THEN policy.attempts
                         ELSE policy.attempts + 1
                     END,
                     "lastAttemptAt" = now(),
                     "updatedAt"     = now()
                 RETURNING
                     "decodeStatus",
                     attempts,
                     "lastAttemptAt",
                     -- reserved = true means THIS call won the lease to run.
                     (xmax = 0 OR "decodeStatus" = 'pending'
                        AND "lastAttemptAt" >= now() - INTERVAL '1 second') AS reserved`,
                [cid, policyTopicId, staleMs, MAX_ATTEMPTS],
            );

        const row = rows[0];
        if (!row) {
            this.logger.warn(`policy upsert returned no row for cid=${cid}`);
            return 'skip';
        }

        if (row.decodeStatus === 'decoded') {
            this.logger.debug(`policy cid=${cid} already decoded — skipping`);
            return 'skip';
        }
        if (row.decodeStatus === 'failed' && row.attempts >= MAX_ATTEMPTS) {
            this.logger.warn(`policy cid=${cid} permanently failed (attempts=${row.attempts}) — skipping`);
            return 'skip';
        }
        if (!row.reserved) {
            this.logger.debug(`policy cid=${cid} already pending in another worker — skipping`);
            return 'skip';
        }
        return 'proceed';
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
        if (await this.zipStorage.exists(cid)) {
            this.logger.debug(`zip cache hit for cid=${cid}`);
            return this.zipStorage.read(cid);
        }
        const buffer = await this.ipfsService.fetchContent(cid);
        await this.zipStorage.write(cid, buffer);
        return buffer;
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
                   AND NOT (m."topicId" = ANY($2::text[]))`,
                [policyTopicId, blocked],
            );

        let enqueued = 0;
        for (const row of rows) {
            await this.ipfsQueue.add(
                'fetch',
                { cid: row.cid, messageTimestamp: row.consensusTimestamp },
                { jobId: `ipfs-${row.cid}` },
            );
            enqueued++;
        }

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

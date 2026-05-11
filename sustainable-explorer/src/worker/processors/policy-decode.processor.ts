import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import JSZip from 'jszip';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { IpfsService } from '../services/ipfs.service';
import { PolicySchemaImportService } from '../services/policy-schema-import.service';
import { MappingPipelineService } from '../mapping/mapping-pipeline.service';
import { FieldDescriptor, FieldMap, SchemaInfo } from '../mapping/types';
import { PROJECT_EXTRACT_FIELDS } from '../project-mapper/project-fields';
import { derivePerPolicyProjectMeta } from '../mapping/derive-project-meta';

export interface PolicyDecodeJobData {
    cid: string;
    messageTimestamp: string;
    policyTopicId: string;
}

interface CategoryExportEntry {
    name?: unknown;
    type?: unknown;
}

@Processor(QUEUE_NAMES.POLICY_DECODE)
export class PolicyDecodeProcessor extends WorkerHost {
    private readonly logger = new Logger(PolicyDecodeProcessor.name);

    constructor(
        private readonly ipfsService: IpfsService,
        private readonly dataSource: DataSource,
        private readonly policySchemaImportService: PolicySchemaImportService,
        private readonly mappingPipeline: MappingPipelineService,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<PolicyDecodeJobData>): Promise<void> {
        const { cid, messageTimestamp, policyTopicId } = job.data;

        // Mark this attempt in policy_decode_status before doing any work.
        // If the process exits mid-flight the status stays 'pending', which is safe
        // (the scheduler will re-enqueue on next boot). The pending upsert also
        // clears the derived columns so stale data is not read while re-decoding.
        await this.upsertDecodeStatus(policyTopicId, cid, 'pending');

        try {
            await this.runDecode(cid, messageTimestamp, policyTopicId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.upsertDecodeStatus(policyTopicId, cid, 'failed', message);
            // Re-throw so BullMQ can retry with its configured backoff.
            throw error;
        }
    }

    private async runDecode(
        cid: string,
        messageTimestamp: string,
        policyTopicId: string,
    ): Promise<void> {
        const existing = await this.dataSource.query(
            `SELECT id
             FROM policy_schema
             WHERE "policyTopicId" = $1 AND "sourceCid" = $2
             LIMIT 1`,
            [policyTopicId, cid],
        );
        const schemasAlreadyImported = existing.length > 0;

        // Check whether all derived columns are already populated on the existing
        // policy_decode_status row — if so we can skip re-deriving everything.
        const statusRows: Array<{
            sectoralScopes: unknown;
            schemaLabelMap: unknown;
            fieldMap: unknown;
        }> = await this.dataSource.query(
            `SELECT "sectoralScopes", "schemaLabelMap", "fieldMap"
             FROM policy_decode_status
             WHERE "policyTopicId" = $1`,
            [policyTopicId],
        );
        const existingStatus = statusRows[0];
        const derivedColumnsPopulated = !!(
            existingStatus?.sectoralScopes !== null &&
            existingStatus?.sectoralScopes !== undefined &&
            existingStatus?.schemaLabelMap !== null &&
            existingStatus?.schemaLabelMap !== undefined
        );

        if (schemasAlreadyImported && derivedColumnsPopulated) {
            this.logger.debug(
                `Nothing to do for topic=${policyTopicId}, cid=${cid} — schemas and derived columns already stored`,
            );
            await this.markSuccess(policyTopicId);
            return;
        }

        // New CID means schema content may have changed — invalidate any cached
        // classification on policy_schema rows so the mapper re-evaluates on next run.
        if (!schemasAlreadyImported) {
            await this.dataSource.query(
                `UPDATE policy_schema
                 SET "isProjectSchema" = NULL, "projectSchemaConfig" = NULL
                 WHERE "policyTopicId" = $1`,
                [policyTopicId],
            );
        }

        const zipBuffer = await this.ipfsService.fetchContent(cid);
        const zip = await JSZip.loadAsync(zipBuffer);

        // --- Step 1: Extract categories (pure, no DB writes) ---
        const { categoriesExport, sectoralScopes, emissionReductionApproach } =
            await this.extractCategoriesFromZip(zip, policyTopicId);

        // --- Step 2: Import schemas if needed ---
        if (!schemasAlreadyImported) {
            await this.policySchemaImportService.importSchemasFromZip(zip, {
                cid,
                messageTimestamp,
                policyTopicId,
            });
        }

        // --- Step 3: Mapping pipeline (cross-schema fuzzy by default) ---
        const { schemaLabelMap, fieldMap, schemas } = await this.executeMappingPipeline(policyTopicId);

        // --- Step 4: Derive project schema from fuzzy field map ---
        const projectMeta = derivePerPolicyProjectMeta(fieldMap as FieldMap, schemas);

        let projectFieldMap: Record<string, string | null> | null = null;
        let projectGeoKey: string | null = null;
        let projectGeoSection: string | null = null;
        let projectSchemaId: string | null = null;

        if (projectMeta) {
            projectSchemaId = projectMeta.projectSchemaId;
            projectGeoKey = projectMeta.projectGeoKey;
            projectGeoSection = projectMeta.projectGeoSection;
            projectFieldMap = projectMeta.projectFieldMap;

            // Persist isProjectSchema flag on policy_schema rows so the mapper can
            // still use the fast path (isProjectSchema = TRUE) for sibling lookups.
            await this.dataSource.query(
                `UPDATE policy_schema
                 SET "isProjectSchema" = TRUE
                 WHERE "schemaId" = $1`,
                [projectMeta.projectSchemaId],
            );
            await this.dataSource.query(
                `UPDATE policy_schema
                 SET "isProjectSchema" = FALSE
                 WHERE "policyTopicId" = $1
                   AND "schemaId" != $2
                   AND ("isProjectSchema" IS NULL OR "isProjectSchema" = TRUE)`,
                [policyTopicId, projectMeta.projectSchemaId],
            );
        } else {
            // No confirmed project schema — mark all schemas for this topic as FALSE
            await this.dataSource.query(
                `UPDATE policy_schema
                 SET "isProjectSchema" = FALSE, "projectSchemaConfig" = NULL
                 WHERE "policyTopicId" = $1`,
                [policyTopicId],
            );
        }

        // --- Step 5: Write all derived columns atomically with status=success ---
        await this.upsertDecodeStatusSuccess(policyTopicId, {
            categoriesExport: categoriesExport ?? null,
            sectoralScopes: sectoralScopes.length > 0 ? sectoralScopes : null,
            emissionReductionApproach: emissionReductionApproach ?? null,
            schemaLabelMap: Object.keys(schemaLabelMap).length > 0 ? schemaLabelMap : null,
            fieldMap: Object.keys(fieldMap).length > 0 ? fieldMap : null,
            projectFieldMap,
            projectGeoKey,
            projectGeoSection,
            projectSchemaId,
        });

        // Enqueue IPFS fetches for VC-Documents under this policy's topic subtree that
        // arrived before the policy was decoded and were therefore deferred.
        await this.backfillDeferredVcFetches(policyTopicId);
    }

    /**
     * Upserts the 'pending' row — increments attempts and clears all derived columns
     * so stale data is never read while a re-decode is in flight.
     */
    private async upsertDecodeStatus(
        policyTopicId: string,
        sourceCid: string,
        status: 'pending' | 'failed',
        error?: string,
    ): Promise<void> {
        if (status === 'pending') {
            await this.dataSource.query(
                `INSERT INTO policy_decode_status
                     ("policyTopicId", "sourceCid", status, attempts, "lastAttemptAt", "updatedAt",
                      "categoriesExport", "sectoralScopes", "emissionReductionApproach",
                      "schemaLabelMap", "fieldMap", "projectFieldMap",
                      "projectGeoKey", "projectGeoSection", "projectSchemaId")
                 VALUES ($1, $2, 'pending', 1, now(), now(),
                         NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
                 ON CONFLICT ("policyTopicId") DO UPDATE SET
                     "sourceCid"               = EXCLUDED."sourceCid",
                     status                    = 'pending',
                     attempts                  = policy_decode_status.attempts + 1,
                     "lastAttemptAt"           = now(),
                     "updatedAt"               = now(),
                     "categoriesExport"        = NULL,
                     "sectoralScopes"          = NULL,
                     "emissionReductionApproach" = NULL,
                     "schemaLabelMap"          = NULL,
                     "fieldMap"                = NULL,
                     "projectFieldMap"         = NULL,
                     "projectGeoKey"           = NULL,
                     "projectGeoSection"       = NULL,
                     "projectSchemaId"         = NULL`,
                [policyTopicId, sourceCid],
            );
        } else {
            await this.dataSource.query(
                `UPDATE policy_decode_status
                 SET status      = $1,
                     error       = $2,
                     "updatedAt" = now()
                 WHERE "policyTopicId" = $3`,
                [status, error ?? null, policyTopicId],
            );
        }
    }

    /** Flips an existing pending row to success without touching derived columns. */
    private async markSuccess(policyTopicId: string): Promise<void> {
        await this.dataSource.query(
            `UPDATE policy_decode_status
             SET status = 'success', error = NULL, "updatedAt" = now()
             WHERE "policyTopicId" = $1`,
            [policyTopicId],
        );
    }

    /**
     * Writes status=success plus all derived columns atomically.
     */
    private async upsertDecodeStatusSuccess(
        policyTopicId: string,
        derived: {
            categoriesExport: unknown[] | null;
            sectoralScopes: string[] | null;
            emissionReductionApproach: string | null;
            schemaLabelMap: Record<string, unknown> | null;
            fieldMap: Record<string, unknown> | null;
            projectFieldMap: Record<string, string | null> | null;
            projectGeoKey: string | null;
            projectGeoSection: string | null;
            projectSchemaId: string | null;
        },
    ): Promise<void> {
        await this.dataSource.query(
            `UPDATE policy_decode_status
             SET status                      = 'success',
                 error                       = NULL,
                 "updatedAt"                 = now(),
                 "categoriesExport"          = $2::jsonb,
                 "sectoralScopes"            = $3::jsonb,
                 "emissionReductionApproach" = $4,
                 "schemaLabelMap"            = $5::jsonb,
                 "fieldMap"                  = $6::jsonb,
                 "projectFieldMap"           = $7::jsonb,
                 "projectGeoKey"             = $8,
                 "projectGeoSection"         = $9,
                 "projectSchemaId"           = $10
             WHERE "policyTopicId" = $1`,
            [
                policyTopicId,
                derived.categoriesExport != null ? JSON.stringify(derived.categoriesExport) : null,
                derived.sectoralScopes != null ? JSON.stringify(derived.sectoralScopes) : null,
                derived.emissionReductionApproach,
                derived.schemaLabelMap != null ? JSON.stringify(derived.schemaLabelMap) : null,
                derived.fieldMap != null ? JSON.stringify(derived.fieldMap) : null,
                derived.projectFieldMap != null ? JSON.stringify(derived.projectFieldMap) : null,
                derived.projectGeoKey,
                derived.projectGeoSection,
                derived.projectSchemaId,
            ],
        );
    }

    /**
     * Enqueues IPFS fetches for VC-Documents under the given policy's topic subtree
     * that have documents = NULL (fetch was skipped while policy was not yet decoded).
     */
    private async backfillDeferredVcFetches(policyTopicId: string): Promise<void> {
        const rows: Array<{ consensusTimestamp: string; cid: string }> =
            await this.dataSource.query(
                `WITH RECURSIVE descendants AS (
                     SELECT $1::text AS "topicId"
                     UNION ALL
                     SELECT t."topicId"
                     FROM message t
                     JOIN descendants d ON (t.options->>'parentId') = d."topicId"
                     WHERE t.type = 'Topic'
                 )
                 SELECT m."consensusTimestamp", unnest(m.files) AS cid
                 FROM message m
                 JOIN descendants d ON d."topicId" = m."topicId"
                 WHERE m.type = 'VC-Document'
                   AND m.documents IS NULL
                   AND m.files IS NOT NULL`,
                [policyTopicId],
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

    /**
     * Extracts category/sectoral-scope/emission-reduction data from policy.json.
     * Pure: returns data without touching the DB.
     */
    private async extractCategoriesFromZip(
        zip: JSZip,
        policyTopicId: string,
    ): Promise<{
        categoriesExport: CategoryExportEntry[] | null;
        sectoralScopes: string[];
        emissionReductionApproach: string | null;
    }> {
        const policyFile = zip.file('policy.json');
        if (!policyFile) {
            return { categoriesExport: null, sectoralScopes: [], emissionReductionApproach: null };
        }

        let policy: Record<string, unknown>;
        try {
            const raw = await policyFile.async('string');
            policy = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            this.logger.warn(`Could not parse policy.json for topic=${policyTopicId}`);
            return { categoriesExport: null, sectoralScopes: [], emissionReductionApproach: null };
        }

        const entries = policy['categoriesExport'];
        if (!Array.isArray(entries) || entries.length === 0) {
            return { categoriesExport: null, sectoralScopes: [], emissionReductionApproach: null };
        }

        const categories = entries as CategoryExportEntry[];

        const sectoralScopes = categories
            .filter(e => typeof e.type === 'string' && e.type === 'SECTORAL_SCOPE' && typeof e.name === 'string')
            .map(e => e.name as string);

        const mitigationTypes = categories
            .filter(e => typeof e.type === 'string' && e.type === 'MITIGATION_ACTIVITY_TYPE' && typeof e.name === 'string')
            .map(e => (e.name as string).toLowerCase());

        const isAvoidance = mitigationTypes.some(t => t.includes('avoidance') || t.includes('efficiency'));
        const isRemoval = mitigationTypes.some(t =>
            t.includes('sequestration') || t.includes('removal') ||
            t.includes('reforestation') || t.includes('afforestation') || t.includes('restoration'),
        );
        const emissionReductionApproach =
            isAvoidance && isRemoval ? 'Avoidance & Removal' :
            isAvoidance ? 'Avoidance' :
            isRemoval ? 'Removal' :
            null;

        this.logger.debug(
            `Categories extracted for topic=${policyTopicId}: scopes=${sectoralScopes.join(', ')}, approach=${emissionReductionApproach}`,
        );

        return { categoriesExport: categories, sectoralScopes, emissionReductionApproach };
    }

    /**
     * Runs the mapping pipeline against schemas stored in the DB for this policy.
     * Returns schemaLabelMap, fieldMap, and the hydrated schemas for downstream use.
     */
    private async executeMappingPipeline(
        policyTopicId: string,
    ): Promise<{ schemaLabelMap: Record<string, unknown>; fieldMap: Record<string, unknown>; schemas: SchemaInfo[] }> {
        this.logger.debug(`Starting mapping pipeline for topic=${policyTopicId}`);

        const rows = (await this.dataSource.query(
            `SELECT
                "schemaId" as id,
                name,
                description,
                document,
                "rawSchema"
             FROM policy_schema
             WHERE "policyTopicId" = $1
             ORDER BY "createdAt" ASC`,
            [policyTopicId],
        )) as Array<{
            id: string;
            name: string | null;
            description: string | null;
            document: Record<string, unknown> | string | null;
            rawSchema: Record<string, unknown> | string;
        }>;

        if (rows.length === 0) {
            this.logger.warn(`No schemas found for topic=${policyTopicId}, skipping mapping`);
            return { schemaLabelMap: {}, fieldMap: {}, schemas: [] };
        }

        const ensureObject = (val: Record<string, unknown> | string | null | undefined) => {
            if (val == null) return undefined;
            if (typeof val === 'string') return JSON.parse(val);
            return val;
        };

        const schemas: SchemaInfo[] = rows.map(row => ({
            id: row.id,
            name: row.name || undefined,
            description: row.description || undefined,
            document: ensureObject(row.document),
            rawSchema: ensureObject(row.rawSchema)!,
        }));

        const { schemaMap, fieldMap } = await this.mappingPipeline.executePipeline(
            schemas,
            this.fieldDescriptorsFromProjectFields(),
        );

        this.logger.log(
            `Mapping pipeline completed for topic=${policyTopicId}: ` +
            `${Object.keys(schemaMap).length} schema(s) mapped, ` +
            `${Object.keys(fieldMap).length} field(s) mapped`,
        );

        return {
            schemaLabelMap: schemaMap as Record<string, unknown>,
            fieldMap: fieldMap as Record<string, unknown>,
            schemas,
        };
    }

    /**
     * Translates PROJECT_EXTRACT_FIELDS into the FieldDescriptor shape consumed
     * by the mapping pipeline.
     */
    private fieldDescriptorsFromProjectFields(): FieldDescriptor[] {
        return PROJECT_EXTRACT_FIELDS.map(f => ({
            fieldName: f.label,
            description: '',
            keywords: f.keywords,
            exclude: f.exclude,
        }));
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<PolicyDecodeJobData>, error: Error): void {
        this.logger.error(
            `Policy decode job ${job.id} failed for cid ${job.data.cid}: ${error.message}`,
            error.stack,
        );
    }
}

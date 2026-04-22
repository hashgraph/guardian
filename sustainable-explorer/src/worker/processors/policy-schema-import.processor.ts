import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import JSZip from 'jszip';
import { posix as pathPosix } from 'path';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { IpfsService } from '../services/ipfs.service';

export interface PolicySchemaImportJobData {
    cid: string;
    messageTimestamp: string;
    policyTopicId: string;
}

interface RawPolicySchemaDocument {
    uuid?: unknown;
    iri?: unknown;
    version?: unknown;
    name?: unknown;
    description?: unknown;
    document?: unknown;
}

interface CategoryExportEntry {
    name?: unknown;
    type?: unknown;
}

@Processor(QUEUE_NAMES.POLICY_SCHEMA_IMPORT)
export class PolicySchemaImportProcessor extends WorkerHost {
    private readonly logger = new Logger(PolicySchemaImportProcessor.name);

    constructor(
        private readonly ipfsService: IpfsService,
        private readonly dataSource: DataSource,
    ) {
        super();
    }

    async process(job: Job<PolicySchemaImportJobData>): Promise<void> {
        const { cid, messageTimestamp, policyTopicId } = job.data;

        const existing = await this.dataSource.query(
            `SELECT id
             FROM policy_schema
             WHERE "policyTopicId" = $1 AND "sourceCid" = $2
             LIMIT 1`,
            [policyTopicId, cid],
        );
        const schemasAlreadyImported = existing.length > 0;
        const categoriesAlreadyEnriched = await this.checkCategoriesEnriched(policyTopicId);

        if (schemasAlreadyImported && categoriesAlreadyEnriched) {
            this.logger.debug(
                `Nothing to do for topic=${policyTopicId}, cid=${cid} — schemas and categories already stored`,
            );
            return;
        }

        const zipBuffer = await this.ipfsService.fetchContent(cid);
        const zip = await JSZip.loadAsync(zipBuffer);

        if (!categoriesAlreadyEnriched) {
            await this.extractAndStorePolicyCategories(zip, policyTopicId);
        }

        if (schemasAlreadyImported) {
            this.logger.debug(
                `Policy schemas already stored for topic=${policyTopicId}, cid=${cid}, skipping schema upserts`,
            );
            return;
        }

        const schemaFiles = Object.values(zip.files).filter((file) =>
            !file.dir && /(^|\/)(schema|schemas)\/.*\.json$/i.test(file.name),
        );

        if (schemaFiles.length === 0) {
            this.logger.warn(`No schema JSON files found in CID ${cid}`);
            return;
        }

        const now = Date.now().toString();
        let imported = 0;

        for (const file of schemaFiles) {
            const rawText = await file.async('string');

            let parsed: RawPolicySchemaDocument;
            try {
                parsed = JSON.parse(rawText) as RawPolicySchemaDocument;
            } catch {
                this.logger.warn(`Skipping invalid JSON schema file ${file.name} in CID ${cid}`);
                continue;
            }

            const schemaId = this.resolveSchemaId(parsed, file.name);
            const schemaVersion = this.asString(parsed.version) || '';
            const name = this.asString(parsed.name);
            const description = this.asString(parsed.description);
            const document = this.asObject(parsed.document);
            const rawSchema = this.asObject(parsed);

            await this.dataSource.query(
                `INSERT INTO policy_schema (
                    "policyTopicId",
                    "messageConsensusTimestamp",
                    "sourceCid",
                    "schemaFile",
                    "schemaId",
                    "schemaVersion",
                    name,
                    description,
                    document,
                    "rawSchema",
                    "lastUpdate",
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
                )
                ON CONFLICT ("policyTopicId", "schemaId", "schemaVersion") DO UPDATE SET
                    "messageConsensusTimestamp" = EXCLUDED."messageConsensusTimestamp",
                    "sourceCid" = EXCLUDED."sourceCid",
                    "schemaFile" = EXCLUDED."schemaFile",
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    document = EXCLUDED.document,
                    "rawSchema" = EXCLUDED."rawSchema",
                    "lastUpdate" = EXCLUDED."lastUpdate",
                    "updatedAt" = NOW()`,
                [
                    policyTopicId,
                    messageTimestamp,
                    cid,
                    file.name,
                    schemaId,
                    schemaVersion,
                    name,
                    description,
                    document ? JSON.stringify(document) : null,
                    JSON.stringify(rawSchema),
                    now,
                ],
            );
            imported += 1;
        }

        this.logger.log(
            `Imported ${imported} schema file(s) for topic=${policyTopicId}, cid=${cid}`,
        );
    }

    private async checkCategoriesEnriched(policyTopicId: string): Promise<boolean> {
        const rows = await this.dataSource.query(
            `SELECT 1 FROM business_view
             WHERE "viewType" = 'METHODOLOGY'
               AND "businessData"->>'topicId' = $1
               AND (
                   "businessData"->'sectoralScopes' IS NOT NULL
                   OR "businessData"->'emissionReductionApproach' IS NOT NULL
               )
             LIMIT 1`,
            [policyTopicId],
        );
        return rows.length > 0;
    }

    private async extractAndStorePolicyCategories(zip: JSZip, policyTopicId: string): Promise<void> {
        const policyFile = zip.file('policy.json');
        if (!policyFile) return;

        let policy: Record<string, unknown>;
        try {
            const raw = await policyFile.async('string');
            policy = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            this.logger.warn(`Could not parse policy.json for topic=${policyTopicId}`);
            return;
        }

        const entries = policy['categoriesExport'];
        if (!Array.isArray(entries) || entries.length === 0) return;

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

        const patch: Record<string, unknown> = { categoriesExport: categories };
        if (sectoralScopes.length > 0) patch.sectoralScopes = sectoralScopes;
        if (emissionReductionApproach !== null) patch.emissionReductionApproach = emissionReductionApproach;

        await this.dataSource.query(
            `UPDATE business_view
             SET "businessData" = "businessData" || $1::jsonb,
                 "updatedAt" = NOW()
             WHERE "viewType" = 'METHODOLOGY'
               AND "businessData"->>'topicId' = $2`,
            [JSON.stringify(patch), policyTopicId],
        );

        this.logger.debug(
            `Categories stored for topic=${policyTopicId}: scopes=${sectoralScopes.join(', ')}, approach=${emissionReductionApproach}`,
        );
    }

    private resolveSchemaId(parsed: RawPolicySchemaDocument, fileName: string): string {
        const id = this.asString(parsed.uuid)
            || this.asString(parsed.iri)
            || this.extractDocumentId(parsed.document)
            || pathPosix.basename(fileName, '.json');
        return id.slice(0, 255);
    }

    private extractDocumentId(value: unknown): string | null {
        const obj = this.asObject(value);
        if (!obj) return null;

        const id = obj['$id'];
        return this.asString(id);
    }

    private asString(value: unknown): string | null {
        return typeof value === 'string' && value.length > 0 ? value : null;
    }

    private asObject(value: unknown): Record<string, unknown> | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        return value as Record<string, unknown>;
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<PolicySchemaImportJobData>, error: Error): void {
        this.logger.error(
            `Policy schema import job ${job.id} failed for cid ${job.data.cid}: ${error.message}`,
            error.stack,
        );
    }
}

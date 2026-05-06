import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import JSZip from 'jszip';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { IpfsService } from '../services/ipfs.service';
import { PolicySchemaImportService } from '../services/policy-schema-import.service';
import { MappingPipelineService } from '../mapping/mapping-pipeline.service';
import { SchemaInfo, FieldDescriptor } from '../mapping/types';

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
    ) {
        super();
    }

    async process(job: Job<PolicyDecodeJobData>): Promise<void> {
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
        const mappingsAlreadyGenerated = await this.checkMappingsGenerated(policyTopicId);

        if (schemasAlreadyImported && categoriesAlreadyEnriched && mappingsAlreadyGenerated) {
            this.logger.debug(
                `Nothing to do for topic=${policyTopicId}, cid=${cid} — schemas, categories, and mappings already stored`,
            );
            return;
        }

        // New CID means schema content may have changed — invalidate any cached
        // classification and resolved field config so the mapper re-evaluates this topic.
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

        if (!categoriesAlreadyEnriched) {
            await this.extractAndStorePolicyCategories(zip, policyTopicId);
        }

        if (schemasAlreadyImported && mappingsAlreadyGenerated) {
            this.logger.debug(
                `Policy schemas and mappings already stored for topic=${policyTopicId}, cid=${cid}`,
            );
            return;
        }

        if (!schemasAlreadyImported) {
            await this.policySchemaImportService.importSchemasFromZip(zip, {
                cid,
                messageTimestamp,
                policyTopicId,
            });
        }

        // Step: Execute mapping pipeline (schema mapping and field mapping)
        if (!mappingsAlreadyGenerated) {
            await this.executeMapping(policyTopicId);
        }
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

    private async checkMappingsGenerated(policyTopicId: string): Promise<boolean> {
        const rows = await this.dataSource.query(
            `SELECT 1 FROM business_view
             WHERE "viewType" = 'METHODOLOGY'
               AND "businessData"->>'topicId' = $1
               AND (
                   "businessData"->>'schemaLabelMap' IS NOT NULL
                   OR "businessData"->>'fieldMap' IS NOT NULL
               )
             LIMIT 1`,
            [policyTopicId],
        );
        return rows.length > 0;
    }

    private async executeMapping(policyTopicId: string): Promise<void> {
        try {
            this.logger.debug(`Starting mapping pipeline for topic=${policyTopicId}`);

            // Retrieve imported schemas from database
            const schemas = await this.retrieveSchemasFromDatabase(policyTopicId);
            if (schemas.length === 0) {
                this.logger.warn(`No schemas found for topic=${policyTopicId}, skipping mapping`);
                return;
            }

            // Get fields to map (default set of important fields)
            const fields = this.getDefaultFieldDescriptors();

            // Execute the mapping pipeline
            const { schemaMap, fieldMap } = await this.mappingPipeline.executePipeline(
                schemas,
                fields,
            );

            // Store the mapping results in business_view for methodology
            const patch: Record<string, unknown> = {
                schemaLabelMap: schemaMap,
                fieldMap: fieldMap,
            };

            await this.dataSource.query(
                `UPDATE business_view
                 SET "businessData" = "businessData" || $1::jsonb,
                     "updatedAt" = NOW()
                 WHERE "viewType" = 'METHODOLOGY'
                   AND "businessData"->>'topicId' = $2`,
                [JSON.stringify(patch), policyTopicId],
            );

            this.logger.log(
                `Mapping pipeline completed for topic=${policyTopicId}: ` +
                `${Object.keys(schemaMap).length} schema(s) mapped, ` +
                `${Object.keys(fieldMap).length} field(s) mapped`,
            );
        } catch (error) {
            this.logger.error(
                `Mapping pipeline failed for topic=${policyTopicId}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            // Don't re-throw; log the error but allow processing to continue
            // The mapping can be retried in the next cycle
        }
    }

    private async retrieveSchemasFromDatabase(policyTopicId: string): Promise<SchemaInfo[]> {
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
            document: string | null;
            rawSchema: string;
        }>;

        return rows.map(row => ({
            id: row.id,
            name: row.name || undefined,
            description: row.description || undefined,
            document: row.document ? JSON.parse(row.document) : undefined,
            rawSchema: JSON.parse(row.rawSchema),
        }));
    }

    private getDefaultFieldDescriptors(): FieldDescriptor[] {
        // Default set of important fields to map across methodologies
        // These are common fields found in policy schemas
        return [
            {
                fieldName: 'Project ID',
                description: 'Unique identifier for the project',
                keywords: ['projectId', 'project_id', 'id', 'uuid'],
            },
            {
                fieldName: 'Project Name',
                description: 'Name or title of the project',
                keywords: ['projectName', 'project_name', 'name', 'title'],
            },
            {
                fieldName: 'Project Description',
                description: 'Detailed description of the project',
                keywords: ['projectDescription', 'project_description', 'description'],
            },
            {
                fieldName: 'Baseline Emissions',
                description: 'Baseline emissions for the project',
                keywords: ['baselineEmissions', 'baseline_emissions', 'baseline'],
            },
            {
                fieldName: 'Project Emissions',
                description: 'Project-related emissions',
                keywords: ['projectEmissions', 'project_emissions', 'emissions'],
            },
            {
                fieldName: 'Emission Reductions',
                description: 'Total emission reductions achieved',
                keywords: ['emissionReductions', 'emission_reductions', 'reductions'],
            },
            {
                fieldName: 'Methodology',
                description: 'Applied methodology for the project',
                keywords: ['methodology', 'method', 'approach'],
            },
            {
                fieldName: 'Start Date',
                description: 'Project start date',
                keywords: ['startDate', 'start_date', 'begin_date'],
            },
            {
                fieldName: 'End Date',
                description: 'Project end date',
                keywords: ['endDate', 'end_date', 'completion_date'],
            },
            {
                fieldName: 'Location',
                description: 'Project location or region',
                keywords: ['location', 'region', 'country', 'area'],
            },
        ];
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<PolicyDecodeJobData>, error: Error): void {
        this.logger.error(
            `Policy decode job ${job.id} failed for cid ${job.data.cid}: ${error.message}`,
            error.stack,
        );
    }
}

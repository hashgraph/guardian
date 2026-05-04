import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import JSZip from 'jszip';
import { posix as pathPosix } from 'path';

export interface PolicySchemaImportContext {
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

@Injectable()
export class PolicySchemaImportService {
    private readonly logger = new Logger(PolicySchemaImportService.name);

    constructor(private readonly dataSource: DataSource) {}

    async importSchemasFromZip(zip: JSZip, context: PolicySchemaImportContext): Promise<number> {
        const { cid, messageTimestamp, policyTopicId } = context;
        const schemaFiles = Object.values(zip.files).filter((file) =>
            !file.dir && /(^|\/)(schema|schemas)\/.*\.json$/i.test(file.name),
        );

        if (schemaFiles.length === 0) {
            this.logger.warn(`No schema JSON files found in CID ${cid}`);
            return 0;
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

        return imported;
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
}

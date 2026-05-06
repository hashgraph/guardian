import { Injectable, Logger } from '@nestjs/common';
import { IMapSchemasStrategy } from '../../interfaces/strategies.interface';
import { SchemaLabelMap, SchemaInfo } from '../../types';

/**
 * Rule-based schema mapping strategy
 *
 * This implementation uses simple heuristics to identify and map schemas:
 * - Uses schema UUIDs, IRIs, or document IDs as labels
 * - Falls back to schema names if IDs are not available
 * - No external dependencies or API calls required
 *
 * This is a fast, deterministic approach suitable for well-structured schema documents.
 */
@Injectable()
export class RuleMapSchemasService implements IMapSchemasStrategy {
    private readonly logger = new Logger(RuleMapSchemasService.name);

    async execute(schemas: SchemaInfo[]): Promise<SchemaLabelMap> {
        this.logger.debug(`Rule-based schema mapping for ${schemas.length} schema(s)`);

        const result: SchemaLabelMap = {};

        for (const schema of schemas) {
            const label = this.resolveSchemaLabel(schema);
            result[schema.name || label] = schema.id;
        }

        this.logger.debug(`Schema mapping complete: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * Resolve the primary label/ID for a schema using rule-based logic
     * Priority: document.$id > schema.id > schema.name
     */
    private resolveSchemaLabel(schema: SchemaInfo): string {
        // Try to extract label from document
        if (schema.document && typeof schema.document === 'object') {
            const docId = (schema.document as Record<string, unknown>)['$id'];
            if (typeof docId === 'string' && docId.length > 0) {
                return docId;
            }
        }

        // Fall back to schema ID
        if (schema.id && schema.id.length > 0) {
            return schema.id;
        }

        // Fall back to schema name
        if (schema.name && schema.name.length > 0) {
            return schema.name;
        }

        // If nothing else is available, generate a fallback
        return `schema-${Date.now()}`;
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { IMapFieldsStrategy } from '../../interfaces/strategies.interface';
import { SchemaLabelMap, FieldMap, FieldDescriptor, SchemaInfo } from '../../types';

/**
 * AI-based field mapping strategy
 *
 * This implementation uses LLM analysis to intelligently locate and map fields:
 * - Analyzes field descriptions and keywords using AI
 * - Understands semantic meaning to match fields across different naming conventions
 * - Identifies the best matching schema path based on field semantics
 * - Provides high accuracy even with ambiguous or non-standard field names
 *
 * This is more intelligent but slower than rule-based mapping, useful when
 * field names vary significantly or have ambiguous meanings.
 *
 * Note: Currently a placeholder. Actual LLM integration would depend on
 * available LLM services (OpenAI, Gemini, etc.)
 */
@Injectable()
export class AIMapFieldsService implements IMapFieldsStrategy {
    private readonly logger = new Logger(AIMapFieldsService.name);

    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        this.logger.debug(
            `AI-based field mapping for ${fields.length} field(s) across ${schemas.length} schema(s)`,
        );

        const result: FieldMap = {};

        for (const field of fields) {
            const mapping = await this.intelligentlyMapField(field, schemaMap, schemas);
            if (mapping) {
                result[field.fieldName] = this.formatMapping(mapping.schemaId, mapping.path);
                this.logger.debug(
                    `AI mapped field "${field.fieldName}" to ${result[field.fieldName]}`,
                );
            } else {
                this.logger.warn(`AI could not map field "${field.fieldName}"`);
            }
        }

        return result;
    }

    /**
     * Use AI to intelligently determine field mapping
     * This would typically call an LLM service with the field description and schema
     */
    private async intelligentlyMapField(
        field: FieldDescriptor,
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
    ): Promise<{ schemaId: string; path: string } | null> {
        // TODO: Integrate with LLM service (OpenAI, Gemini, etc.)
        // For now, fall back to rule-based approach
        return this.fallbackToRuleBasedMapping(field, schemas);
    }

    /**
     * Fallback: use rule-based logic when LLM is unavailable
     */
    private fallbackToRuleBasedMapping(
        field: FieldDescriptor,
        schemas: SchemaInfo[],
    ): { schemaId: string; path: string } | null {
        // Build a simple searchable index
        const schemaIndex = this.buildSimpleIndex(schemas);

        // Try exact match on field name
        const lowerFieldName = field.fieldName.toLowerCase();
        const matches = schemaIndex.get(lowerFieldName);
        if (matches && matches.length > 0) {
            return matches[0];
        }

        // Try keyword matching
        if (field.keywords && field.keywords.length > 0) {
            for (const keyword of field.keywords) {
                const lowerKeyword = keyword.toLowerCase();
                const keywordMatches = schemaIndex.get(lowerKeyword);
                if (keywordMatches && keywordMatches.length > 0) {
                    return keywordMatches[0];
                }
            }
        }

        return null;
    }

    /**
     * Build a simple schema index for fallback mapping
     */
    private buildSimpleIndex(
        schemas: SchemaInfo[],
    ): Map<string, { schemaId: string; path: string }[]> {
        const index = new Map<string, { schemaId: string; path: string }[]>();

        for (const schema of schemas) {
            if (!schema.document || typeof schema.document !== 'object') {
                continue;
            }

            const properties = (schema.document as Record<string, unknown>)['properties'];
            if (properties && typeof properties === 'object') {
                this.indexPropertiesSimple(
                    properties as Record<string, unknown>,
                    schema.id,
                    '',
                    index,
                );
            }
        }

        return index;
    }

    /**
     * Recursively index properties (simple version)
     */
    private indexPropertiesSimple(
        obj: Record<string, unknown>,
        schemaId: string,
        basePath: string,
        index: Map<string, { schemaId: string; path: string }[]>,
    ): void {
        for (const [key, value] of Object.entries(obj)) {
            const path = basePath ? `${basePath}.${key}` : key;
            const lowerKey = key.toLowerCase();

            if (!index.has(lowerKey)) {
                index.set(lowerKey, []);
            }
            index.get(lowerKey)!.push({ schemaId, path });

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const nestedObj = value as Record<string, unknown>;
                if (nestedObj['properties'] && typeof nestedObj['properties'] === 'object') {
                    this.indexPropertiesSimple(
                        nestedObj['properties'] as Record<string, unknown>,
                        schemaId,
                        path,
                        index,
                    );
                }
            }
        }
    }

    private formatMapping(schemaId: string, path: string): string {
        return `${schemaId}.${path}`;
    }
}

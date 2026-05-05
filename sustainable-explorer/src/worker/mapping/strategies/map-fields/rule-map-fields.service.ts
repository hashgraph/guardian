import { Injectable, Logger } from '@nestjs/common';
import { IMapFieldsStrategy } from '../../interfaces/strategies.interface';
import { SchemaLabelMap, FieldMap, FieldDescriptor, SchemaInfo } from '../../types';

/**
 * Rule-based field mapping strategy
 *
 * This implementation uses keyword matching and heuristics to locate fields:
 * - Matches field names and keywords against schema properties
 * - Traverses schema document structures to find matching paths
 * - Uses case-insensitive matching for robustness
 * - No external dependencies or API calls required
 *
 * This is a fast, deterministic approach suitable for well-defined field names
 * and consistent schema structures.
 */
@Injectable()
export class RuleMapFieldsService implements IMapFieldsStrategy {
    private readonly logger = new Logger(RuleMapFieldsService.name);

    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        this.logger.debug(
            `Rule-based field mapping for ${fields.length} field(s) across ${schemas.length} schema(s)`,
        );

        const result: FieldMap = {};

        // Build a searchable index of schema properties
        const schemaIndex = this.buildSchemaIndex(schemas);

        for (const field of fields) {
            const mapping = this.findFieldMapping(field, schemaIndex, schemaMap);
            if (mapping) {
                result[field.fieldName] = this.formatMapping(mapping.schemaId, mapping.path);
                this.logger.debug(
                    `Mapped field "${field.fieldName}" to ${result[field.fieldName]}`,
                );
            } else {
                this.logger.warn(`Could not map field "${field.fieldName}" using rule-based matching`);
            }
        }

        return result;
    }

    /**
     * Build an index for quick lookup of schema properties
     */
    private buildSchemaIndex(
        schemas: SchemaInfo[],
    ): Map<string, { schemaId: string; path: string }[]> {
        const index = new Map<string, { schemaId: string; path: string }[]>();

        for (const schema of schemas) {
            if (!schema.document || typeof schema.document !== 'object') {
                continue;
            }

            // Extract properties from the schema document
            const properties = (schema.document as Record<string, unknown>)['properties'];
            if (properties && typeof properties === 'object') {
                this.indexProperties(
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
     * Recursively index properties from a schema document
     */
    private indexProperties(
        obj: Record<string, unknown>,
        schemaId: string,
        basePath: string,
        index: Map<string, { schemaId: string; path: string }[]>,
    ): void {
        for (const [key, value] of Object.entries(obj)) {
            const path = basePath ? `${basePath}.${key}` : key;

            // Index the property name
            const lowerKey = key.toLowerCase();
            if (!index.has(lowerKey)) {
                index.set(lowerKey, []);
            }
            index.get(lowerKey)!.push({ schemaId, path });

            // Recursively index nested properties
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const nestedObj = value as Record<string, unknown>;
                if (nestedObj['properties'] && typeof nestedObj['properties'] === 'object') {
                    this.indexProperties(
                        nestedObj['properties'] as Record<string, unknown>,
                        schemaId,
                        path,
                        index,
                    );
                }
            }
        }
    }

    /**
     * Find a mapping for a field using keyword matching
     */
    private findFieldMapping(
        field: FieldDescriptor,
        schemaIndex: Map<string, { schemaId: string; path: string }[]>,
        schemaMap: SchemaLabelMap,
    ): { schemaId: string; path: string } | null {
        // Try exact match on field name
        const exactMatch = this.tryExactMatch(field.fieldName, schemaIndex);
        if (exactMatch) return exactMatch;

        // Try keyword matching
        if (field.keywords && field.keywords.length > 0) {
            for (const keyword of field.keywords) {
                const match = this.tryKeywordMatch(keyword, schemaIndex);
                if (match) return match;
            }
        }

        // Try fuzzy match on field name
        const fuzzyMatch = this.tryFuzzyMatch(field.fieldName, schemaIndex);
        if (fuzzyMatch) return fuzzyMatch;

        return null;
    }

    /**
     * Try exact case-insensitive match
     */
    private tryExactMatch(
        fieldName: string,
        index: Map<string, { schemaId: string; path: string }[]>,
    ): { schemaId: string; path: string } | null {
        const lowerFieldName = fieldName.toLowerCase();
        const matches = index.get(lowerFieldName);

        if (matches && matches.length > 0) {
            // Return the first match
            return matches[0];
        }

        return null;
    }

    /**
     * Try keyword-based matching
     */
    private tryKeywordMatch(
        keyword: string,
        index: Map<string, { schemaId: string; path: string }[]>,
    ): { schemaId: string; path: string } | null {
        const lowerKeyword = keyword.toLowerCase();

        // Look for keys that include this keyword
        for (const [key, paths] of index.entries()) {
            if (key.includes(lowerKeyword)) {
                return paths[0];
            }
        }

        return null;
    }

    /**
     * Try fuzzy matching (e.g., "ProjectTitle" matches "project_title")
     */
    private tryFuzzyMatch(
        fieldName: string,
        index: Map<string, { schemaId: string; path: string }[]>,
    ): { schemaId: string; path: string } | null {
        const normalized = this.normalizeFieldName(fieldName);

        for (const [key, paths] of index.entries()) {
            const normalizedKey = this.normalizeFieldName(key);
            if (normalizedKey === normalized) {
                return paths[0];
            }
        }

        return null;
    }

    /**
     * Normalize field names for comparison (remove underscores, hyphens, camelCase)
     */
    private normalizeFieldName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[_-]/g, '')
            .replace(/([a-z])([A-Z])/g, '$1$2')
            .toLowerCase();
    }

    private formatMapping(schemaId: string, path: string): string {
        return `${schemaId}.${path}`;
    }
}

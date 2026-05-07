import { Injectable, Logger } from '@nestjs/common';
import { IMapSchemasStrategy } from '../../interfaces/strategies.interface';
import { SchemaLabel, SchemaLabelMap, SchemaInfo } from '../../types';

/**
 * GeoJSON-based schema mapping strategy
 *
 * This implementation uses GeoJSON analysis to map schemas:
 * - Analyzes schema documents for geographic/location data
 * - Maps schemas based on GeoJSON properties
 * - Returns schemas in GeoJSON format structure
 */
@Injectable()
export class GeoJsonMapSchemasService implements IMapSchemasStrategy {
    private readonly logger = new Logger(GeoJsonMapSchemasService.name);

    async execute(schemas: SchemaInfo[]): Promise<SchemaLabelMap> {
        this.logger.debug(`GeoJSON-based schema mapping for ${schemas.length} schema(s)`);

        const result: SchemaLabelMap = {};
        const schemaLabel: SchemaLabel = 'ProjectSchema';
        const candidates: string[] = [];

        for (const schema of schemas) {
            const schemaDocument = this.parseSchemaDocument(schema);
            if (!schemaDocument) {
                continue;
            }

            if (!this.hasDirectGeoJson(schemaDocument)) {
                continue;
            }

            if (!this.hasNameField(schemaDocument)) {
                continue;
            }

            candidates.push(schema.id);
        }

        if (candidates.length === 1) {
            result[schemaLabel] = candidates[0];
        } else if (candidates.length > 1) {
            this.logger.warn(
                `GeoJSON schema mapping found ${candidates.length} candidate project schemas; returning empty map to avoid ambiguity`,
            );
        }

        this.logger.debug(`GeoJSON schema mapping complete: ${JSON.stringify(result)}`);
        return result;
    }

    private parseSchemaDocument(schema: SchemaInfo): Record<string, unknown> | null {
        if (schema.document && typeof schema.document === 'object') {
            return schema.document;
        }

        if (!schema.rawSchema || typeof schema.rawSchema !== 'object') {
            return null;
        }

        const rawSchema = schema.rawSchema as Record<string, unknown>;
        if (rawSchema.document && typeof rawSchema.document === 'object') {
            return rawSchema.document as Record<string, unknown>;
        }

        return rawSchema;
    }

    private findGeoJsonDefKey(document: Record<string, unknown>): string | null {
        const defs = this.asRecord(document.$defs) ?? this.asRecord(document.definitions) ?? {};
        for (const [key, value] of Object.entries(defs)) {
            const def = this.asRecord(value);
            const properties = this.asRecord(def?.properties);
            if (properties && 'type' in properties && 'coordinates' in properties) {
                return key;
            }
        }
        return null;
    }

    private isGeoJsonProperty(fieldDef: Record<string, unknown>, geoDefKey: string | null): boolean {
        const ref = typeof fieldDef.$ref === 'string' ? fieldDef.$ref : '';
        if (ref && ref.includes('GeoJSON')) return true;
        if (geoDefKey && ref.includes(geoDefKey)) return true;

        const format = typeof fieldDef.format === 'string' ? fieldDef.format.toLowerCase() : '';
        if (format === 'geojson' || format === 'geo-json') return true;

        const properties = this.asRecord(fieldDef.properties);
        if (properties && 'type' in properties && 'coordinates' in properties) {
            return true;
        }

        for (const variantKey of ['oneOf', 'anyOf'] as const) {
            const variants = fieldDef[variantKey];
            if (!Array.isArray(variants)) {
                continue;
            }
            for (const item of variants) {
                const variant = this.asRecord(item);
                if (variant && this.isGeoJsonProperty(variant, geoDefKey)) {
                    return true;
                }
            }
        }

        const comment = typeof fieldDef.$comment === 'string' ? fieldDef.$comment : '';
        if (comment.replace(/\s/g, '').includes('"customType":"geo"')) {
            return true;
        }

        return false;
    }

    private hasDirectGeoJson(document: Record<string, unknown>): boolean {
        const geoDefKey = this.findGeoJsonDefKey(document);
        const topProperties = this.asRecord(document.properties) ?? {};

        for (const fieldDefValue of Object.values(topProperties)) {
            const fieldDef = this.asRecord(fieldDefValue);
            if (fieldDef && this.isGeoJsonProperty(fieldDef, geoDefKey)) {
                return true;
            }
        }

        return false;
    }

    private hasNameField(document: Record<string, unknown>): boolean {
        const topProperties = this.asRecord(document.properties) ?? {};
        for (const fieldDefValue of Object.values(topProperties)) {
            const fieldDef = this.asRecord(fieldDefValue);
            if (!fieldDef) {
                continue;
            }

            const title = typeof fieldDef.description === 'string' ? fieldDef.description.toLowerCase() : '';
            if ((title.includes('name') || title.includes('title')) && !title.includes('site')) {
                return true;
            }
        }
        return false;
    }

    private asRecord(value: unknown): Record<string, unknown> | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        return value as Record<string, unknown>;
    }
}

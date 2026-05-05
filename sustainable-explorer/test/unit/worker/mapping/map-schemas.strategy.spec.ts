import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { basename, join } from 'path';
import { GeoJsonMapSchemasService } from '../../../../src/worker/mapping/strategies/map-schemas/geo-json-map-schemas.service';

interface RawPolicySchemaDocument {
    uuid?: unknown;
    iri?: unknown;
    name?: unknown;
    document?: unknown;
}

const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.length > 0 ? value : null;

const asObject = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
};

const extractDocumentId = (value: unknown): string | null => {
    const obj = asObject(value);
    if (!obj) return null;
    return asString(obj.$id);
};

const resolveSchemaId = (parsed: RawPolicySchemaDocument, fileName: string): string => {
    const id = asString(parsed.uuid)
        || asString(parsed.iri)
        || extractDocumentId(parsed.document)
        || basename(fileName, '.json');
    return id.slice(0, 255);
};

const buildSchemasFromPolicyArchive = async () => {
    const policyPath = join(__dirname, 'policies', 'VMR0006.policy');
    const zip = await JSZip.loadAsync(readFileSync(policyPath));

    const schemaFiles = Object.values(zip.files)
        .filter(file => !file.dir && /(^|\/)(schema|schemas)\/.*\.json$/i.test(file.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    const schemas: Array<{ id: string; name?: string; rawSchema: Record<string, unknown> }> = [];

    for (const file of schemaFiles) {
        let parsed: RawPolicySchemaDocument;

        try {
            parsed = JSON.parse(await file.async('string')) as RawPolicySchemaDocument;
        } catch {
            continue;
        }

        schemas.push({
            id: resolveSchemaId(parsed, file.name),
            name: asString(parsed.name) ?? undefined,
            rawSchema: asObject(parsed) ?? {},
        });
    }

    return schemas;
};

describe('GeoJsonMapSchemasService', () => {
    it('returns a dummy ProjectSchema mapping for the provided schemas', async () => {
        const service = new GeoJsonMapSchemasService();
        const schemas = await buildSchemasFromPolicyArchive();

        const result = await service.execute(schemas);

        expect(result).toEqual({
            ProjectSchema: schemas[schemas.length - 1]?.id,
        });
    });

    it('returns an empty map when no schemas are provided', async () => {
        const service = new GeoJsonMapSchemasService();

        const result = await service.execute([]);

        expect(result).toEqual({});
    });
});
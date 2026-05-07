import { beforeAll, describe, expect, it } from '@jest/globals';
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
    let policySchemas: Array<{ id: string; name?: string; rawSchema: Record<string, unknown> }> = [];

    beforeAll(async () => {
        policySchemas = await buildSchemasFromPolicyArchive();
    });

    it('processes real policy archive schemas without throwing and returns current heuristic output-----', async () => {
        const service = new GeoJsonMapSchemasService();

        const result = await service.execute(policySchemas);

        expect(result).toEqual({
            ProjectSchema: '5dde840d-e4d8-4185-a4cd-48fb314c0ef3'
        });
    });

    it('maps ProjectSchema when exactly one direct GeoJSON schema has a project name/title field', async () => {
        const service = new GeoJsonMapSchemasService();
        const schemas = [
            {
                id: 'non-project-wrapper',
                rawSchema: {
                    document: {
                        properties: {
                            project_details: {
                                properties: {
                                    location: { $ref: '#GeoJSON' },
                                    project_name: { title: 'field0', description: 'Project Name' },
                                },
                            },
                        },
                    },
                },
            },
            {
                id: 'project-schema',
                rawSchema: {
                    document: {
                        properties: {
                            name: { title: 'field1', description: 'Project Name', type: 'string' },
                            location: { $ref: '#GeoJSON' },
                        },
                    },
                },
            },
            {
                id: 'utility-schema',
                rawSchema: {
                    document: {
                        properties: {
                            country: { title: 'field2', description: 'Country', type: 'string' },
                            location: { $ref: '#GeoJSON' },
                        },
                    },
                },
            },
        ];

        const result = await service.execute(schemas);

        expect(result).toEqual({
            ProjectSchema: 'project-schema',
        });
    });

    it('returns an empty map when multiple direct GeoJSON project schemas are found', async () => {
        const service = new GeoJsonMapSchemasService();
        const schemas = [
            {
                id: 'project-a',
                rawSchema: {
                    document: {
                        properties: {
                            title: { title: 'field3', description: 'Project Title', type: 'string' },
                            location: { $ref: '#GeoJSON' },
                        },
                    },
                },
            },
            {
                id: 'project-b',
                rawSchema: {
                    document: {
                        properties: {
                            name: { title: 'field4', description: 'Project Name', type: 'string' },
                            area: { $ref: '#GeoJSON' },
                        },
                    },
                },
            },
        ];

        const result = await service.execute(schemas);

        expect(result).toEqual({});
    });

    it('returns an empty map when no schemas are provided', async () => {
        const service = new GeoJsonMapSchemasService();

        const result = await service.execute([]);

        expect(result).toEqual({});
    });
});
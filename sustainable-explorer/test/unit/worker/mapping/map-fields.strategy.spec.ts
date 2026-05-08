import 'dotenv/config';
import { beforeAll, describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { basename, join } from 'path';
import { HeuristicFieldMapperService } from '../../../../src/worker/mapping/strategies/map-fields/heuristic-field-mapper.service';
import { LlmFieldMapperService } from '../../../../src/worker/mapping/strategies/map-fields/llm-field-mapper.service';

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

describe('field mapping strategies', () => {
    let schemas: Array<{ id: string; name?: string; rawSchema: Record<string, unknown> }> = [];
    const schemaMap = { ProjectSchema: '5dde840d-e4d8-4185-a4cd-48fb314c0ef3' };

    beforeAll(async () => {
        schemas = await buildSchemasFromPolicyArchive();
    });
    const fields = [
        {
            "fieldName": "Project Title",
            "description": "Official name or title of the project",
            "keywords": ["title", "project", "name", "program"]
        },
        {
            "fieldName": "Country",
            "description": "Country where the project is implemented or located",
            "keywords": ["country", "location", "host", "region", "territory"]
        },
        {
            "fieldName": "Registry",
            "description": "Carbon or environmental registry system where the project is registered (e.g., Verra, Gold Standard)",
            "keywords": ["registry", "standard", "program", "verra", "gold", "CDM", "VCS"]
        },
        {
            "fieldName": "Project Developer",
            "description": "Organization, company, or entity responsible for developing or implementing the project",
            "keywords": ["developer", "proponent", "entity", "owner"]
        },
        {
            "fieldName": "Sector",
            "description": "Industry or sector classification of the project (e.g., energy, forestry, agriculture)",
            "keywords": ["sector", "type", "category", "energy", "forestry", "agriculture", "land use", "methodology"]
        },
        {
            "fieldName": "Status",
            "description": "Current lifecycle status of the project such as proposed, registered, active, or retired",
            "keywords": ["status", "stage", "state", "phase", "lifecycle", "approved", "verified"]
        },
        {
            "fieldName": "SDGs",
            "description": "List of United Nations Sustainable Development Goals (SDGs) that the project contributes to or supports",
            "keywords": ["sdg", "goals", "sustainable", "development goals", "UN goals", "co-benefits", "social impact", "benefits"]
        }
    ];

    it('HeuristicFieldMapperService returns an empty dummy map', async () => {
        const service = new HeuristicFieldMapperService();

        const result = await service.execute(schemaMap, schemas, fields);

        expect(result).toEqual({});
    });

    it('LlmFieldMapperService returns mapping in expected format and logs output', async () => {
        const service = new LlmFieldMapperService();

        const result = await service.execute(schemaMap, schemas, fields);

        // Log the output for inspection
        // eslint-disable-next-line no-console
        console.log('LlmFieldMapperService output:', result);

        expect(typeof result).toBe('object');
        expect(Object.keys(result)).toEqual(fields.map((f) => f.fieldName));
        for (const value of Object.values(result)) {
            expect(typeof value).toBe('string');
        }
    });
});
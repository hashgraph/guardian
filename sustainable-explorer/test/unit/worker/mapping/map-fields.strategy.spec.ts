import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
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

const buildSchemasFromFixtures = () => {
    const schemasDir = join(__dirname, 'VMR0006', 'schemas');
    const files = readdirSync(schemasDir)
        .filter(file => file.toLowerCase().endsWith('.json'))
        .sort();

    return files.map((fileName) => {
        const filePath = join(schemasDir, fileName);
        const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as RawPolicySchemaDocument;
        return {
            id: resolveSchemaId(parsed, fileName),
            name: asString(parsed.name) ?? undefined,
            rawSchema: asObject(parsed) ?? {},
        };
    });
};

describe('field mapping strategies', () => {
    const schemas = buildSchemasFromFixtures();
    const schemaMap = { ProjectSchema: '5dde840d-e4d8-4185-a4cd-48fb314c0ef3' };
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

    it('LlmFieldMapperService returns an empty dummy map', async () => {
        const service = new LlmFieldMapperService();

        const result = await service.execute(schemaMap, schemas, fields);

        expect(result).toEqual({});
    });
});
import 'dotenv/config';
import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeAll, describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { basename, join } from 'path';
import type { IMapFieldsStrategy } from '../../../../src/worker/mapping/interfaces/strategies.interface';
import { mapFieldsStrategyProvider } from '../../../../src/worker/mapping/providers/map-fields.provider';
import type { FieldDescriptor, FieldMap } from '../../../../src/worker/mapping/types';
import { MapFieldsMethodType } from '../../../../src/worker/mapping/tokens/mapping.tokens';

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

/**
 * When `configuredMethod` is undefined, mirrors Nest `ConfigService.get` when
 * `MAP_FIELDS_METHOD` is unset (factory receives the second-arg default).
 */
const mockConfigForMapFieldsMethod = (configuredMethod: string | undefined): ConfigService =>
    ({
        get: <T = unknown>(key: string, defaultValue?: T): T => {
            if (key === 'MAP_FIELDS_METHOD') {
                return (configuredMethod !== undefined ? configuredMethod : defaultValue) as T;
            }
            return defaultValue as T;
        },
    }) as ConfigService;

const resolveStrategyFromProvider = (mapFieldsMethod: string | undefined): IMapFieldsStrategy => {
    const { useFactory } = mapFieldsStrategyProvider as FactoryProvider<IMapFieldsStrategy>;
    const resolved = useFactory(mockConfigForMapFieldsMethod(mapFieldsMethod));
    if (resolved instanceof Promise) {
        throw new Error('mapFieldsStrategyProvider factory returned a Promise (tests expect sync)');
    }
    return resolved;
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

const logFieldMapOutput = (label: string, result: FieldMap): void => {
    // eslint-disable-next-line no-console
    console.log(`[${label}] map-fields output:\n${JSON.stringify(result, null, 2)}`);
};

/** `FieldMap`: plain object, keys are request field names, values are string paths (`schemaId.path`). */
const assertPartialFieldMapFormat = (result: FieldMap, fields: FieldDescriptor[]): void => {
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
    expect(Array.isArray(result)).toBe(false);

    const allowedNames = new Set(fields.map((f) => f.fieldName));

    for (const [fieldName, path] of Object.entries(result)) {
        expect(allowedNames.has(fieldName)).toBe(true);
        expect(typeof path).toBe('string');
        if (path.length > 0) {
            expect(path.includes('.')).toBe(true);
        }
    }
};

/** LLM mapper fills every requested field with a string (often empty when unmatched). */
const assertFullFieldMapStringValues = (result: FieldMap, fields: FieldDescriptor[]): void => {
    expect(Object.keys(result)).toEqual(fields.map((f) => f.fieldName));
    for (const value of Object.values(result)) {
        expect(typeof value).toBe('string');
    }
};

const LLM_API_CONFIGURED = Boolean(
    process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
);

const ENV_MAP_FIELDS_RAW = process.env.MAP_FIELDS_METHOD?.trim();

const FIELDS: FieldDescriptor[] = [
    {
        fieldName: 'Project Title',
        description: 'Official name or title of the project',
        keywords: ['title', 'project', 'name', 'program'],
    },
    {
        fieldName: 'Country',
        description: 'Country where the project is implemented or located',
        keywords: ['country', 'location', 'host', 'region', 'territory'],
    },
    {
        fieldName: 'Registry',
        description: 'Carbon or environmental registry system where the project is registered (e.g., Verra, Gold Standard)',
        keywords: ['registry', 'standard', 'program', 'verra', 'gold', 'CDM', 'VCS'],
    },
    {
        fieldName: 'Project Developer',
        description: 'Organization, company, or entity responsible for developing or implementing the project',
        keywords: ['developer', 'proponent', 'entity', 'owner'],
    },
    {
        fieldName: 'Sector',
        description: 'Industry or sector classification of the project (e.g., energy, forestry, agriculture)',
        keywords: ['sector', 'type', 'category', 'energy', 'forestry', 'agriculture', 'land use', 'methodology'],
    },
    {
        fieldName: 'Status',
        description: 'Current lifecycle status of the project such as proposed, registered, active, or retired',
        keywords: ['status', 'stage', 'state', 'phase', 'lifecycle', 'approved', 'verified'],
    },
    {
        fieldName: 'SDGs',
        description: 'List of United Nations Sustainable Development Goals (SDGs) that the project contributes to or supports',
        keywords: ['sdg', 'goals', 'sustainable', 'development goals', 'UN goals', 'co-benefits', 'social impact', 'benefits'],
    },
];

type MapFieldsFixture = {
    title: string;
    mapFieldsMethod: string | undefined;
    requiresLlmApiKey?: boolean;
    assertPolicyResult: (result: FieldMap, fields: FieldDescriptor[]) => void;
};

/**
 * Catalog of supported `MAP_FIELDS_METHOD` values (mirrors `map-fields.provider.ts`).
 * Add a row when you add a `MapFieldsMethodType` and a matching `switch` branch.
 */
const MAP_FIELDS_RESOLUTION_FIXTURES: ReadonlyArray<MapFieldsFixture> = [
    {
        title: 'MAP_FIELDS_METHOD unset (uses Config default)',
        mapFieldsMethod: undefined,
        assertPolicyResult: (result, fields) => {
            logFieldMapOutput('default cross-schema fuzzy', result);
            assertPartialFieldMapFormat(result, fields);
        },
    },
    {
        title: `MAP_FIELDS_METHOD=${MapFieldsMethodType.CROSS_SCHEMA_FUZZY}`,
        mapFieldsMethod: MapFieldsMethodType.CROSS_SCHEMA_FUZZY,
        assertPolicyResult: (result, fields) => {
            logFieldMapOutput(MapFieldsMethodType.CROSS_SCHEMA_FUZZY, result);
            assertPartialFieldMapFormat(result, fields);
        },
    },
    {
        title: `MAP_FIELDS_METHOD=${MapFieldsMethodType.HEURISTIC_FIELD_MAPPER}`,
        mapFieldsMethod: MapFieldsMethodType.HEURISTIC_FIELD_MAPPER,
        assertPolicyResult: (result, fields) => {
            logFieldMapOutput(MapFieldsMethodType.HEURISTIC_FIELD_MAPPER, result);
            assertPartialFieldMapFormat(result, fields);
        },
    },
    {
        title: `MAP_FIELDS_METHOD=${MapFieldsMethodType.LLM_FIELD_MAPPER}`,
        mapFieldsMethod: MapFieldsMethodType.LLM_FIELD_MAPPER,
        requiresLlmApiKey: true,
        assertPolicyResult: (result, fields) => {
            logFieldMapOutput(MapFieldsMethodType.LLM_FIELD_MAPPER, result);
            assertFullFieldMapStringValues(result, fields);
        },
    },
];

const selectMapFieldsFixture = (): MapFieldsFixture => {
    if (!ENV_MAP_FIELDS_RAW) {
        const unset = MAP_FIELDS_RESOLUTION_FIXTURES.find(f => f.mapFieldsMethod === undefined);
        if (!unset) throw new Error('Missing unset MAP_FIELDS_METHOD fixture');
        return unset;
    }

    const match = MAP_FIELDS_RESOLUTION_FIXTURES.find(
        f => f.mapFieldsMethod !== undefined
            && f.mapFieldsMethod.toUpperCase() === ENV_MAP_FIELDS_RAW.toUpperCase(),
    );
    if (match) return match;

    return {
        title: `MAP_FIELDS_METHOD=${ENV_MAP_FIELDS_RAW} (unknown token; provider default branch)`,
        mapFieldsMethod: ENV_MAP_FIELDS_RAW,
        assertPolicyResult: (result, fields) => {
            logFieldMapOutput('unknown MAP_FIELDS_METHOD (default branch)', result);
            assertPartialFieldMapFormat(result, fields);
        },
    };
};

const activeMapFieldsFixture = selectMapFieldsFixture();

describe(`map fields strategy (resolved via mapFieldsStrategyProvider — ${activeMapFieldsFixture.title})`, () => {
    let policySchemas: Array<{ id: string; name?: string; rawSchema: Record<string, unknown> }> = [];
    const schemaMap = { ProjectSchema: '5dde840d-e4d8-4185-a4cd-48fb314c0ef3' };

    beforeAll(async () => {
        policySchemas = await buildSchemasFromPolicyArchive();
    });

    let strategy: IMapFieldsStrategy;

    beforeAll(() => {
        strategy = resolveStrategyFromProvider(activeMapFieldsFixture.mapFieldsMethod);
    });

    const run = activeMapFieldsFixture.requiresLlmApiKey && !LLM_API_CONFIGURED ? it.skip : it;

    const assertPolicy = async () => {
        const result = await strategy.execute(schemaMap, policySchemas, FIELDS);

        activeMapFieldsFixture.assertPolicyResult(result, FIELDS);
    };

    if (activeMapFieldsFixture.requiresLlmApiKey) {
        run('execute returns a FieldMap-shaped result (output logged)', assertPolicy, 60_000);
    } else {
        run('execute returns a FieldMap-shaped result (output logged)', assertPolicy);
    }
});

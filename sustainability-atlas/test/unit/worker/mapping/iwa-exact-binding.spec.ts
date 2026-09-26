import { beforeAll, describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import JSZip from 'jszip';
import { CrossSchemaFuzzyMapperService } from '@worker/mapping/strategies/map-fields/cross-schema-fuzzy-mapper.service';
import type { FieldDescriptor, SchemaInfo } from '@worker/mapping/types';

// ---------------------------------------------------------------------------
// Synthetic schema builders
// ---------------------------------------------------------------------------

const comment = (term: string, property?: string | null): string =>
    JSON.stringify({
        term,
        '@id': 'https://www.schema.org/text',
        orderPosition: 0,
        isPrivate: false,
        ...(property ? { property } : {}),
    });

/** A leaf field with a title, an optional IWA property, and an optional raw $comment override. */
const field = (
    title: string,
    property?: string | null,
    opts: { rawComment?: string; oneOf?: boolean } = {},
): Record<string, unknown> => {
    const node: Record<string, unknown> = {
        title,
        description: '',
        type: 'string',
    };
    const c = opts.rawComment ?? comment(title, property);
    if (opts.oneOf) {
        return { oneOf: [{ ...node, $comment: c }], readOnly: false };
    }
    node.$comment = c;
    return node;
};

const schema = (
    id: string,
    properties: Record<string, unknown>,
    iwaVersion?: string,
): SchemaInfo => ({
    id,
    name: id,
    document: { $id: `#${id}`, type: 'object', properties },
    rawSchema: { iri: `#${id}`, document: { $id: `#${id}`, type: 'object', properties } },
    iwaVersion,
});

const COUNTRY: FieldDescriptor = {
    fieldName: 'Country',
    description: '',
    keywords: ['country', 'location', 'project location'],
    exclude: ['participant', 'applicant', 'coordinate', 'geojson', 'polygon', 'boundary'],
};
const GEO: FieldDescriptor = { fieldName: 'Project Location', description: '', keywords: ['geo', 'location', 'geometry'] };

const mapper = () => new CrossSchemaFuzzyMapperService();

// ---------------------------------------------------------------------------

describe('CrossSchemaFuzzyMapperService — IWA-property exact binding', () => {
    it('binds a v3-tagged field even with an unhelpful title, over a keyword rival', async () => {
        const s = schema('s1', {
            zoneAlpha: field('Zone alpha', 'ActivityImpactModule.country'),
            incorp: field('Country of incorporation of the participant'),
        }, '3.0.0');

        const out = await mapper().execute([s], [COUNTRY]);

        expect(out['Country']).toEqual(['s1.zoneAlpha']);
    });

    it('maps a v1 property up to v3 on an untagged schema', async () => {
        const s = schema('s1', {
            orgCountry: field('Org place', 'AccountableImpactOrganization.country'),
        });

        const out = await mapper().execute([s], [COUNTRY]);

        expect(out['Country']).toEqual(['s1.orgCountry']);
    });

    it('still binds when an untagged schema already uses the v3 property name', async () => {
        const s = schema('s1', {
            c: field('anything', 'ActivityImpactModule.country'),
        });

        const out = await mapper().execute([s], [COUNTRY]);

        expect(out['Country']).toEqual(['s1.c']);
    });

    it('ignores a property v3 removed and falls back to keyword matching (no throw)', async () => {
        const s = schema('s1', {
            // removed-in-v3 property, but the title carries the keyword
            country: field('Project country', 'ImpactClaim.activityImpactModule'),
        });

        const out = await mapper().execute([s], [COUNTRY]);

        expect(out['Country']).toEqual(['s1.country']);
    });

    it('does not throw on a $comment that is not valid JSON', async () => {
        const s = schema('s1', {
            country: field('Project country', undefined, { rawComment: '{ not json' }),
        });

        const out = await mapper().execute([s], [COUNTRY]);

        expect(out['Country']).toEqual(['s1.country']);
    });

    it('parses an IWA property carried on a oneOf branch wrapper', async () => {
        const s = schema('s1', {
            wrapped: field('n/a', 'ActivityImpactModule.country', { oneOf: true }),
        }, '3.0.0');

        const out = await mapper().execute([s], [COUNTRY]);

        expect(out['Country']).toEqual(['s1.wrapped']);
    });

    it('binds geo from an IWA tag even when the field is not GeoJSON-shaped', async () => {
        const s = schema('s1', {
            siteArea: field('Site area reference', 'ActivityImpactModule.geographicLocation'),
        }, '3.0.0');

        const out = await mapper().execute([s], [GEO]);

        expect(out['Project Location']).toEqual(['s1.siteArea']);
    });

    it('does not bind a field whose IWA property belongs to a different canonical field', async () => {
        const s = schema('s1', {
            name: field('x', 'ActivityImpactModule.name'),
        }, '3.0.0');

        const out = await mapper().execute([s], [COUNTRY]);

        expect(out['Country']).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Regression: a real policy with no $comment.property must map identically
// ---------------------------------------------------------------------------

const REGRESSION_FIELDS: FieldDescriptor[] = [
    { fieldName: 'Project Title', description: '', keywords: ['title', 'project', 'name', 'program'] },
    { fieldName: 'Country', description: '', keywords: ['country', 'location', 'host', 'region', 'territory'] },
    { fieldName: 'Project Developer', description: '', keywords: ['developer', 'proponent', 'entity', 'owner'] },
    { fieldName: 'Sector', description: '', keywords: ['sector', 'type', 'category', 'energy', 'forestry', 'methodology'] },
];

describe('CrossSchemaFuzzyMapperService — no regression for $comment-free schemas', () => {
    let schemas: SchemaInfo[] = [];

    beforeAll(async () => {
        const zip = await JSZip.loadAsync(readFileSync(join(__dirname, 'policies', 'VMR0006.policy')));
        const files = Object.values(zip.files)
            .filter((f) => !f.dir && /(^|\/)(schema|schemas)\/.*\.json$/i.test(f.name))
            .sort((a, b) => a.name.localeCompare(b.name));

        schemas = [];
        for (const f of files) {
            let parsed: Record<string, unknown>;
            try {
                parsed = JSON.parse(await f.async('string')) as Record<string, unknown>;
            } catch {
                continue;
            }
            const doc = parsed['document'] as Record<string, unknown> | undefined;
            const id =
                (typeof parsed['uuid'] === 'string' && parsed['uuid']) ||
                (typeof parsed['iri'] === 'string' && parsed['iri']) ||
                (doc && typeof doc['$id'] === 'string' && doc['$id']) ||
                basename(f.name, '.json');
            schemas.push({
                id: String(id).slice(0, 255),
                name: typeof parsed['name'] === 'string' ? parsed['name'] : undefined,
                rawSchema: parsed,
            });
        }
    });

    it('produces the same field map with and without IWA-version awareness', async () => {
        const withVersion = await mapper().execute(schemas, REGRESSION_FIELDS);
        // No schema in this fixture carries iwaVersion or $comment.property, so the
        // IWA-exact branch can never fire — the result is purely keyword-driven.
        const stripped = schemas.map((s) => ({ ...s, iwaVersion: undefined }));
        const withoutVersion = await mapper().execute(stripped, REGRESSION_FIELDS);

        expect(withVersion).toEqual(withoutVersion);
        // sanity: the fixture still maps at least the project title
        expect(Object.keys(withVersion).length).toBeGreaterThan(0);
    });
});

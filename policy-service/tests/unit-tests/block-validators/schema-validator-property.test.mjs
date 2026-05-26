import { assert } from 'chai';
import { Module } from 'node:module';

const originalLoad = Module._load;
Module._load = function (req, parent, ...rest) {
    if (req === '@guardian/common') {
        return {
            DatabaseServer: class { constructor() {} async getSchemaByIRI() { return null; } },
            Schema: class {},
        };
    }
    if (req === '@guardian/interfaces') {
        return {
            SchemaCategory: { SYSTEM: 'SYSTEM' },
            TenantContext: { Empty: { tenantId: null } },
        };
    }
    return originalLoad.call(this, req, parent, ...rest);
};

const { SchemaValidator } = await import('../../../dist/policy-engine/block-validators/schema-validator.js');

after(() => { Module._load = originalLoad; });

// Mulberry32 PRNG — deterministic per seed.
function mulberry32(seed) {
    let s = seed >>> 0;
    return () => {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = s;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function genDocument(rng, depth = 0) {
    const choice = rng();
    if (choice < 0.1 || depth > 3) return null;
    if (choice < 0.2) return undefined;
    if (choice < 0.3) return 'string-document';
    if (choice < 0.4) return [];
    if (choice < 0.5) return { document: null };
    if (choice < 0.6) return { document: 'malformed' };
    if (choice < 0.7) return { document: { $defs: 'not-an-object' } };
    if (choice < 0.85) return { document: { $defs: {} } };
    const subCount = Math.floor(rng() * 4);
    const defs = {};
    for (let i = 0; i < subCount; i++) {
        defs[`iri:sub-${i}-${Math.floor(rng() * 100)}`] = {};
    }
    return { document: { $defs: defs } };
}

function genIri(rng) {
    const seed = Math.floor(rng() * 1000);
    return `iri:${seed}`;
}

describe('@unit @property SchemaValidator never throws', () => {
    it('1000 random validator instances over a fresh empty map', async () => {
        const rng = mulberry32(0xCAFE);
        for (let i = 0; i < 1000; i++) {
            const doc = genDocument(rng);
            const isTemplate = rng() > 0.5;
            const iri = genIri(rng);
            const v = new SchemaValidator(iri, doc, isTemplate);
            try {
                await v.load();
                await v.validate(new Map());
            } catch (e) {
                assert.fail(`SchemaValidator threw on iri=${iri} template=${isTemplate} doc=${JSON.stringify(doc)}: ${e.message}`);
            }
            assert.equal(typeof v.isValid, 'boolean');
        }
    });

    it('500 random validator instances against a populated dependency map', async () => {
        const rng = mulberry32(0x1337);

        const pool = new Map();
        for (let i = 0; i < 10; i++) {
            const iri = `iri:pool-${i}`;
            const v = new SchemaValidator(iri, { document: { $defs: {} } }, rng() > 0.5);
            await v.load();
            pool.set(iri, v);
        }

        for (let i = 0; i < 500; i++) {
            const subIris = [];
            const refCount = Math.floor(rng() * 4);
            for (let j = 0; j < refCount; j++) {
                if (rng() > 0.5) {
                    subIris.push(`iri:pool-${Math.floor(rng() * 10)}`);
                } else {
                    subIris.push(`iri:made-up-${Math.floor(rng() * 1000)}`);
                }
            }
            const defs = subIris.reduce((m, iri) => { m[iri] = {}; return m; }, {});
            const doc = { document: { $defs: defs } };
            const v = new SchemaValidator(`iri:rand-${i}`, doc, false);
            await v.load();
            const map = new Map(pool);
            map.set(v.iri, v);
            try {
                await v.validate(map);
            } catch (e) {
                assert.fail(`SchemaValidator threw on iri=${v.iri} subIris=${subIris.join(',')}: ${e.message}`);
            }
            assert.equal(typeof v.isValid, 'boolean');
            assert.equal(
                v.isValid === (v.getSerializedErrors().errors.length === 0),
                true,
            );
        }
    });

    it('addError persists across validate', async () => {
        const v = new SchemaValidator('iri:x', { document: { $defs: {} } }, false);
        v.addError('manual error');
        await v.load();
        await v.validate(new Map());
        assert.equal(v.isValid, false);
        assert.equal(v.getSerializedErrors().errors.includes('manual error'), true);
    });
});

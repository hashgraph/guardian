import { assert } from 'chai';
import esmock from 'esmock';

const { SchemaValidator } = await esmock.strict(
    '../../../dist/policy-engine/block-validators/schema-validator.js',
    {
        '@guardian/common': {
            DatabaseServer: class { constructor() {} async getSchemaByIRI() { return null; } },
            Schema: class {},
        },
        '@guardian/interfaces': {
            SchemaCategory: { SYSTEM: 'SYSTEM' },
            TenantContext: { Empty: { tenantId: null } },
        },
    },
);

const docWithDefs = (subIris = []) => ({
    document: {
        $defs: subIris.reduce((m, iri) => { m[iri] = {}; return m; }, {}),
    },
});

describe('@unit SchemaValidator', () => {
    it('isValid is true when no errors recorded', async () => {
        const v = new SchemaValidator('iri:a', { document: { $defs: {} } }, false);
        await v.load();
        await v.validate(new Map());
        assert.equal(v.isValid, true);
    });

    it('marks invalid when document is missing (non-template)', async () => {
        const v = new SchemaValidator('iri:missing', null, false);
        await v.validate(new Map());
        assert.equal(v.isValid, false);
        assert.equal(v.getSerializedErrors().errors.some((e) => /does not exist/.test(e)), true);
    });

    it('template + missing document is allowed (no errors)', async () => {
        const v = new SchemaValidator('iri:tpl', null, true);
        await v.validate(new Map());
        assert.equal(v.isValid, true);
    });

    it('errors when a sub-schema dependency is not in the map', async () => {
        const v = new SchemaValidator('iri:a', docWithDefs(['iri:missing']), false);
        await v.load();
        await v.validate(new Map());
        assert.equal(v.isValid, false);
        assert.match(v.getSerializedErrors().errors[0], /non-existing schema 'iri:missing'/);
    });

    it('passes when all sub-schemas in the map are valid', async () => {
        const a = new SchemaValidator('iri:a', docWithDefs(['iri:b']), false);
        const b = new SchemaValidator('iri:b', { document: { $defs: {} } }, false);
        await a.load(); await b.load();
        const map = new Map([['iri:a', a], ['iri:b', b]]);
        await a.validate(map);
        assert.equal(a.isValid, true);
    });

    it('propagates invalidity from a sub-schema', async () => {
        const a = new SchemaValidator('iri:a', docWithDefs(['iri:b']), false);
        const b = new SchemaValidator('iri:b', null, false); // invalid
        await a.load();
        const map = new Map([['iri:a', a], ['iri:b', b]]);
        await a.validate(map);
        assert.equal(a.isValid, false);
        assert.equal(
            a.getSerializedErrors().errors.some((e) => /refers to invalid schema 'iri:b'/.test(e)),
            true,
        );
    });

    it('detects circular dependency', async () => {
        const a = new SchemaValidator('iri:a', docWithDefs(['iri:b']), false);
        const b = new SchemaValidator('iri:b', docWithDefs(['iri:a']), false);
        await a.load(); await b.load();
        const map = new Map([['iri:a', a], ['iri:b', b]]);
        await a.validate(map);
        // The walker enters a, visits b, b tries to visit a (in-progress), records circular.
        const allErrors = [...a.getSerializedErrors().errors, ...b.getSerializedErrors().errors];
        assert.equal(allErrors.some((e) => /Circular dependency/.test(e)), true);
    });

    it('validate is idempotent — running twice does not duplicate errors', async () => {
        const v = new SchemaValidator('iri:missing', null, false);
        await v.validate(new Map());
        const first = v.getSerializedErrors().errors.length;
        await v.validate(new Map());
        const second = v.getSerializedErrors().errors.length;
        assert.equal(first, second);
    });

    it('getSerializedErrors returns an immutable copy (slice)', () => {
        const v = new SchemaValidator('iri:x', null, true);
        v.addError('err-1');
        const out = v.getSerializedErrors();
        out.errors.push('mutation');
        assert.equal(v.getSerializedErrors().errors.length, 1);
    });

    describe('factory methods', () => {
        it('fromTemplate creates a template SchemaValidator', () => {
            const v = SchemaValidator.fromTemplate({ name: 'iri:T', baseSchema: 'iri:base' });
            assert.equal(v.iri, 'iri:T');
        });

        it('fromSystem creates a template SchemaValidator with no document', () => {
            const v = SchemaValidator.fromSystem('iri:sys');
            assert.equal(v.iri, 'iri:sys');
        });

        it('fromSchema dispatches to fromSystem when schema.system is true', () => {
            const v = SchemaValidator.fromSchema({ iri: 'iri:s', system: true, category: null, readonly: false });
            // System schemas should be tolerant of missing documents (template behaviour).
            assert.equal(v.iri, 'iri:s');
        });

        it('fromSchema dispatches to fromSystem when schema.readonly is true', () => {
            const v = SchemaValidator.fromSchema({ iri: 'iri:r', system: false, category: null, readonly: true });
            assert.equal(v.iri, 'iri:r');
        });

        it('fromSchema dispatches to a regular SchemaValidator when not system/readonly', () => {
            const schema = { iri: 'iri:reg', system: false, category: 'POLICY', readonly: false };
            const v = SchemaValidator.fromSchema(schema);
            assert.equal(v.iri, 'iri:reg');
            assert.equal(v.getSchema(), schema);
        });
    });
});

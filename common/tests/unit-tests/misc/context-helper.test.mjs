import { assert } from 'chai';
import { ContextHelper } from '../../../dist/hedera-modules/vcjs/context-helper.js';

describe('ContextHelper.clearEmptyProperties', () => {
    it('removes top-level null and undefined keys', () => {
        const vc = { a: 1, b: null, c: undefined, d: 'x' };
        const out = ContextHelper.clearEmptyProperties(vc);
        assert.deepEqual(out, { a: 1, d: 'x' });
    });

    it('removes nested null/undefined recursively', () => {
        const vc = { a: { b: null, c: { d: undefined, e: 'x' } } };
        const out = ContextHelper.clearEmptyProperties(vc);
        assert.deepEqual(out, { a: { c: { e: 'x' } } });
    });

    it('returns null/undefined unchanged for falsy roots', () => {
        assert.equal(ContextHelper.clearEmptyProperties(null), null);
        assert.equal(ContextHelper.clearEmptyProperties(undefined), undefined);
    });

    it('returns scalar inputs unchanged', () => {
        assert.equal(ContextHelper.clearEmptyProperties('hello'), 'hello');
        assert.equal(ContextHelper.clearEmptyProperties(42), 42);
        assert.equal(ContextHelper.clearEmptyProperties(false), false);
    });

    it('descends into arrays and clears their object entries in place', () => {
        const vc = { items: [{ a: null, b: 'keep' }, { c: undefined, d: 'also' }] };
        ContextHelper.clearEmptyProperties(vc);
        assert.deepEqual(vc.items[0], { b: 'keep' });
        assert.deepEqual(vc.items[1], { d: 'also' });
    });

    it('preserves falsy non-null values: 0, "", false', () => {
        const vc = { zero: 0, empty: '', flag: false };
        const out = ContextHelper.clearEmptyProperties(vc);
        assert.deepEqual(out, { zero: 0, empty: '', flag: false });
    });
});

describe('ContextHelper.clearContext', () => {
    it('lifts @context arrays from credentialSubject up to its top-level @context', () => {
        const vc = {
            credentialSubject: {
                type: 'CustomType',
                '@context': ['https://example.org/ctx'],
                name: 'alice',
            },
        };
        ContextHelper.clearContext(vc);
        assert.deepEqual(vc.credentialSubject['@context'], ['https://example.org/ctx']);
        assert.equal(vc.credentialSubject.name, 'alice');
        // The original `type` is preserved
        assert.equal(vc.credentialSubject.type, 'CustomType');
    });

    it('strips non-recognised type fields from nested objects', () => {
        const vc = {
            credentialSubject: {
                type: 'KnownType',
                inner: {
                    type: 'NonGeoJSONUnknownType',
                    value: 1,
                },
            },
        };
        ContextHelper.clearContext(vc);
        // Top-level type is preserved
        assert.equal(vc.credentialSubject.type, 'KnownType');
        // Nested unknown type is stripped
        assert.notProperty(vc.credentialSubject.inner, 'type');
        assert.equal(vc.credentialSubject.inner.value, 1);
    });

    it('preserves nested known geo type fields like Point and Polygon', () => {
        const vc = {
            credentialSubject: {
                type: 'KnownType',
                location: { type: 'Point', coordinates: [1, 2] },
                area: { type: 'Polygon', coordinates: [] },
            },
        };
        ContextHelper.clearContext(vc);
        assert.equal(vc.credentialSubject.location.type, 'Point');
        assert.equal(vc.credentialSubject.area.type, 'Polygon');
    });

    it('handles a credentialSubject array (each element gets its own contexts)', () => {
        const vc = {
            credentialSubject: [
                {
                    type: 'A',
                    '@context': 'https://a.example/ctx',
                    name: 'alice',
                },
                {
                    type: 'B',
                    '@context': 'https://b.example/ctx',
                    name: 'bob',
                },
            ],
        };
        ContextHelper.clearContext(vc);
        assert.deepEqual(vc.credentialSubject[0]['@context'], ['https://a.example/ctx']);
        assert.deepEqual(vc.credentialSubject[1]['@context'], ['https://b.example/ctx']);
        assert.equal(vc.credentialSubject[0].type, 'A');
        assert.equal(vc.credentialSubject[1].type, 'B');
    });

    it('returns the input vc reference (mutates in place)', () => {
        const vc = { credentialSubject: { type: 'X', name: 'y' } };
        const out = ContextHelper.clearContext(vc);
        assert.strictEqual(out, vc);
    });

    it('handles a vc with no credentialSubject (no-op)', () => {
        const vc = { someOtherField: 'x' };
        ContextHelper.clearContext(vc);
        assert.equal(vc.someOtherField, 'x');
    });
});

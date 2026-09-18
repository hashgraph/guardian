import { assert } from 'chai';
import { ContextHelper } from '../../../dist/hedera-modules/vcjs/context-helper.js';

describe('ContextHelper.clearEmptyProperties', () => {
    it('removes null/undefined keys recursively', () => {
        const vc = { a: 1, b: null, c: { x: undefined, y: 2 }, d: [1, null, { z: undefined }] };
        ContextHelper.clearEmptyProperties(vc);
        assert.deepEqual(vc, { a: 1, c: { y: 2 }, d: [1, null, {}] });
    });

    it('returns input unchanged for null/undefined', () => {
        assert.equal(ContextHelper.clearEmptyProperties(null), null);
        assert.equal(ContextHelper.clearEmptyProperties(undefined), undefined);
    });

    it('returns scalar values unchanged', () => {
        assert.equal(ContextHelper.clearEmptyProperties('s'), 's');
        assert.equal(ContextHelper.clearEmptyProperties(42), 42);
    });

    it('walks arrays in place', () => {
        const arr = [{ a: 1, b: null }];
        ContextHelper.clearEmptyProperties(arr);
        assert.deepEqual(arr, [{ a: 1 }]);
    });
});

describe('ContextHelper.clearContext', () => {
    it('strips inline @context entries from a credentialSubject and lifts them to subject.@context', () => {
        const vc = {
            credentialSubject: {
                name: 'alice',
                child: { '@context': ['https://x'], v: 1 },
            },
        };
        ContextHelper.clearContext(vc);
        assert.deepEqual(vc.credentialSubject['@context'], ['https://x']);
        assert.equal(vc.credentialSubject.child['@context'], undefined);
    });

    it('preserves the credentialSubject.type when present', () => {
        const vc = {
            credentialSubject: {
                type: 'Person',
                child: { '@context': 'https://x', v: 1 },
            },
        };
        ContextHelper.clearContext(vc);
        assert.equal(vc.credentialSubject.type, 'Person');
    });

    it('handles array credentialSubject (multiple subjects)', () => {
        const vc = {
            credentialSubject: [
                { name: 'a', '@context': ['https://a'] },
                { name: 'b', '@context': ['https://b'] },
            ],
        };
        ContextHelper.clearContext(vc);
        assert.deepEqual(vc.credentialSubject[0]['@context'], ['https://a']);
        assert.deepEqual(vc.credentialSubject[1]['@context'], ['https://b']);
    });

    it('drops unrecognised type fields (not in the allow list)', () => {
        const vc = {
            credentialSubject: {
                name: 'a',
                child: { type: 'NotAllowedType', v: 1 },
            },
        };
        ContextHelper.clearContext(vc);
        assert.equal(vc.credentialSubject.child.type, undefined);
    });

    it('keeps allow-listed type values (e.g. Polygon, Point, geometry)', () => {
        const vc = {
            credentialSubject: {
                name: 'a',
                geo: { type: 'Polygon', coordinates: [] },
            },
        };
        ContextHelper.clearContext(vc);
        assert.equal(vc.credentialSubject.geo.type, 'Polygon');
    });

    it('returns the input vc unchanged when there is no credentialSubject', () => {
        const vc = { issuer: 'did:1' };
        const result = ContextHelper.clearContext(vc);
        assert.equal(result, vc);
    });
});

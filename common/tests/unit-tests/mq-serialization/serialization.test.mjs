import assert from 'node:assert/strict';
import { InboundMessageIdentityDeserializer, OutboundResponseIdentitySerializer } from '../../../dist/mq/serialization.js';

describe('@unit InboundMessageIdentityDeserializer', () => {
    const d = new InboundMessageIdentityDeserializer();

    it('returns the input value verbatim', () => {
        const input = { pattern: 'X', data: { foo: 1 } };
        const out = d.deserialize(input);
        assert.strictEqual(out, input);
    });

    it('handles null without throwing', () => {
        assert.equal(d.deserialize(null), null);
    });

    it('handles undefined without throwing', () => {
        assert.equal(d.deserialize(undefined), undefined);
    });

    it('ignores the options argument (identity contract)', () => {
        const input = { x: 1 };
        const out = d.deserialize(input, { ignored: true });
        assert.strictEqual(out, input);
    });
});

describe('@unit OutboundResponseIdentitySerializer', () => {
    const s = new OutboundResponseIdentitySerializer();

    it('returns value.data — strips NestJS envelope', () => {
        const out = s.serialize({ data: { payload: 'hello' }, id: 'req-1' });
        assert.deepEqual(out, { payload: 'hello' });
    });

    it('returns undefined when value has no data field', () => {
        assert.equal(s.serialize({ id: 'r-1' }), undefined);
    });

    it('does not throw on null/undefined-ish data', () => {
        assert.equal(s.serialize({ data: null }), null);
        assert.equal(s.serialize({ data: undefined }), undefined);
    });

    it('passes through complex shapes', () => {
        const data = { arr: [1, 2, 3], nested: { ok: true } };
        const out = s.serialize({ data });
        assert.strictEqual(out, data);
    });
});

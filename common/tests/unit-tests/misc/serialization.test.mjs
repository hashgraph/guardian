import { assert } from 'chai';
import {
    InboundMessageIdentityDeserializer,
    OutboundResponseIdentitySerializer,
} from '../../../dist/mq/serialization.js';

describe('InboundMessageIdentityDeserializer', () => {
    it('returns the input value unchanged (identity)', () => {
        const d = new InboundMessageIdentityDeserializer();
        const value = { pattern: 'PING', data: { hello: 'world' }, id: 'req-1' };
        assert.strictEqual(d.deserialize(value), value);
    });

    it('passes through primitives and arrays', () => {
        const d = new InboundMessageIdentityDeserializer();
        assert.equal(d.deserialize(42), 42);
        assert.equal(d.deserialize('s'), 's');
        const arr = [1, 2, 3];
        assert.strictEqual(d.deserialize(arr), arr);
    });

    it('ignores the optional options arg', () => {
        const d = new InboundMessageIdentityDeserializer();
        const value = { x: 1 };
        assert.strictEqual(d.deserialize(value, { irrelevant: true }), value);
    });
});

describe('OutboundResponseIdentitySerializer', () => {
    it('extracts and returns value.data', () => {
        const s = new OutboundResponseIdentitySerializer();
        const wrapped = { data: { foo: 'bar' }, id: 'res-1' };
        assert.deepEqual(s.serialize(wrapped), { foo: 'bar' });
    });

    it('returns undefined when data is missing', () => {
        const s = new OutboundResponseIdentitySerializer();
        assert.equal(s.serialize({ id: 'x' }), undefined);
    });

    it('returns null when data is explicitly null', () => {
        const s = new OutboundResponseIdentitySerializer();
        assert.isNull(s.serialize({ data: null }));
    });
});

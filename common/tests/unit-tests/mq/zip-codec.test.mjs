import { assert } from 'chai';
import { ZipCodec } from '../../../dist/mq/zip-codec.js';

describe('ZipCodec', () => {
    let savedMaxPayload;
    let codec;

    before(() => {
        savedMaxPayload = process.env.MQ_MAX_PAYLOAD;
        delete process.env.MQ_MAX_PAYLOAD;
        codec = ZipCodec();
    });

    after(() => {
        if (savedMaxPayload !== undefined) {
            process.env.MQ_MAX_PAYLOAD = savedMaxPayload;
        }
    });

    it('encodes an object to bytes', async () => {
        const encoded = await codec.encode({ a: 1 });
        assert.instanceOf(encoded, Uint8Array);
        assert.isAbove(encoded.length, 0);
    });

    it('round-trips a flat object', async () => {
        const decoded = await codec.decode(await codec.encode({ a: 1, b: 'x' }));
        assert.deepEqual(decoded, { a: 1, b: 'x' });
    });

    it('round-trips nested structures', async () => {
        const payload = { list: [1, 2, { deep: true }], meta: { tags: ['a', 'b'] } };
        const decoded = await codec.decode(await codec.encode(payload));
        assert.deepEqual(decoded, payload);
    });

    it('encodes undefined as null', async () => {
        const decoded = await codec.decode(await codec.encode(undefined));
        assert.isNull(decoded);
    });

    it('round-trips null', async () => {
        const decoded = await codec.decode(await codec.encode(null));
        assert.isNull(decoded);
    });

    it('round-trips unicode strings', async () => {
        const decoded = await codec.decode(await codec.encode({ s: 'привіт 🌍' }));
        assert.deepEqual(decoded, { s: 'привіт 🌍' });
    });

    it('keeps the payload inline when MQ_MAX_PAYLOAD is large', async () => {
        process.env.MQ_MAX_PAYLOAD = '99999999';
        try {
            const decoded = await codec.decode(await codec.encode({ inline: true }));
            assert.deepEqual(decoded, { inline: true });
        } finally {
            delete process.env.MQ_MAX_PAYLOAD;
        }
    });

    it('rejects when decoding malformed bytes', async () => {
        try {
            await codec.decode(Uint8Array.from([0x7b, 0x22]));
            assert.fail('expected rejection');
        } catch (error) {
            assert.exists(error);
        }
    });
});

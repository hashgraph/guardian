import { assert } from 'chai';
import esmock from 'esmock';
import { JSONCodec } from 'nats';

let addObjectCalls;
let lastAddedBuffer;
const FAKE_DIRECT_LINK = 'http://fake-host:50001/object-id';

class FakeLargePayloadContainer {
    addObject(o) {
        addObjectCalls.push(o);
        lastAddedBuffer = o;
        return new URL(FAKE_DIRECT_LINK);
    }
}

let axiosGetCalls;
let axiosResponseFactory;
const fakeAxios = {
    defaults: {},
    async get(url, options) {
        axiosGetCalls.push({ url, options });
        return axiosResponseFactory(url, options);
    }
};

const { ZipCodec } = await esmock.strict('../../../dist/mq/zip-codec.js', {
    '../../../dist/mq/large-payload-container.js': { LargePayloadContainer: FakeLargePayloadContainer },
    axios: { default: fakeAxios }
});

describe('@unit ZipCodec routing (large-payload / payload-cap)', () => {
    let savedMaxPayload;
    let savedTlsCert;
    let savedTlsKey;
    let savedTlsCa;
    let codec;

    beforeEach(() => {
        savedMaxPayload = process.env.MQ_MAX_PAYLOAD;
        savedTlsCert = process.env.TLS_CERT;
        savedTlsKey = process.env.TLS_KEY;
        savedTlsCa = process.env.TLS_CA;
        delete process.env.MQ_MAX_PAYLOAD;
        delete process.env.TLS_CERT;
        delete process.env.TLS_KEY;
        delete process.env.TLS_CA;

        addObjectCalls = [];
        lastAddedBuffer = undefined;
        axiosGetCalls = [];
        axiosResponseFactory = () => ({ data: Buffer.from(JSON.stringify({ ok: true })) });
        fakeAxios.defaults = {};

        codec = ZipCodec();
    });

    afterEach(() => {
        const restore = (key, value) => {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        };
        restore('MQ_MAX_PAYLOAD', savedMaxPayload);
        restore('TLS_CERT', savedTlsCert);
        restore('TLS_KEY', savedTlsKey);
        restore('TLS_CA', savedTlsCa);
    });

    const headerReserved = 32 * 1024;

    describe('encode inline path', () => {
        it('returns raw zipped bytes when MQ_MAX_PAYLOAD is unset', async () => {
            const out = await codec.encode({ a: 1 });
            assert.instanceOf(out, Uint8Array);
            assert.lengthOf(addObjectCalls, 0);
            assert.deepEqual(JSONCodec().decode(out), { a: 1 });
        });

        it('returns raw zipped bytes when MQ_MAX_PAYLOAD is not an integer', async () => {
            process.env.MQ_MAX_PAYLOAD = 'not-a-number';
            const out = await codec.encode({ a: 1 });
            assert.instanceOf(out, Uint8Array);
            assert.lengthOf(addObjectCalls, 0);
            assert.deepEqual(JSONCodec().decode(out), { a: 1 });
        });

        it('returns raw zipped bytes when MQ_MAX_PAYLOAD is empty string', async () => {
            process.env.MQ_MAX_PAYLOAD = '';
            const out = await codec.encode({ a: 1 });
            assert.instanceOf(out, Uint8Array);
            assert.lengthOf(addObjectCalls, 0);
        });

        it('returns raw zipped bytes when MQ_MAX_PAYLOAD is larger than payload + reserve', async () => {
            process.env.MQ_MAX_PAYLOAD = '99999999';
            const out = await codec.encode({ inline: true });
            assert.instanceOf(out, Uint8Array);
            assert.lengthOf(addObjectCalls, 0);
            assert.deepEqual(JSONCodec().decode(out), { inline: true });
        });

        it('round-trips an inline-encoded plain object through decode', async () => {
            process.env.MQ_MAX_PAYLOAD = '99999999';
            const encoded = await codec.encode({ a: 1, b: 'x' });
            const decoded = await codec.decode(encoded);
            assert.deepEqual(decoded, { a: 1, b: 'x' });
            assert.lengthOf(axiosGetCalls, 0);
        });

        it('parseInt parses a leading-integer string (e.g. "100abc") and may route', async () => {
            process.env.MQ_MAX_PAYLOAD = '100abc';
            const out = await codec.encode({ a: 1 });
            // parseInt('100abc') === 100 which is an integer and small -> routes
            assert.instanceOf(out, Uint8Array);
            assert.lengthOf(addObjectCalls, 1);
            assert.property(JSONCodec().decode(out), 'directLink');
        });
    });

    describe('encode routing path', () => {
        it('routes through LargePayloadContainer when MQ_MAX_PAYLOAD trips the cap', async () => {
            process.env.MQ_MAX_PAYLOAD = '1';
            const out = await codec.encode({ a: 1 });
            assert.lengthOf(addObjectCalls, 1);
            const decoded = JSONCodec().decode(out);
            assert.property(decoded, 'directLink');
            assert.equal(decoded.directLink, FAKE_DIRECT_LINK);
        });

        it('passes the zipped buffer to addObject', async () => {
            process.env.MQ_MAX_PAYLOAD = '1';
            const payload = { a: 1, b: 'hello' };
            await codec.encode(payload);
            assert.lengthOf(addObjectCalls, 1);
            assert.instanceOf(lastAddedBuffer, Buffer);
            assert.deepEqual(JSONCodec().decode(lastAddedBuffer), payload);
        });

        it('routes at the exact boundary maxPayload === zipped.length + headerReserved', async () => {
            const payload = { a: 1 };
            const zipped = JSONCodec().encode(payload);
            process.env.MQ_MAX_PAYLOAD = String(zipped.length + headerReserved);
            await codec.encode(payload);
            assert.lengthOf(addObjectCalls, 1);
        });

        it('stays inline one byte above the boundary (maxPayload === len + reserve + 1)', async () => {
            const payload = { a: 1 };
            const zipped = JSONCodec().encode(payload);
            process.env.MQ_MAX_PAYLOAD = String(zipped.length + headerReserved + 1);
            const out = await codec.encode(payload);
            assert.lengthOf(addObjectCalls, 0);
            assert.deepEqual(JSONCodec().decode(out), payload);
        });

        it('routes one byte below the boundary (maxPayload === len + reserve - 1)', async () => {
            const payload = { a: 1 };
            const zipped = JSONCodec().encode(payload);
            process.env.MQ_MAX_PAYLOAD = String(zipped.length + headerReserved - 1);
            await codec.encode(payload);
            assert.lengthOf(addObjectCalls, 1);
        });

        it('routes undefined (encoded as null) when the cap is tripped', async () => {
            process.env.MQ_MAX_PAYLOAD = '1';
            const out = await codec.encode(undefined);
            assert.lengthOf(addObjectCalls, 1);
            assert.deepEqual(JSONCodec().decode(lastAddedBuffer), null);
            assert.property(JSONCodec().decode(out), 'directLink');
        });

        it('routes null when the cap is tripped', async () => {
            process.env.MQ_MAX_PAYLOAD = '1';
            await codec.encode(null);
            assert.lengthOf(addObjectCalls, 1);
            assert.deepEqual(JSONCodec().decode(lastAddedBuffer), null);
        });

        it('encodes the envelope as JSON bytes (not the raw zipped payload)', async () => {
            process.env.MQ_MAX_PAYLOAD = '1';
            const out = await codec.encode({ big: 'x'.repeat(100) });
            const decoded = JSONCodec().decode(out);
            assert.hasAllKeys(decoded, ['directLink']);
        });
    });

    describe('decode directLink envelope', () => {
        it('calls axios.get with the directLink and arraybuffer responseType', async () => {
            const envelope = JSONCodec().encode({ directLink: FAKE_DIRECT_LINK });
            const result = await codec.decode(envelope);
            assert.lengthOf(axiosGetCalls, 1);
            assert.equal(axiosGetCalls[0].url, FAKE_DIRECT_LINK);
            assert.deepEqual(axiosGetCalls[0].options, { responseType: 'arraybuffer' });
            assert.deepEqual(result, { ok: true });
        });

        it('returns the JSON-parsed inner object from the fetched buffer', async () => {
            const inner = { nested: { x: [1, 2, 3] }, flag: false };
            axiosResponseFactory = () => ({ data: Buffer.from(JSON.stringify(inner)) });
            const envelope = JSONCodec().encode({ directLink: FAKE_DIRECT_LINK });
            const result = await codec.decode(envelope);
            assert.deepEqual(result, inner);
        });

        it('round-trips a routed payload (encode routing -> decode via axios)', async () => {
            process.env.MQ_MAX_PAYLOAD = '1';
            const payload = { a: 1, b: 'round' };
            const encoded = await codec.encode(payload);
            axiosResponseFactory = () => ({ data: Buffer.from(lastAddedBuffer) });
            const decoded = await codec.decode(encoded);
            assert.deepEqual(decoded, payload);
            assert.lengthOf(axiosGetCalls, 1);
        });

        it('does not set httpsAgent when TLS env vars are absent', async () => {
            const envelope = JSONCodec().encode({ directLink: FAKE_DIRECT_LINK });
            await codec.decode(envelope);
            assert.notProperty(fakeAxios.defaults, 'httpsAgent');
        });

        it('sets axios.defaults.httpsAgent when TLS_CERT and TLS_KEY are present', async () => {
            process.env.TLS_CERT = 'cert-pem';
            process.env.TLS_KEY = 'key-pem';
            process.env.TLS_CA = 'ca-pem';
            const envelope = JSONCodec().encode({ directLink: FAKE_DIRECT_LINK });
            await codec.decode(envelope);
            assert.property(fakeAxios.defaults, 'httpsAgent');
            assert.exists(fakeAxios.defaults.httpsAgent);
        });

        it('does not set httpsAgent when only TLS_CERT is present', async () => {
            process.env.TLS_CERT = 'cert-pem';
            const envelope = JSONCodec().encode({ directLink: FAKE_DIRECT_LINK });
            await codec.decode(envelope);
            assert.notProperty(fakeAxios.defaults, 'httpsAgent');
        });

        it('does not set httpsAgent when only TLS_KEY is present', async () => {
            process.env.TLS_KEY = 'key-pem';
            const envelope = JSONCodec().encode({ directLink: FAKE_DIRECT_LINK });
            await codec.decode(envelope);
            assert.notProperty(fakeAxios.defaults, 'httpsAgent');
        });
    });

    describe('decode pass-through (non-directLink)', () => {
        it('returns a plain object without touching axios', async () => {
            const encoded = JSONCodec().encode({ a: 1, b: 'x' });
            const decoded = await codec.decode(encoded);
            assert.deepEqual(decoded, { a: 1, b: 'x' });
            assert.lengthOf(axiosGetCalls, 0);
        });

        it('returns null when the encoded value is null', async () => {
            const encoded = JSONCodec().encode(null);
            const decoded = await codec.decode(encoded);
            assert.isNull(decoded);
            assert.lengthOf(axiosGetCalls, 0);
        });

        it('returns an array as-is (no directLink property)', async () => {
            const encoded = JSONCodec().encode([1, 2, 3]);
            const decoded = await codec.decode(encoded);
            assert.deepEqual(decoded, [1, 2, 3]);
            assert.lengthOf(axiosGetCalls, 0);
        });
    });

    describe('error handling', () => {
        it('decode of malformed JSON bytes throws a BadJson NatsError', async () => {
            try {
                await codec.decode(Uint8Array.from([0x7b, 0x22]));
                assert.fail('expected rejection');
            } catch (error) {
                assert.equal(error.name, 'NatsError');
                assert.equal(error.code, 'BAD_JSON');
            }
        });

        it('decode throws BadJson when the fetched directLink body is not valid JSON', async () => {
            axiosResponseFactory = () => ({ data: Buffer.from('not-json') });
            const envelope = JSONCodec().encode({ directLink: FAKE_DIRECT_LINK });
            try {
                await codec.decode(envelope);
                assert.fail('expected rejection');
            } catch (error) {
                assert.equal(error.name, 'NatsError');
                assert.equal(error.code, 'BAD_JSON');
            }
        });

        it('decode throws BadJson when axios.get rejects', async () => {
            axiosResponseFactory = () => { throw new Error('network down'); };
            const envelope = JSONCodec().encode({ directLink: FAKE_DIRECT_LINK });
            try {
                await codec.decode(envelope);
                assert.fail('expected rejection');
            } catch (error) {
                assert.equal(error.name, 'NatsError');
                assert.equal(error.code, 'BAD_JSON');
            }
        });

        it('encode throws BadJson when the value is not JSON-encodable (circular)', async () => {
            const circular = {};
            circular.self = circular;
            try {
                await codec.encode(circular);
                assert.fail('expected rejection');
            } catch (error) {
                assert.equal(error.name, 'NatsError');
                assert.equal(error.code, 'BAD_JSON');
            }
        });
    });
});

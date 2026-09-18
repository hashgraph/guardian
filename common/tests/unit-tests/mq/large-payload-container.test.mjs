import { assert } from 'chai';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

process.env.DIRECT_MESSAGE_PORT = '51234';
process.env.DIRECT_MESSAGE_HOST = 'payload-host';
delete process.env.DIRECT_MESSAGE_PROTOCOL;
delete process.env.TLS_SERVER_CERT;
delete process.env.TLS_SERVER_KEY;

const { LargePayloadContainer } = await import('../../../dist/mq/large-payload-container.js');

describe('LargePayloadContainer', () => {
    it('is not started before runServer', () => {
        assert.isFalse(new LargePayloadContainer().started);
    });

    it('disables TLS when no server cert is configured', () => {
        assert.isFalse(new LargePayloadContainer().enableTLS);
    });

    it('behaves as a singleton', () => {
        assert.strictEqual(new LargePayloadContainer(), new LargePayloadContainer());
    });

    it('addObject returns an http url on the configured host and port', () => {
        const url = new LargePayloadContainer().addObject(Buffer.from('payload'));
        assert.instanceOf(url, URL);
        assert.equal(url.protocol, 'http:');
        assert.equal(url.hostname, 'payload-host');
        assert.equal(url.port, '51234');
    });

    it('addObject uses a uuid as the object path', () => {
        const url = new LargePayloadContainer().addObject(Buffer.from('payload'));
        assert.match(url.pathname.slice(1), UUID_RE);
    });

    it('addObject generates a distinct url per object', () => {
        const container = new LargePayloadContainer();
        const first = container.addObject(Buffer.from('a'));
        const second = container.addObject(Buffer.from('b'));
        assert.notEqual(first.href, second.href);
    });

    it('accepts Uint8Array payloads', () => {
        const url = new LargePayloadContainer().addObject(Uint8Array.from([1, 2, 3]));
        assert.instanceOf(url, URL);
    });
});

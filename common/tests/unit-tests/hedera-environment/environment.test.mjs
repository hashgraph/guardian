import { assert } from 'chai';
import { Environment } from '../../../dist/hedera-modules/environment.js';

describe('common Environment.setNetwork', () => {
    it('configures testnet endpoints', () => {
        Environment.setMirrorNodes([]);
        Environment.setNetwork('testnet');
        assert.equal(Environment.network, 'testnet');
        assert.match(Environment.HEDERA_MESSAGE_API, /testnet\.mirrornode\.hedera\.com/);
        assert.match(Environment.HEDERA_ACCOUNT_API, /testnet/);
    });

    it('configures mainnet endpoints', () => {
        Environment.setMirrorNodes([]);
        Environment.setNetwork('mainnet');
        assert.equal(Environment.network, 'mainnet');
        assert.match(Environment.HEDERA_MESSAGE_API, /mainnet\.mirrornode\.hedera\.com/);
    });

    it('configures previewnet endpoints', () => {
        Environment.setMirrorNodes([]);
        Environment.setNetwork('previewnet');
        assert.match(Environment.HEDERA_MESSAGE_API, /preview\.mirrornode\.hedera\.com/);
    });

    it('configures localnode endpoints', () => {
        Environment.setMirrorNodes([]);
        Environment.setNetwork('localnode');
        assert.equal(Environment.network, 'localnode');
        assert.match(Environment.HEDERA_MESSAGE_API, /localhost.*topics\/messages/);
    });

    it('throws on unknown network', () => {
        assert.throws(() => Environment.setNetwork('mystery'), /Unknown network/);
    });

    it('overrides API URLs when mirror nodes are configured', () => {
        Environment.setMirrorNodes(['https://my-mirror.example']);
        Environment.setNetwork('testnet');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'https://my-mirror.example/api/v1/topics/messages');
        assert.equal(Environment.HEDERA_TOPIC_API, 'https://my-mirror.example/api/v1/topics');
        Environment.setMirrorNodes([]);
    });

    it('prepends https:// to mirror nodes that lack a scheme', () => {
        Environment.setMirrorNodes(['my-mirror.example']);
        Environment.setNetwork('testnet');
        assert.match(Environment.HEDERA_MESSAGE_API, /^https:\/\/my-mirror\.example/);
        Environment.setMirrorNodes([]);
    });
});

describe('common Environment.setLocalNodeAddress / setLocalNodeProtocol', () => {
    it('rebuilds localnode URLs with the supplied address', () => {
        Environment.setLocalNodeProtocol('http');
        Environment.setLocalNodeAddress('1.2.3.4');
        Environment.setMirrorNodes([]);
        Environment.setNetwork('localnode');
        assert.equal(Environment.localNodeAddress, '1.2.3.4');
        assert.match(Environment.HEDERA_MESSAGE_API, /1\.2\.3\.4:5551/);
    });

    it("falls back to 'localhost' when no address is supplied", () => {
        Environment.setLocalNodeAddress(undefined);
        Environment.setNetwork('localnode');
        assert.equal(Environment.localNodeAddress, 'localhost');
    });
});

describe('common Environment.nodes / mirrorNodes accessors', () => {
    it('round-trips nodes and mirrorNodes via setters', () => {
        Environment.setNodes({ foo: '0.0.3' });
        Environment.setMirrorNodes(['m1.example']);
        assert.deepEqual(Environment.nodes, { foo: '0.0.3' });
        assert.deepEqual(Environment.mirrorNodes, ['m1.example']);
        Environment.setNodes({});
        Environment.setMirrorNodes([]);
    });
});

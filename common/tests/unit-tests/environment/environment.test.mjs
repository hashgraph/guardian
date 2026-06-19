import assert from 'node:assert/strict';
import { Environment } from '../../../dist/hedera-modules/environment.js';

// Mutable singleton — restore between tests.
const reset = () => {
    Environment.setMirrorNodes([]);
    Environment.setNodes({});
    Environment.setLocalNodeAddress('localhost');
    Environment.setLocalNodeProtocol('http');
    Environment.setNetwork('testnet');
};

describe('Environment URL constants', () => {
    afterEach(reset);

    it('exposes the documented mainnet/testnet/preview base APIs via the live getters', () => {
        Environment.setNetwork('mainnet');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'https://mainnet.mirrornode.hedera.com/api/v1/topics/messages');
        Environment.setNetwork('testnet');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'https://testnet.mirrornode.hedera.com/api/v1/topics/messages');
        Environment.setNetwork('previewnet');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'https://preview.mirrornode.hedera.com/api/v1/topics/messages');
    });

    it('builds the message/topic/account URLs as `${BASE}/topics/messages` and friends', () => {
        Environment.setNetwork('mainnet');
        assert.equal(
            Environment.HEDERA_MESSAGE_API,
            'https://mainnet.mirrornode.hedera.com/api/v1/topics/messages'
        );
        Environment.setNetwork('testnet');
        assert.equal(
            Environment.HEDERA_TOPIC_API,
            'https://testnet.mirrornode.hedera.com/api/v1/topics'
        );
        Environment.setNetwork('previewnet');
        assert.equal(
            Environment.HEDERA_ACCOUNT_API,
            'https://preview.mirrornode.hedera.com/api/v1/accounts'
        );
    });
});

describe('Environment.setNetwork', () => {
    afterEach(reset);

    it('routes the live API getters to the mainnet endpoints', () => {
        Environment.setNetwork('mainnet');
        assert.equal(Environment.network, 'mainnet');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'https://mainnet.mirrornode.hedera.com/api/v1/topics/messages');
        assert.equal(Environment.HEDERA_TOPIC_API, 'https://mainnet.mirrornode.hedera.com/api/v1/topics');
        assert.equal(Environment.HEDERA_ACCOUNT_API, 'https://mainnet.mirrornode.hedera.com/api/v1/accounts');
        assert.equal(Environment.HEDERA_TOKENS_API, 'https://mainnet.mirrornode.hedera.com/api/v1/tokens');
    });

    it('routes the live API getters to the testnet endpoints', () => {
        Environment.setNetwork('testnet');
        assert.equal(Environment.network, 'testnet');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'https://testnet.mirrornode.hedera.com/api/v1/topics/messages');
    });

    it('routes the live API getters to the previewnet endpoints', () => {
        Environment.setNetwork('previewnet');
        assert.equal(Environment.network, 'previewnet');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'https://preview.mirrornode.hedera.com/api/v1/topics/messages');
    });

    it('routes the live API getters to the localnode endpoints', () => {
        Environment.setNetwork('localnode');
        assert.equal(Environment.network, 'localnode');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'http://localhost:5551/api/v1/topics/messages');
    });

    it('throws for an unknown network', () => {
        assert.throws(() => Environment.setNetwork('moonnet'), /Unknown network/);
    });

    it('overrides API URLs to the configured mirror node when set', () => {
        Environment.setMirrorNodes(['https://custom-mirror.example.com']);
        Environment.setNetwork('testnet');
        assert.equal(
            Environment.HEDERA_MESSAGE_API,
            'https://custom-mirror.example.com/api/v1/topics/messages'
        );
        assert.equal(
            Environment.HEDERA_TOPIC_API,
            'https://custom-mirror.example.com/api/v1/topics'
        );
    });

    it('prepends https:// to mirror node URLs that lack a scheme', () => {
        Environment.setMirrorNodes(['custom-mirror.example.com']);
        Environment.setNetwork('testnet');
        assert.equal(
            Environment.HEDERA_MESSAGE_API,
            'https://custom-mirror.example.com/api/v1/topics/messages'
        );
    });
});

describe('Environment.setLocalNodeAddress / setLocalNodeProtocol', () => {
    afterEach(reset);

    it('rebuilds the localnode URLs with the supplied address', () => {
        Environment.setLocalNodeAddress('hedera.local');
        Environment.setNetwork('localnode');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'http://hedera.local:5551/api/v1/topics/messages');
    });

    it("falls back to 'localhost' when no address is supplied", () => {
        Environment.setLocalNodeAddress(null);
        Environment.setNetwork('localnode');
        assert.equal(Environment.localNodeAddress, 'localhost');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'http://localhost:5551/api/v1/topics/messages');
    });

    it('the localnode protocol is read back via the getter', () => {
        Environment.setLocalNodeProtocol('https');
        assert.equal(Environment.localNodeProtocol, 'https');
    });

    it('subsequent setLocalNodeAddress() uses the updated protocol', () => {
        Environment.setLocalNodeProtocol('https');
        Environment.setLocalNodeAddress('hedera.local');
        Environment.setNetwork('localnode');
        assert.equal(Environment.HEDERA_MESSAGE_API, 'https://hedera.local:5551/api/v1/topics/messages');
    });
});

describe('Environment.nodes / mirrorNodes accessors', () => {
    afterEach(reset);

    it('round-trips nodes via setNodes/getter', () => {
        const nodes = { 'hedera.local:50211': '0.0.3' };
        Environment.setNodes(nodes);
        assert.deepEqual(Environment.nodes, nodes);
    });

    it('round-trips mirrorNodes via setMirrorNodes/getter', () => {
        const list = ['https://mirror-1', 'https://mirror-2'];
        Environment.setMirrorNodes(list);
        assert.deepEqual(Environment.mirrorNodes, list);
    });
});

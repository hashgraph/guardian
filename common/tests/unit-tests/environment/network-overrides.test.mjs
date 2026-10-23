import assert from 'node:assert/strict';
import { Environment } from '../../../dist/hedera-modules/environment.js';
import { applyNetworkOverrides } from '../../../dist/helpers/network-overrides.js';

const reset = () => {
    Environment.setMirrorNodes([]);
    Environment.setMirrorNodesBaseApi('/api/v1');
    Environment.setNodes({});
    Environment.setLocalNodeAddress('localhost');
    Environment.setLocalNodeProtocol('http');
    Environment.setNetwork('testnet');
};

const soloEnv = {
    OVERRIDE_NETWORK_CONFIGURATION: 'true',
    OVERRIDE_HEDERA_CONSENSUS_NODES: '{"127.0.0.1:35211":"0.0.3"}',
    OVERRIDE_HEDERA_MIRROR_NODES: '["http://127.0.0.1:38081"]',
};

describe('applyNetworkOverrides', () => {
    afterEach(reset);

    it('changes nothing when the override flag is not "true"', async () => {
        await applyNetworkOverrides({ ...soloEnv, OVERRIDE_NETWORK_CONFIGURATION: 'false' }, () => {
            assert.fail('warn must not be called');
        });
        assert.deepEqual(Environment.nodes, {});
        assert.deepEqual(Environment.mirrorNodes, []);
    });

    it('applies consensus and mirror nodes so the topic API points at the mirror', async () => {
        await applyNetworkOverrides(soloEnv, () => {
            assert.fail('warn must not be called');
        });
        Environment.setNetwork('localnode');
        assert.deepEqual(Environment.nodes, { '127.0.0.1:35211': '0.0.3' });
        assert.deepEqual(Environment.mirrorNodes, ['http://127.0.0.1:38081']);
        assert.equal(Environment.HEDERA_TOPIC_API, 'http://127.0.0.1:38081/api/v1/topics');
    });

    it('honours a custom mirror base API', async () => {
        await applyNetworkOverrides(
            { ...soloEnv, OVERRIDE_HEDERA_MIRROR_NODES_BASE_API: 'custom/v2/' },
            () => {}
        );
        Environment.setNetwork('localnode');
        assert.equal(Environment.HEDERA_TOPIC_API, 'http://127.0.0.1:38081/custom/v2/topics');
    });

    it('reports invalid JSON through warn and still applies the other variables', async () => {
        const warned = [];
        await applyNetworkOverrides(
            { ...soloEnv, OVERRIDE_HEDERA_CONSENSUS_NODES: '{not json' },
            async (variableName, error) => {
                warned.push({ variableName, error });
            }
        );
        Environment.setNetwork('localnode');
        assert.equal(warned.length, 1);
        assert.equal(warned[0].variableName, 'OVERRIDE_HEDERA_CONSENSUS_NODES');
        assert.ok(warned[0].error instanceof Error);
        assert.deepEqual(Environment.nodes, {});
        assert.equal(Environment.HEDERA_TOPIC_API, 'http://127.0.0.1:38081/api/v1/topics');
    });
});

import assert from 'node:assert/strict';
import { HederaSDKHelper } from '../dist/api/helpers/hedera-sdk-helper.js';

describe('HederaSDKHelper dry-run submitMessage', () => {
    const networkOptions = {
        network: 'testnet',
        nodes: {},
        mirrorNodes: [],
        mirrorNodesBaseApi: '',
        localNodeAddress: '',
        localNodeProtocol: '',
    };

    it('returns a message id that carries the current consensus time', async () => {
        const helper = new HederaSDKHelper(null, null, 'dry-run-id', null, networkOptions);
        const before = Date.now();

        const id = await helper.submitMessage('0.0.1234', 'message', null);

        const [seconds, nanos] = id.split('.');
        assert.match(nanos, /^\d{9}$/);
        const time = Number(seconds) * 1000 + Math.floor(Number(nanos) / 1e6);
        assert.ok(
            Math.abs(time - before) < 60000,
            `expected the dry-run id ${id} to be within 60 s of now`
        );
    });
});

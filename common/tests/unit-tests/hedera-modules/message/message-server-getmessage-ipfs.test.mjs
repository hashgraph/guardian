import assert from 'node:assert/strict';
import { MessageServer } from '../../../../dist/hedera-modules/message/message-server.js';
import { MessageIpfsError } from '../../../../dist/hedera-modules/message/message-load.error.js';

// getMessage() must distinguish a missing header (returns null) from a found
// header whose IPFS documents fail to load (throws MessageIpfsError). Driven via
// .call() on a minimal stub so no real MessageServer / Hedera creds are needed.

function fakeThis(overrides) {
    return {
        dryRun: false,
        getTopicMessage: async () => ({ type: 'InstancePolicy', document: {} }),
        loadIPFS: async (m) => m,
        ...overrides
    };
}

const invoke = (self, options) => MessageServer.prototype.getMessage.call(self, options);

describe('@unit MessageServer.getMessage() IPFS failure handling', () => {
    it('throws MessageIpfsError(422) when the header loads but IPFS load fails', async () => {
        const self = fakeThis({ loadIPFS: async () => { throw new Error('gateway timeout'); } });
        await assert.rejects(invoke(self, { messageId: '1.2.3', loadIPFS: true }), (e) => {
            assert.ok(e instanceof MessageIpfsError);
            assert.equal(e.code, 422);
            assert.equal(e.messageId, '1.2.3');
            return true;
        });
    });

    it('returns null (not a throw) for a non-IPFS failure', async () => {
        const self = fakeThis({ getTopicMessage: async () => { throw new Error('topic lookup failed'); } });
        assert.equal(await invoke(self, { messageId: '1.2.3', loadIPFS: true }), null);
    });

    it('does not run the IPFS step when loadIPFS is false', async () => {
        let called = false;
        const self = fakeThis({ loadIPFS: async () => { called = true; throw new Error('x'); } });
        const result = await invoke(self, { messageId: '1.2.3', loadIPFS: false });
        assert.equal(called, false);
        assert.deepEqual(result, { type: 'InstancePolicy', document: {} });
    });

    it('returns the loaded message on success', async () => {
        const loaded = { type: 'InstancePolicy', document: { ok: true } };
        const self = fakeThis({ loadIPFS: async () => loaded });
        assert.equal(await invoke(self, { messageId: '1.2.3', loadIPFS: true }), loaded);
    });
});

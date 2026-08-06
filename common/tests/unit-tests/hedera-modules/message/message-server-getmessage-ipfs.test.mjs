import assert from 'node:assert/strict';
import { MessageServer } from '../../../../dist/hedera-modules/message/message-server.js';
import { MessageIpfsError, MessageNotFoundError } from '../../../../dist/hedera-modules/message/message-load.error.js';

// getMessage() must distinguish a message that cannot be retrieved from Hedera
// (throws MessageNotFoundError) from one whose header loads but whose IPFS
// documents fail (throws MessageIpfsError). Driven via .call() on a minimal stub
// so no real MessageServer / Hedera creds are needed.

function fakeThis(overrides) {
    return {
        dryRun: false,
        // tryGetMessage() delegates to getMessage() through `this`.
        getMessage: MessageServer.prototype.getMessage,
        getTopicMessage: async () => ({ type: 'InstancePolicy', document: {} }),
        loadIPFS: async (m) => m,
        ...overrides
    };
}

const invoke = (self, options) => MessageServer.prototype.getMessage.call(self, options);
const invokeTry = (self, options) => MessageServer.prototype.tryGetMessage.call(self, options);

describe('@unit MessageServer.getMessage() load failure handling', () => {
    it('throws MessageIpfsError(422) when the header loads but IPFS load fails', async () => {
        const self = fakeThis({ loadIPFS: async () => { throw new Error('gateway timeout'); } });
        await assert.rejects(invoke(self, { messageId: '1.2.3', loadIPFS: true }), (e) => {
            assert.ok(e instanceof MessageIpfsError);
            assert.equal(e.code, 422);
            assert.equal(e.messageId, '1.2.3');
            return true;
        });
    });

    it('throws MessageNotFoundError(404), with the trimmed id, when the message cannot be retrieved', async () => {
        const self = fakeThis({ getTopicMessage: async () => { throw new Error('topic lookup failed'); } });
        await assert.rejects(invoke(self, { messageId: ' 1.2.3 ', loadIPFS: true }), (e) => {
            assert.ok(e instanceof MessageNotFoundError);
            assert.equal(e.code, 404);
            assert.equal(e.messageId, '1.2.3');
            assert.match(e.message, /1\.2\.3/);
            return true;
        });
    });

    it('throws MessageNotFoundError for an empty message id, without a lookup', async () => {
        let called = false;
        const self = fakeThis({ getTopicMessage: async () => { called = true; } });
        await assert.rejects(invoke(self, { messageId: '  ', loadIPFS: true }), MessageNotFoundError);
        assert.equal(called, false);
    });

    it('tryGetMessage() returns null instead of throwing', async () => {
        const notFound = fakeThis({ getTopicMessage: async () => { throw new Error('topic lookup failed'); } });
        const noIpfs = fakeThis({ loadIPFS: async () => { throw new Error('gateway timeout'); } });
        assert.equal(await invokeTry(notFound, { messageId: '1.2.3', loadIPFS: true }), null);
        assert.equal(await invokeTry(noIpfs, { messageId: '1.2.3', loadIPFS: true }), null);
    });

    it('tryGetMessage() still returns the message on success', async () => {
        const loaded = { type: 'InstancePolicy', document: { ok: true } };
        const self = fakeThis({ loadIPFS: async () => loaded });
        assert.equal(await invokeTry(self, { messageId: '1.2.3', loadIPFS: true }), loaded);
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

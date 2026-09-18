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
        const cause = new Error('topic lookup failed');
        const self = fakeThis({ getTopicMessage: async () => { throw cause; } });
        await assert.rejects(invoke(self, { messageId: ' 1.2.3 ', loadIPFS: true }), (e) => {
            assert.ok(e instanceof MessageNotFoundError);
            assert.equal(e.code, 404);
            assert.equal(e.messageId, '1.2.3');
            assert.match(e.message, /1\.2\.3/);
            assert.equal(e.cause, cause);
            return true;
        });
    });

    it('throws MessageNotFoundError for an empty message id, without a lookup', async () => {
        let called = false;
        const self = fakeThis({ getTopicMessage: async () => { called = true; } });
        await assert.rejects(invoke(self, { messageId: '  ', loadIPFS: true }), MessageNotFoundError);
        assert.equal(called, false);
    });

    it('tryGetMessage() returns null for a message that cannot be found', async () => {
        const self = fakeThis({ getTopicMessage: async () => { throw new Error('topic lookup failed'); } });
        assert.equal(await invokeTry(self, { messageId: '1.2.3', loadIPFS: true }), null);
        assert.equal(await invokeTry(self, { messageId: '  ', loadIPFS: true }), null);
    });

    // "IPFS is down" is not "no such message" - swallowing it would hide an
    // outage behind a silent skip in the import paths that use tryGetMessage.
    it('tryGetMessage() still throws MessageIpfsError', async () => {
        const self = fakeThis({ loadIPFS: async () => { throw new Error('gateway timeout'); } });
        await assert.rejects(invokeTry(self, { messageId: '1.2.3', loadIPFS: true }), MessageIpfsError);
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

// The static overload duplicates the instance one and takes dryRun from the
// options rather than from `this`, so it needs its own coverage.
describe('@unit MessageServer static getMessage()', () => {
    const originals = {
        getTopicMessage: MessageServer.getTopicMessage,
        getDryRunTopicMessage: MessageServer.getDryRunTopicMessage,
        loadIPFS: MessageServer.loadIPFS
    };
    const patch = (overrides) => Object.assign(MessageServer, overrides);

    beforeEach(() => {
        patch({
            getTopicMessage: async () => ({ type: 'InstancePolicy', document: {} }),
            getDryRunTopicMessage: async () => ({ type: 'InstancePolicy', dryRun: true }),
            loadIPFS: async (m) => m
        });
    });

    afterEach(() => patch(originals));

    it('throws MessageNotFoundError(404) when the message cannot be retrieved', async () => {
        patch({ getTopicMessage: async () => { throw new Error('topic lookup failed'); } });
        await assert.rejects(MessageServer.getMessage({ messageId: '1.2.3', loadIPFS: true }), (e) => {
            assert.ok(e instanceof MessageNotFoundError);
            assert.equal(e.code, 404);
            assert.equal(e.messageId, '1.2.3');
            return true;
        });
    });

    it('throws MessageIpfsError(422) when the IPFS load fails', async () => {
        patch({ loadIPFS: async () => { throw new Error('gateway timeout'); } });
        await assert.rejects(MessageServer.getMessage({ messageId: '1.2.3', loadIPFS: true }), MessageIpfsError);
    });

    it('throws MessageNotFoundError for an empty message id', async () => {
        await assert.rejects(MessageServer.getMessage({ messageId: '  ' }), MessageNotFoundError);
    });

    it('takes the dry-run branch from the options', async () => {
        const result = await MessageServer.getMessage({ messageId: '1.2.3', dryRun: 'run-1' });
        assert.deepEqual(result, { type: 'InstancePolicy', dryRun: true });
    });

    it('tryGetMessage() returns null for not-found but rethrows an IPFS failure', async () => {
        patch({ getTopicMessage: async () => { throw new Error('topic lookup failed'); } });
        assert.equal(await MessageServer.tryGetMessage({ messageId: '1.2.3' }), null);

        patch({ getTopicMessage: async () => ({ type: 'InstancePolicy', document: {} }) });
        patch({ loadIPFS: async () => { throw new Error('gateway timeout'); } });
        await assert.rejects(MessageServer.tryGetMessage({ messageId: '1.2.3', loadIPFS: true }), MessageIpfsError);
    });
});

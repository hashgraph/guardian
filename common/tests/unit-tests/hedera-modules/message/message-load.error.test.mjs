import assert from 'node:assert/strict';
import { MessageIpfsError, MessageLoadError, MessageNotFoundError, loadErrorCode } from '../../../../dist/hedera-modules/message/message-load.error.js';

describe('@unit loadErrorCode', () => {
    it('returns the code of a message load error', () => {
        assert.equal(loadErrorCode(new MessageIpfsError('1.2.3')), 422);
        assert.equal(loadErrorCode(new MessageNotFoundError('1.2.3')), 404);
    });

    // A Mongo duplicate-key code or a NATS/Node string code is not an HTTP
    // status, so it must not be forwarded to the API response.
    it('returns undefined for anything else', () => {
        assert.equal(loadErrorCode(Object.assign(new Error('duplicate key'), { code: 11000 })), undefined);
        assert.equal(loadErrorCode(Object.assign(new Error('no responders'), { code: 'NO_RESPONDERS' })), undefined);
        assert.equal(loadErrorCode(new Error('plain')), undefined);
        assert.equal(loadErrorCode(undefined), undefined);
    });
});

// getMessage() rethrows on `instanceof MessageLoadError`, so both classes must
// stay under that base.
describe('@unit MessageLoadError', () => {
    it('is the shared base of both load errors', () => {
        assert.ok(new MessageIpfsError('1.2.3') instanceof MessageLoadError);
        assert.ok(new MessageNotFoundError('1.2.3') instanceof MessageLoadError);
    });

    it('chains the underlying cause', () => {
        const cause = new Error('mirror node 503');
        assert.equal(new MessageIpfsError('1.2.3', cause).cause, cause);
        assert.equal(new MessageNotFoundError('1.2.3', cause).cause, cause);
    });
});

describe('@unit MessageIpfsError', () => {
    it('carries a 422 status', () => {
        assert.equal(new MessageIpfsError('1.2.3').code, 422);
    });

    it('is an Error and preserves the message id', () => {
        const e = new MessageIpfsError('1.2.3');
        assert.ok(e instanceof Error);
        assert.equal(e.name, 'MessageIpfsError');
        assert.equal(e.messageId, '1.2.3');
    });

    it('embeds the IPFS_UNAVAILABLE token and the message id', () => {
        const e = new MessageIpfsError('1.2.3');
        assert.match(e.message, /^IPFS_UNAVAILABLE:/);
        assert.match(e.message, /1\.2\.3/);
        assert.match(e.message, /unpinned|offline/i);
    });
});

describe('@unit MessageNotFoundError', () => {
    it('carries a 404 status, the message id, and the MESSAGE_NOT_FOUND token', () => {
        const e = new MessageNotFoundError('1.2.3');
        assert.ok(e instanceof Error);
        assert.equal(e.code, 404);
        assert.equal(e.name, 'MessageNotFoundError');
        assert.equal(e.messageId, '1.2.3');
        assert.match(e.message, /^MESSAGE_NOT_FOUND:/);
        assert.match(e.message, /1\.2\.3/);
    });

    it('reads sensibly when no message id was supplied', () => {
        const e = new MessageNotFoundError();
        assert.match(e.message, /^MESSAGE_NOT_FOUND:/);
        assert.doesNotMatch(e.message, /undefined/);
    });
});

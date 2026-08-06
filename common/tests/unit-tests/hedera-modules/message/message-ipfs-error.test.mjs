import assert from 'node:assert/strict';
import { MessageIpfsError, MessageLoadError, MessageNotFoundError } from '../../../../dist/hedera-modules/message/message-load.error.js';

// getMessage() rethrows on `instanceof MessageLoadError`, so both classes must
// stay under that base.
describe('@unit MessageLoadError', () => {
    it('is the shared base of both load errors', () => {
        assert.ok(new MessageIpfsError('1.2.3') instanceof MessageLoadError);
        assert.ok(new MessageNotFoundError('1.2.3') instanceof MessageLoadError);
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

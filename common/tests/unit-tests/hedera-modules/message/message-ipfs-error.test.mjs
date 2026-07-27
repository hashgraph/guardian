import assert from 'node:assert/strict';
import { MessageIpfsError } from '../../../../dist/hedera-modules/message/message-load.error.js';

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

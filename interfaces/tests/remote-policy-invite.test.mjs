import assert from 'node:assert/strict';
import { RemotePolicyInvite } from '../dist/helpers/remote-policy-invite.js';

const MESSAGE_ID = '1706823227.586179534';

describe('RemotePolicyInvite', () => {
    it('round-trips a message id', () => {
        const link = RemotePolicyInvite.encode(MESSAGE_ID);
        assert.equal(link, `guardian://remote-policy/${MESSAGE_ID}`);
        assert.equal(RemotePolicyInvite.decode(link), MESSAGE_ID);
    });

    it('accepts a plain message id and surrounding spaces', () => {
        assert.equal(RemotePolicyInvite.decode(`  ${MESSAGE_ID} `), MESSAGE_ID);
    });

    it('reads the invite query parameter of any instance URL', () => {
        const link = encodeURIComponent(RemotePolicyInvite.encode(MESSAGE_ID));
        assert.equal(RemotePolicyInvite.decode(`https://home.example/policy-viewer?tab=remote&invite=${link}`), MESSAGE_ID);
        assert.equal(RemotePolicyInvite.decode(`https://home.example/policy-viewer?invite=${MESSAGE_ID}`), MESSAGE_ID);
    });

    it('rejects values without a message id', () => {
        for (const value of [undefined, null, '', 'abc', 'guardian://remote-policy/abc', 'https://x.example/?tab=remote',
            'https://x.example/?invite=%E0%A4%A', `https://x.example/?invite=${encodeURIComponent('https://y/?invite=1.2')}`]) {
            assert.equal(RemotePolicyInvite.decode(value), null, String(value));
        }
    });
});

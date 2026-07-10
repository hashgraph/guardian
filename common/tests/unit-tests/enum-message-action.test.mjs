import assert from 'node:assert/strict';
import { MessageAction } from '../../dist/hedera-modules/message/message-action.js';

describe('common MessageAction enum', () => {
    it('exposes representative document/policy/schema/role/comment actions', () => {
        assert.equal(MessageAction.CreateDID, 'create-did-document');
        assert.equal(MessageAction.CreateVC, 'create-vc-document');
        assert.equal(MessageAction.CreatePolicy, 'create-policy');
        assert.equal(MessageAction.PublishSchema, 'publish-schema');
        assert.equal(MessageAction.RevokeDocument, 'revoke-document');
        assert.equal(MessageAction.Mint, 'mint');
        assert.equal(MessageAction.CreateRole, 'create-role');
        assert.equal(MessageAction.CreateComment, 'create-policy-comment');
    });
    it('values are kebab-cased identifiers (or "Init" sentinel)', () => {
        for (const v of Object.values(MessageAction)) {
            assert.equal(typeof v, 'string');
            if (v !== 'Init') assert.match(v, /^[a-z][a-z0-9-]*$/);
        }
    });
    it('has 50+ actions (includes all policy-action variants)', () => {
        assert.ok(Object.keys(MessageAction).length >= 50);
    });
});

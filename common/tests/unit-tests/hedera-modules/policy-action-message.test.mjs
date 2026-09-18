import { assert } from 'chai';
import {
    PolicyActionMessage,
    MessageType,
    MessageAction
} from '../../../dist/hedera-modules/message/index.js';

describe('PolicyActionMessage', () => {
    const body = (over = {}) => ({
        id: 'id', status: 'ISSUE', type: MessageType.PolicyAction, action: MessageAction.CreateVC,
        lang: 'en', account: '0.0.1',
        uuid: 'u1', owner: 'did:o', policyId: 'p1', accountId: '0.0.5',
        relayerAccount: '0.0.6', blockTag: 'tag', parent: 'parent-1', ...over
    });

    it('constructs with the PolicyAction type', () => {
        assert.equal(new PolicyActionMessage(MessageAction.CreateVC).type, MessageType.PolicyAction);
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => PolicyActionMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject maps action fields', () => {
        const m = PolicyActionMessage.fromMessageObject(body());
        assert.equal(m.uuid, 'u1');
        assert.equal(m.owner, 'did:o');
        assert.equal(m.policyId, 'p1');
        assert.equal(m.accountId, '0.0.5');
        assert.equal(m.relayerAccount, '0.0.6');
        assert.equal(m.blockTag, 'tag');
        assert.equal(m.parent, 'parent-1');
    });

    it('toDocuments resolves to an array', async () => {
        assert.isArray(await PolicyActionMessage.fromMessageObject(body()).toDocuments());
    });
});

import { assert } from 'chai';
import {
    TagMessage,
    SynchronizationMessage,
    MessageType,
    MessageAction
} from '../../../dist/hedera-modules/message/index.js';

describe('TagMessage', () => {
    const body = (over = {}) => ({
        id: 'tid', status: 'ISSUE', type: MessageType.Tag, action: MessageAction.CreateVC,
        lang: 'en', account: '0.0.1',
        uuid: 'u1', name: 'tag-name', description: 'd', owner: 'did:owner',
        target: 'target-1', operation: 'Create', entity: 'PolicyDocument',
        date: '2024-01-01', linkedItems: ['a', 'b'], inheritTags: true, ...over
    });

    it('constructs with the Tag type', () => {
        assert.equal(new TagMessage(MessageAction.CreateVC).type, MessageType.Tag);
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => TagMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject throws on a non-Tag type', () => {
        assert.throws(() => TagMessage.fromMessageObject(body({ type: 'Other' })), /Invalid message type/);
    });

    it('fromMessageObject maps all tag scalar fields', () => {
        const m = TagMessage.fromMessageObject(body());
        assert.equal(m.uuid, 'u1');
        assert.equal(m.name, 'tag-name');
        assert.equal(m.description, 'd');
        assert.equal(m.owner, 'did:owner');
        assert.equal(m.target, 'target-1');
        assert.equal(m.operation, 'Create');
        assert.equal(m.entity, 'PolicyDocument');
        assert.equal(m.date, '2024-01-01');
        assert.deepEqual(m.linkedItems, ['a', 'b']);
        assert.equal(m.inheritTags, true);
    });

    it('toDocuments resolves to an array', async () => {
        const m = TagMessage.fromMessageObject(body());
        assert.isArray(await m.toDocuments());
    });
});

describe('SynchronizationMessage', () => {
    const body = (over = {}) => ({
        id: 'sid', status: 'ISSUE', type: MessageType.Synchronization, action: MessageAction.CreateVC,
        lang: 'en', account: '0.0.2',
        user: 'did:user', policy: 'policy-1', policyType: 'Main',
        messageId: 'm-1', tokenId: '0.0.50', amount: '10',
        memo: 'note', target: 't-1', policyOwner: 'did:owner', ...over
    });

    it('constructs with the Synchronization type', () => {
        assert.equal(new SynchronizationMessage(MessageAction.CreateVC).type, MessageType.Synchronization);
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => SynchronizationMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject throws on a non-Synchronization type', () => {
        assert.throws(() => SynchronizationMessage.fromMessageObject(body({ type: 'Other' })), /Invalid message type/);
    });

    it('fromMessageObject maps the synchronization fields', () => {
        const m = SynchronizationMessage.fromMessageObject(body());
        assert.equal(m.user, 'did:user');
        assert.equal(m.policy, 'policy-1');
        assert.equal(m.policyType, 'Main');
        assert.equal(m.messageId, 'm-1');
        assert.equal(m.tokenId, '0.0.50');
        assert.equal(m.amount, '10');
        assert.equal(m.memo, 'note');
        assert.equal(m.target, 't-1');
        assert.equal(m.policyOwner, 'did:owner');
    });

    it('toDocuments resolves to an empty array', async () => {
        const m = SynchronizationMessage.fromMessageObject(body());
        assert.deepEqual(await m.toDocuments(), []);
    });
});

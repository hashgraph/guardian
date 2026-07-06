import { assert } from 'chai';
import { MemoMap } from '../../../dist/hedera-modules/memo-mappings/memo-map.js';
import { TopicMemo } from '../../../dist/hedera-modules/memo-mappings/topic-memo.js';
import { MessageMemo } from '../../../dist/hedera-modules/memo-mappings/message-memo.js';
import { MessageType } from '../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../dist/hedera-modules/message/message-action.js';
import { TopicType } from '@guardian/interfaces';

describe('MemoMap.parseMemo', () => {
    it('returns "" for an empty memo when safetyParse=true', () => {
        assert.equal(MemoMap.parseMemo(true, '', {}), '');
        assert.equal(MemoMap.parseMemo(true, undefined, {}), '');
        assert.equal(MemoMap.parseMemo(true, null, {}), '');
    });

    it('throws on empty memo when safetyParse=false', () => {
        assert.throws(() => MemoMap.parseMemo(false, '', {}), /empty/i);
    });

    it('passes a literal string through unchanged', () => {
        assert.equal(
            MemoMap.parseMemo(true, 'plain text', {}),
            'plain text'
        );
    });

    it('substitutes ${...} placeholders from the memo object', () => {
        assert.equal(
            MemoMap.parseMemo(true, 'hello ${name}', { name: 'world' }),
            'hello world'
        );
    });

    it('supports dotted-path lookups', () => {
        assert.equal(
            MemoMap.parseMemo(true, 'user is ${user.name}', { user: { name: 'alice' } }),
            'user is alice'
        );
    });

    it('substitutes missing values with "" when safetyParse=true', () => {
        assert.equal(
            MemoMap.parseMemo(true, 'value=${missing}', {}),
            'value='
        );
    });

    it('throws on missing value when safetyParse=false', () => {
        assert.throws(
            () => MemoMap.parseMemo(false, 'value=${missing}', {}),
            /not defined/
        );
    });
});

describe('TopicMemo.getTopicMemo', () => {
    it('returns the canonical memo for known topic types', () => {
        assert.equal(TopicMemo.getTopicMemo({ type: TopicType.UserTopic }), 'Standard Registry organization topic');
        assert.equal(TopicMemo.getTopicMemo({ type: TopicType.PolicyTopic }), 'Policy development topic');
        assert.equal(TopicMemo.getTopicMemo({ type: TopicType.TokenTopic }), 'Token topic');
        assert.equal(TopicMemo.getTopicMemo({ type: TopicType.ContractTopic }), 'Contract topic');
        assert.equal(TopicMemo.getTopicMemo({ type: TopicType.RetireTopic }), 'Retire topic');
    });

    it('substitutes ${name} for DynamicTopic when supplied', () => {
        const memo = TopicMemo.getTopicMemo({ type: TopicType.DynamicTopic, name: 'mint' });
        assert.equal(memo, 'mint operation topic');
    });

    it('falls back to the default DynamicTopic memo when name is missing', () => {
        const memo = TopicMemo.getTopicMemo({ type: TopicType.DynamicTopic });
        assert.equal(memo, 'Policy operation topic');
    });

    it('returns "" for an unknown topic type', () => {
        assert.equal(TopicMemo.getTopicMemo({ type: 'NOT_A_REAL_TOPIC' }), '');
    });

    it('exposes a stable global topic memo', () => {
        assert.equal(TopicMemo.getGlobalTopicMemo(), 'Standard Registries initialization topic');
    });
});

describe('MessageMemo.getMessageMemo', () => {
    it('returns mapped memo for {type, action} pair', () => {
        const memo = MessageMemo.getMessageMemo({
            type: MessageType.StandardRegistry,
            action: MessageAction.Init,
        });
        assert.equal(memo, 'Standard Registry initialization message');
    });

    it('returns mapped memo for action-only entries (e.g. RevokeDocument)', () => {
        const memo = MessageMemo.getMessageMemo({
            type: MessageType.VCDocument,
            action: MessageAction.RevokeDocument,
        });
        assert.equal(memo, 'Revoke document message');
    });

    it('substitutes ${name} for a Topic.CreateTopic.DynamicTopic message', () => {
        const memo = MessageMemo.getMessageMemo({
            type: MessageType.Topic,
            action: MessageAction.CreateTopic,
            messageType: TopicType.DynamicTopic,
            name: 'mint',
        });
        assert.equal(memo, 'mint operation topic creation message');
    });

    it('falls back to the default DynamicTopic creation memo when ${name} is missing', () => {
        const memo = MessageMemo.getMessageMemo({
            type: MessageType.Topic,
            action: MessageAction.CreateTopic,
            messageType: TopicType.DynamicTopic,
        });
        assert.equal(memo, 'Policy operation topic creation message');
    });

    it('returns "" for an unknown {type, action} combination', () => {
        const memo = MessageMemo.getMessageMemo({ type: 'unknown-type', action: 'unknown-action' });
        assert.equal(memo, '');
    });
});

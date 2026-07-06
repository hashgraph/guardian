import { assert } from 'chai';
import { MemoMap } from '../../../dist/hedera-modules/memo-mappings/memo-map.js';
import { TopicMemo } from '../../../dist/hedera-modules/memo-mappings/topic-memo.js';
import { MessageMemo } from '../../../dist/hedera-modules/memo-mappings/message-memo.js';

describe('MemoMap.parseMemo', () => {
    it('substitutes ${path} placeholders from the supplied object', () => {
        const out = MemoMap.parseMemo(true, 'Hello ${name}', { name: 'world' });
        assert.equal(out, 'Hello world');
    });

    it('returns "" when memo is empty and safetyParse=true', () => {
        assert.equal(MemoMap.parseMemo(true, ''), '');
    });

    it('throws when memo is empty and safetyParse=false', () => {
        assert.throws(() => MemoMap.parseMemo(false, ''), /Memo string is empty/);
    });

    it("throws on undefined parameters when safetyParse=false", () => {
        assert.throws(
            () => MemoMap.parseMemo(false, '${missing}', {}),
            /Parameter missing in memo object is not defined/,
        );
    });

    it('substitutes "" for missing parameters when safetyParse=true', () => {
        assert.equal(MemoMap.parseMemo(true, 'A ${x} B', {}), 'A  B');
    });

    it('resolves dotted paths via lodash.get', () => {
        assert.equal(
            MemoMap.parseMemo(true, '${user.name}', { user: { name: 'alice' } }),
            'alice',
        );
    });

    it('returns the literal text when no placeholder is present', () => {
        assert.equal(MemoMap.parseMemo(true, 'plain'), 'plain');
    });
});

describe('TopicMemo.getTopicMemo', () => {
    it('maps known topic types to their canonical memo', () => {
        assert.equal(TopicMemo.getTopicMemo({ type: 'USER_TOPIC' }), 'Standard Registry organization topic');
        assert.equal(TopicMemo.getTopicMemo({ type: 'POLICY_TOPIC' }), 'Policy development topic');
        assert.equal(TopicMemo.getTopicMemo({ type: 'TOKEN_TOPIC' }), 'Token topic');
    });

    it('substitutes ${name} for DynamicTopic when supplied', () => {
        assert.equal(
            TopicMemo.getTopicMemo({ type: 'DYNAMIC_TOPIC', name: 'foo' }),
            'foo operation topic',
        );
    });

    it('falls back to the dynamic topic default when name is missing', () => {
        assert.equal(
            TopicMemo.getTopicMemo({ type: 'DYNAMIC_TOPIC' }),
            'Policy operation topic',
        );
    });

    it('returns "" for unknown topic types', () => {
        assert.equal(TopicMemo.getTopicMemo({ type: 'NEVER_HEARD_OF_IT' }), '');
    });

    it('exposes the global topic memo via getGlobalTopicMemo', () => {
        assert.equal(TopicMemo.getGlobalTopicMemo(), 'Standard Registries initialization topic');
    });
});

describe('MessageMemo.getMessageMemo', () => {
    it('returns the static message for ChangeMessageStatus action', () => {
        assert.equal(
            MessageMemo.getMessageMemo({ type: 'X', action: 'change-message-status' }),
            'Status change message',
        );
    });

    it('returns the static message for RevokeDocument action', () => {
        assert.equal(
            MessageMemo.getMessageMemo({ type: 'X', action: 'revoke-document' }),
            'Revoke document message',
        );
    });

    it('returns "" for unknown action+type combinations', () => {
        assert.equal(
            MessageMemo.getMessageMemo({ type: 'Mystery', action: 'mystery-action' }),
            '',
        );
    });
});

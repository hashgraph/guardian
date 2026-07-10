import assert from 'node:assert/strict';
import { TopicType } from '../dist/type/topic.type.js';

describe('interfaces TopicType enum', () => {
    it('exposes the full topic taxonomy (18 entries)', () => {
        const expected = ['UserTopic', 'PolicyTopic', 'InstancePolicyTopic', 'DynamicTopic', 'SchemaTopic',
            'SynchronizationTopic', 'RetireTopic', 'TokenTopic', 'ModuleTopic', 'ContractTopic',
            'ToolTopic', 'TagsTopic', 'StatisticTopic', 'LabelTopic', 'RestoreTopic',
            'ActionsTopic', 'RecordsTopic', 'CommentsTopic'];
        for (const k of expected) {
            assert.ok(typeof TopicType[k] === 'string', `missing ${k}`);
        }
        assert.equal(Object.keys(TopicType).length, expected.length);
    });
});

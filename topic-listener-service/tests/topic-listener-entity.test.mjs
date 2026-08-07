import assert from 'node:assert/strict';
import { TopicListener } from '../dist/entity/topic-listener.js';

describe('TopicListener entity', () => {
    it('is constructible and extends BaseEntity (object instance)', () => {
        const t = new TopicListener();
        assert.ok(t instanceof TopicListener);
    });

    it('accepts topicId / name / searchIndex / sendIndex / network assignments', () => {
        const t = new TopicListener();
        t.topicId = '0.0.123';
        t.name = 'demo';
        t.searchIndex = 0;
        t.sendIndex = 0;
        t.network = 'testnet';
        assert.equal(t.topicId, '0.0.123');
        assert.equal(t.name, 'demo');
        assert.equal(t.searchIndex, 0);
        assert.equal(t.sendIndex, 0);
        assert.equal(t.network, 'testnet');
    });
});

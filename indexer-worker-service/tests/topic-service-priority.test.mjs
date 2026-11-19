import assert from 'node:assert/strict';
import { DataBaseHelper } from '@indexer/common';
import { MessageType, PriorityStatus } from '@indexer/interfaces';
import { TopicService } from '../dist/services/topic-service.js';

describe('TopicService.saveRelationships priority inheritance', () => {
    let originalGetEntityManager;
    let created;

    const messages = [{
        topicId: '0.0.100',
        consensusTimestamp: '1.1',
        data: JSON.stringify({ type: MessageType.POLICY, topicId: '0.0.200' }),
    }];

    const priorityOptions = (inheritPriority) => ({
        priorityDate: new Date(),
        priorityStatus: PriorityStatus.SCHEDULED,
        priorityStatusDate: new Date(),
        priorityTimestamp: 12345,
        inheritPriority,
    });

    beforeEach(() => {
        created = [];
        originalGetEntityManager = DataBaseHelper.getEntityManager;
        DataBaseHelper.getEntityManager = () => ({
            findOne: async () => null,
            create: (_entity, data) => {
                created.push(data);
                return data;
            },
            persistAndFlush: async () => { },
        });
    });

    afterEach(() => {
        DataBaseHelper.getEntityManager = originalGetEntityManager;
    });

    it('adds child topics with the priority when the parent inherits it', async () => {
        await TopicService.saveRelationships(messages, priorityOptions(true));

        assert.equal(created.length, 1);
        assert.equal(created[0].topicId, '0.0.200');
        assert.equal(created[0].priorityTimestamp, 12345);
        assert.equal(created[0].inheritPriority, true);
    });

    it('still discovers child topics, without priority, when the parent does not inherit it', async () => {
        await TopicService.saveRelationships(messages, priorityOptions(false));

        assert.equal(created.length, 1);
        assert.equal(created[0].topicId, '0.0.200');
        assert.equal(created[0].priorityTimestamp, undefined);
        assert.equal(created[0].priorityStatus, PriorityStatus.NONE);
    });

    it('adds child topics when there is no priority at all', async () => {
        await TopicService.saveRelationships(messages);

        assert.equal(created.length, 1);
        assert.equal(created[0].topicId, '0.0.200');
    });
});

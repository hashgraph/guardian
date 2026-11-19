import assert from 'node:assert/strict';
import axios from 'axios';
import { DataBaseHelper } from '@indexer/common';
import { LoadingQueueService } from '../dist/api/loading-queue.service.js';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');

describe('LoadingQueueService.addEntity', () => {
    let originalGetEntityManager;
    let originalAxiosGet;
    let cachedTopics;
    let created;
    let updates;
    let service;

    beforeEach(() => {
        cachedTopics = new Set();
        created = [];
        updates = [];
        service = new LoadingQueueService();
        LoadingQueueService.mirrorNodeUrl = 'http://mirror/';

        originalGetEntityManager = DataBaseHelper.getEntityManager;
        DataBaseHelper.getEntityManager = () => ({
            find: async () => [],
            count: async (_entity, filter) => (cachedTopics.has(filter.topicId) ? 1 : 0),
            nativeUpdate: async (entity, filter, data) => {
                updates.push({ entity: entity.name, filter, data });
                return entity.name === 'TopicCache' && cachedTopics.has(filter.topicId) ? 1 : 0;
            },
            create: (_entity, data) => {
                created.push(data);
                return data;
            },
            persistAndFlush: async (row) => {
                if (cachedTopics.has(row.topicId)) {
                    throw new Error('duplicate topic');
                }
                cachedTopics.add(row.topicId);
            },
        });
        originalAxiosGet = axios.get;
    });

    afterEach(() => {
        DataBaseHelper.getEntityManager = originalGetEntityManager;
        axios.get = originalAxiosGet;
    });

    it('returns false instead of throwing when the Hedera lookup finds no parent', async () => {
        axios.get = async () => ({ data: { messages: [] } });

        assert.equal(await service.addEntity('0.0.500', 1), false);
        assert.equal(created.length, 0);
    });

    it('returns false when the mirror node request fails', async () => {
        axios.get = async () => {
            throw new Error('404');
        };

        assert.equal(await service.addEntity('0.0.500', 1), false);
    });

    it('adds the unknown topic and its missing parents and re-prioritises the cached ancestor', async () => {
        cachedTopics.add('0.0.300');
        const parents = { '0.0.500': '0.0.400', '0.0.400': '0.0.300' };
        axios.get = async (url) => {
            const id = url.split('/topics/')[1].split('/')[0];
            return { data: { messages: [{ message: b64({ type: 'Topic', parentId: parents[id] }) }] } };
        };

        assert.equal(await service.addEntity('0.0.500', 7), true);

        const byId = Object.fromEntries(created.map((row) => [row.topicId, row]));
        assert.equal(byId['0.0.500'].inheritPriority, true);
        assert.equal(byId['0.0.400'].inheritPriority, false);
        assert.equal(byId['0.0.500'].priorityTimestamp, 7);
        const parentUpdate = updates.find((u) => u.entity === 'TopicCache' && u.filter.topicId === '0.0.300');
        assert.equal(parentUpdate.data.priorityTimestamp, 7);
        assert.equal('inheritPriority' in parentUpdate.data, false);
    });

    it('does not insert a duplicate when the topic is already cached', async () => {
        cachedTopics.add('0.0.600');

        await service.addTopic('0.0.600', 1, true);

        assert.equal(created.length, 0);
    });

    it('does not lower inheritPriority of an existing topic', async () => {
        cachedTopics.add('0.0.300');

        await service.tryUpdateTopic('0.0.300', 9, false);

        const topicUpdate = updates.find((u) => u.entity === 'TopicCache');
        assert.equal('inheritPriority' in topicUpdate.data, false);
    });
});

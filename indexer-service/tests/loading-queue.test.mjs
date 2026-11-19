import assert from 'node:assert/strict';
import axios from 'axios';
import { DataBaseHelper } from '@indexer/common';
import { LoadingQueueService } from '../dist/api/loading-queue.service.js';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');

describe('LoadingQueueService.addEntity', () => {
    let originalGetEntityManager;
    let originalAxiosGet;
    let topics;
    let onInsert;
    let service;
    let mirrorCalls;

    const mirror = (parents) => {
        axios.get = async (url) => {
            mirrorCalls.push(url);
            const id = url.split('/topics/')[1].split('/')[0];
            const messages = parents[id]
                ? [{ message: b64({ type: 'Topic', parentId: parents[id] }) }]
                : [];
            return { data: { messages } };
        };
    };

    beforeEach(() => {
        topics = new Map();
        onInsert = null;
        mirrorCalls = [];
        service = new LoadingQueueService();
        LoadingQueueService.mirrorNodeUrl = 'http://mirror/';

        originalGetEntityManager = DataBaseHelper.getEntityManager;
        DataBaseHelper.getEntityManager = () => ({
            find: async () => [],
            count: async (_entity, filter) => (topics.has(filter.topicId) ? 1 : 0),
            nativeUpdate: async (entity, filter, data) => {
                if (entity.name !== 'TopicCache' || typeof filter.topicId !== 'string') {
                    return 0;
                }
                const row = topics.get(filter.topicId);
                if (!row || row.priorityTimestamp === filter.priorityTimestamp.$ne) {
                    return 0;
                }
                Object.assign(row, data);
                return 1;
            },
            create: (_entity, data) => ({ ...data }),
            persistAndFlush: async (row) => {
                if (onInsert) {
                    onInsert(row);
                }
                if (topics.has(row.topicId)) {
                    throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
                }
                topics.set(row.topicId, row);
            },
        });
        originalAxiosGet = axios.get;
    });

    afterEach(() => {
        DataBaseHelper.getEntityManager = originalGetEntityManager;
        axios.get = originalAxiosGet;
    });

    it('returns false when the mirror node has no parent topic', async () => {
        mirror({});

        assert.equal(await service.addEntity('0.0.500', 1), false);
        assert.equal(topics.size, 0);
    });

    it('returns false when the mirror node request fails', async () => {
        axios.get = async () => {
            throw new Error('404');
        };

        assert.equal(await service.addEntity('0.0.500', 1), false);
        assert.equal(topics.size, 0);
    });

    it('stores the unknown topic and its missing parents and prioritises the cached ancestor', async () => {
        topics.set('0.0.300', { topicId: '0.0.300', priorityTimestamp: 1 });
        mirror({ '0.0.500': '0.0.400', '0.0.400': '0.0.300' });

        assert.equal(await service.addEntity('0.0.500', 7), true);

        assert.equal(topics.get('0.0.500').inheritPriority, true);
        assert.equal(topics.get('0.0.500').priorityTimestamp, 7);
        assert.equal(topics.get('0.0.400').inheritPriority, false);
        assert.equal(topics.get('0.0.400').priorityTimestamp, 7);
        assert.equal(topics.get('0.0.300').priorityTimestamp, 7);
    });

    it('prioritises an already cached topic without asking the mirror node or inserting it again', async () => {
        topics.set('0.0.600', { topicId: '0.0.600', priorityTimestamp: 1, inheritPriority: false });

        assert.equal(await service.addEntity('0.0.600', 5), true);

        assert.equal(mirrorCalls.length, 0);
        assert.equal(topics.size, 1);
        assert.equal(topics.get('0.0.600').priorityTimestamp, 5);
        assert.equal(topics.get('0.0.600').inheritPriority, true);
    });

    it('keeps inheritPriority of a cached parent when a deeper topic is prioritised', async () => {
        topics.set('0.0.300', { topicId: '0.0.300', priorityTimestamp: 1, inheritPriority: true });
        mirror({ '0.0.500': '0.0.300' });

        assert.equal(await service.addEntity('0.0.500', 7), true);

        assert.equal(topics.get('0.0.300').priorityTimestamp, 7);
        assert.equal(topics.get('0.0.300').inheritPriority, true);
    });

    it('prioritises the existing row when the worker caches the topic between the check and the insert', async () => {
        topics.set('0.0.300', { topicId: '0.0.300', priorityTimestamp: 1 });
        mirror({ '0.0.500': '0.0.300' });
        onInsert = (row) => {
            if (row.topicId === '0.0.500') {
                topics.set('0.0.500', { topicId: '0.0.500', priorityTimestamp: null });
            }
        };

        assert.equal(await service.addEntity('0.0.500', 7), true);

        assert.equal(topics.get('0.0.500').priorityTimestamp, 7);
        assert.equal(topics.get('0.0.500').inheritPriority, true);
    });
});

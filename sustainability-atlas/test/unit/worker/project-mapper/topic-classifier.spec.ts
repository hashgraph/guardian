import { describe, expect, it, jest } from '@jest/globals';
import { DataSource } from 'typeorm';
import { TopicClassifierService } from '@worker/project-mapper/topic-classifier';

interface MockSpec {
    instanceTopics: Set<string>;
    topicMessages: Map<string, { parentId: string | null; name: string | null }>;
}

function mockDs(spec: MockSpec): { ds: DataSource; query: jest.Mock } {
    const query = jest.fn(async (...args: unknown[]) => {
        const sql = args[0] as string;
        const params = args[1] as unknown[] | undefined;
        const id = (params?.[0] as string) ?? '';
        if (sql.includes("type = 'Instance-Policy'") && sql.includes('instanceTopicId')) {
            return spec.instanceTopics.has(id) ? [{ ok: 1 }] : [];
        }
        if (sql.includes('AS parent_id') && sql.includes('AS name')) {
            const tm = spec.topicMessages.get(id);
            return tm && tm.parentId !== null ? [{ parent_id: tm.parentId, name: tm.name }] : [];
        }
        if (sql.includes('AS parent_id')) {
            const tm = spec.topicMessages.get(id);
            return [{ parent_id: tm?.parentId ?? null }];
        }
        return [];
    });
    return { ds: { query } as unknown as DataSource, query };
}

describe('TopicClassifierService', () => {
    it('classifies an instance topic', async () => {
        const { ds } = mockDs({ instanceTopics: new Set(['0.0.inst']), topicMessages: new Map() });
        const svc = new TopicClassifierService();
        await expect(svc.classifyTopic(ds, '0.0.inst')).resolves.toEqual({
            kind: 'instance', name: null, instancePolicyTopicId: '0.0.inst',
        });
    });

    it('classifies a dynamic-project topic whose parent is an instance topic', async () => {
        const { ds } = mockDs({
            instanceTopics: new Set(['0.0.parent']),
            topicMessages: new Map([['0.0.child', { parentId: '0.0.parent', name: 'Project' }]]),
        });
        const svc = new TopicClassifierService();
        await expect(svc.classifyTopic(ds, '0.0.child')).resolves.toEqual({
            kind: 'dynamic-project', name: 'Project', instancePolicyTopicId: '0.0.parent',
        });
    });

    it('classifies a non-matching topic as other', async () => {
        const { ds } = mockDs({
            instanceTopics: new Set(),
            topicMessages: new Map([['0.0.x', { parentId: '0.0.p', name: 'Random' }]]),
        });
        const svc = new TopicClassifierService();
        await expect(svc.classifyTopic(ds, '0.0.x')).resolves.toEqual({
            kind: 'other', name: 'Random', instancePolicyTopicId: null,
        });
    });

    it('caches definitive results but re-queries "other"', async () => {
        const { ds, query } = mockDs({
            instanceTopics: new Set(['0.0.inst']),
            topicMessages: new Map([['0.0.x', { parentId: '0.0.p', name: 'Random' }]]),
        });
        const svc = new TopicClassifierService();
        await svc.classifyTopic(ds, '0.0.inst');
        const afterInstance = query.mock.calls.length;
        await svc.classifyTopic(ds, '0.0.inst');
        expect(query.mock.calls.length).toBe(afterInstance);            // definitive → cached
        await svc.classifyTopic(ds, '0.0.x');
        const afterOther = query.mock.calls.length;
        await svc.classifyTopic(ds, '0.0.x');
        expect(query.mock.calls.length).toBeGreaterThan(afterOther);    // other → re-queried
    });
});

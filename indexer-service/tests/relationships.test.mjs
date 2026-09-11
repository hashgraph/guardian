import assert from 'node:assert/strict';
import { DataBaseHelper } from '@indexer/common';
import { MessageType, TagType } from '@indexer/interfaces';
import { Relationships } from '../dist/utils/relationships.js';

describe('Relationships.load', () => {
    let originalGetEntityManager;

    afterEach(() => {
        DataBaseHelper.getEntityManager = originalGetEntityManager;
    });

    it('does not count Contract tags for a Standard Registry', async () => {
        const registry = {
            consensusTimestamp: 'registry-1',
            uuid: 'registry-uuid',
            type: MessageType.STANDARD_REGISTRY,
            topicId: 'registry-topic',
            options: { did: 'did:hedera:registry' },
        };
        const policy = {
            consensusTimestamp: 'policy-1',
            uuid: 'policy-uuid',
            type: MessageType.INSTANCE_POLICY,
            topicId: 'policy-topic',
            options: {},
        };
        const countFilters = [];
        originalGetEntityManager = DataBaseHelper.getEntityManager;
        DataBaseHelper.getEntityManager = () => ({
            findOne: async () => registry,
            find: async (_entity, filter) =>
                filter['options.owner'] ? [policy] : [],
            count: async (_entity, filter) => {
                countFilters.push(filter);
                return 3;
            },
        });

        const graph = await new Relationships(registry).load();

        assert.deepEqual(countFilters.map((filter) => filter['options.entity']), [TagType.Policy]);
        assert.equal(graph.relationships.find((item) => item.id === 'registry-1').tagsCount, 0);
        assert.equal(graph.relationships.find((item) => item.id === 'policy-1').tagsCount, 3);
    });
});

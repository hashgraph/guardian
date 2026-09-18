import assert from 'node:assert/strict';
import { PolicyModel } from '../../dist/analytics/compare/models/policy.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };

const minimalConfig = (overrides = {}) => ({
    blockType: 'root',
    tag: 'root',
    children: [],
    ...overrides,
});

const rawPolicy = (overrides = {}) => ({
    id: 'p-1',
    name: 'Policy',
    description: 'desc',
    instanceTopicId: '0.0.1',
    version: '1.0.0',
    config: minimalConfig(),
    policyRoles: [],
    policyGroups: [],
    policyTopics: [],
    policyTokens: [],
    tools: [],
    ...overrides,
});

describe('PolicyModel construction', () => {
    it('captures id/name/description/instanceTopicId/version', () => {
        const m = new PolicyModel(rawPolicy(), opts);
        assert.equal(m.id, 'p-1');
        assert.equal(m.name, 'Policy');
        assert.equal(m.description, 'desc');
        assert.equal(m.instanceTopicId, '0.0.1');
        assert.equal(m.version, '1.0.0');
    });

    it('throws "Empty policy model" when config is missing', () => {
        assert.throws(() => new PolicyModel(rawPolicy({ config: undefined }), opts), /Empty policy model/);
    });

    it('parses an empty arrays of roles/groups/topics/tokens/tools as []', () => {
        const m = new PolicyModel(rawPolicy(), opts);
        assert.deepEqual(m.roles, []);
        assert.deepEqual(m.groups, []);
        assert.deepEqual(m.topics, []);
        assert.deepEqual(m.tokens, []);
        assert.deepEqual(m.tools, []);
    });

    it('parses non-empty roles/groups/topics/tokens/tools', () => {
        const m = new PolicyModel(rawPolicy({
            policyRoles: ['OWNER', 'VIEWER'],
            policyGroups: [{ name: 'Owners' }],
            policyTopics: [{ name: 'main' }],
            policyTokens: [{ templateTokenTag: 'tt' }],
            tools: [{ messageId: 'mt-1' }],
        }), opts);
        assert.equal(m.roles.length, 2);
        assert.equal(m.groups.length, 1);
        assert.equal(m.topics.length, 1);
        assert.equal(m.tokens.length, 1);
        assert.equal(m.tools.length, 1);
    });

    it('builds the tree from config', () => {
        const m = new PolicyModel(rawPolicy({ config: minimalConfig({ tag: 'root-A' }) }), opts);
        assert.ok(m.tree);
        assert.equal(m.tree.tag, 'root-A');
    });
});

describe('PolicyModel.info', () => {
    it('returns identifiers + the default type field "id"', () => {
        const m = new PolicyModel(rawPolicy(), opts);
        const info = m.info();
        assert.equal(info.id, 'p-1');
        assert.equal(info.type, 'id');
    });
});

describe('PolicyModel.set* mutators', () => {
    it('returns the model for chaining', () => {
        const m = new PolicyModel(rawPolicy(), opts);
        assert.equal(m.setSchemas([]), m);
        assert.equal(m.setArtifacts([]), m);
        assert.equal(m.setTokens([]), m);
        assert.equal(m.setType('hash'), m);
        assert.equal(m.info().type, 'hash');
    });
});

describe('PolicyModel.update', () => {
    it('returns the model for chaining when set* arrays are populated', () => {
        const m = new PolicyModel(rawPolicy(), opts)
            .setSchemas([])
            .setArtifacts([])
            .setTokens([]);
        assert.equal(m.update(), m);
    });
});

describe('PolicyModel.getAllProp', () => {
    it('returns [] for an empty policy with no matching prop type', () => {
        const m = new PolicyModel(rawPolicy(), opts);
        assert.deepEqual(m.getAllProp('property'), []);
    });
});

describe('PolicyModel.fromEntity', () => {
    it('throws "Unknown policy" for missing input', () => {
        assert.throws(() => PolicyModel.fromEntity(null, opts), /Unknown policy/);
    });

    it('builds a populated PolicyModel for valid input', () => {
        const m = PolicyModel.fromEntity(rawPolicy(), opts);
        assert.equal(m.id, 'p-1');
    });
});

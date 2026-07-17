import assert from 'node:assert/strict';
import { RootSearchModel } from '../../dist/analytics/search/models/root.model.js';
import { PolicySearchModel } from '../../dist/analytics/search/models/policy.model.js';
import { BlockSearchModel } from '../../dist/analytics/search/models/block.model.js';

const config = () => ({
    blockType: 'root', id: 'root', tag: 'root',
    children: [
        { blockType: 'interfaceActionBlock', id: 'b1', tag: 't1', children: [] },
        { blockType: 'policyRolesBlock', id: 'b2', tag: 't2' }
    ]
});

describe('RootSearchModel.fromConfig', () => {
    it('throws on an empty config', () => {
        assert.throws(() => RootSearchModel.fromConfig(null), /Empty config/);
    });

    it('builds a searchable block list including the root', () => {
        const model = RootSearchModel.fromConfig(config());
        assert.equal(model.filter('root').length, 1);
        assert.equal(model.filter('interfaceActionBlock').length, 1);
    });

    it('filter returns only the blocks of a given type', () => {
        const model = RootSearchModel.fromConfig(config());
        const roles = model.filter('policyRolesBlock');
        assert.equal(roles.length, 1);
        assert.equal(roles[0].id, 'b2');
    });

    it('findBlock resolves by id and returns undefined for unknown', () => {
        const model = RootSearchModel.fromConfig(config());
        assert.equal(model.findBlock('b1').id, 'b1');
        assert.equal(model.findBlock('missing'), undefined);
    });

    it('search returns one chain per matching block', () => {
        const model = RootSearchModel.fromConfig(config());
        const chains = model.search(new BlockSearchModel({ blockType: 'interfaceActionBlock' }));
        assert.equal(chains.length, 1);
    });

    it('search returns chains sorted by descending hash', () => {
        const model = RootSearchModel.fromConfig(config());
        const chains = model.search(new BlockSearchModel({ blockType: 'root' }));
        for (let i = 1; i < chains.length; i++) {
            assert.ok(chains[i - 1].hash >= chains[i].hash);
        }
    });
});

describe('PolicySearchModel', () => {
    const policy = (over = {}) => ({
        name: 'Policy', description: 'd', owner: 'did:o', topicId: '0.0.1', messageId: 'm-1',
        version: '1.0.0', config: config(), ...over
    });

    it('throws when the policy has no config', () => {
        assert.throws(() => new PolicySearchModel({ name: 'x' }), /Empty policy config/);
    });

    it('captures policy metadata and version', () => {
        const model = new PolicySearchModel(policy());
        assert.equal(model.name, 'Policy');
        assert.equal(model.owner, 'did:o');
        assert.equal(model.version, '1.0.0');
    });

    it('builds a searchable tree from the policy config', () => {
        const model = new PolicySearchModel(policy());
        assert.equal(model.filter('interfaceActionBlock').length, 1);
        assert.equal(model.findBlock('b2').id, 'b2');
    });
});

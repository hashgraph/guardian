import assert from 'node:assert/strict';
import { ModuleSearchModel } from '../../dist/analytics/search/models/module.model.js';
import { ToolSearchModel } from '../../dist/analytics/search/models/tool.model.js';
import { RootSearchModel } from '../../dist/analytics/search/models/root.model.js';
import { BlockSearchModel } from '../../dist/analytics/search/models/block.model.js';

const config = () => ({
    blockType: 'root', id: 'root', tag: 'root',
    children: [
        { blockType: 'interfaceActionBlock', id: 'b1', tag: 't1', children: [] },
        { blockType: 'policyRolesBlock', id: 'b2', tag: 't2' }
    ]
});

describe('ModuleSearchModel', () => {
    it('is a subclass of RootSearchModel', () => {
        assert.ok(new ModuleSearchModel({ name: 'm', config: config() }) instanceof RootSearchModel);
    });

    it('throws when the module has no config', () => {
        assert.throws(() => new ModuleSearchModel({ name: 'm' }), /Empty module config/);
    });

    it('captures root metadata', () => {
        const m = new ModuleSearchModel({ name: 'Mod', description: 'd', owner: 'did:o', topicId: '0.0.1', messageId: 'm-1', config: config() });
        assert.equal(m.name, 'Mod');
        assert.equal(m.description, 'd');
        assert.equal(m.owner, 'did:o');
        assert.equal(m.topicId, '0.0.1');
        assert.equal(m.messageId, 'm-1');
    });

    it('builds a searchable block list from config', () => {
        const m = new ModuleSearchModel({ name: 'm', config: config() });
        assert.equal(m.filter('root').length, 1);
        assert.equal(m.filter('interfaceActionBlock').length, 1);
        assert.equal(m.filter('policyRolesBlock').length, 1);
    });

    it('findBlock resolves by id', () => {
        const m = new ModuleSearchModel({ name: 'm', config: config() });
        assert.equal(m.findBlock('b1').id, 'b1');
        assert.equal(m.findBlock('nope'), undefined);
    });

    it('search returns one chain per matching block', () => {
        const m = new ModuleSearchModel({ name: 'm', config: config() });
        const chains = m.search(new BlockSearchModel({ blockType: 'interfaceActionBlock' }));
        assert.equal(chains.length, 1);
    });

    it('search returns empty array when no block matches', () => {
        const m = new ModuleSearchModel({ name: 'm', config: config() });
        assert.deepEqual(m.search(new BlockSearchModel({ blockType: 'missingType' })), []);
    });
});

describe('ToolSearchModel', () => {
    it('is a subclass of RootSearchModel', () => {
        assert.ok(new ToolSearchModel({ name: 't', config: config() }) instanceof RootSearchModel);
    });

    it('throws when the tool has no config', () => {
        assert.throws(() => new ToolSearchModel({ name: 't' }), /Empty tool config/);
    });

    it('captures root metadata', () => {
        const t = new ToolSearchModel({ name: 'Tool', owner: 'did:t', messageId: 't-1', config: config() });
        assert.equal(t.name, 'Tool');
        assert.equal(t.owner, 'did:t');
        assert.equal(t.messageId, 't-1');
    });

    it('builds a searchable block list from config', () => {
        const t = new ToolSearchModel({ name: 't', config: config() });
        assert.equal(t.filter('interfaceActionBlock').length, 1);
        assert.equal(t.findBlock('b2').id, 'b2');
    });

    it('search returns chains sorted by descending hash', () => {
        const t = new ToolSearchModel({ name: 't', config: config() });
        const chains = t.search(new BlockSearchModel({ blockType: 'root' }));
        for (let i = 1; i < chains.length; i++) {
            assert.ok(chains[i - 1].hash >= chains[i].hash);
        }
    });
});

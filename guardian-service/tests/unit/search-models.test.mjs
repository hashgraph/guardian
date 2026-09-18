import assert from 'node:assert/strict';
import { BlockSearchModel } from '../../dist/analytics/search/models/block.model.js';
import { ChainSearchModel } from '../../dist/analytics/search/models/chain.model.js';
import { PairSearchModel } from '../../dist/analytics/search/models/pair.model.js';
import { RootSearchModel } from '../../dist/analytics/search/models/root.model.js';
import { ModuleSearchModel } from '../../dist/analytics/search/models/module.model.js';
import { ToolSearchModel } from '../../dist/analytics/search/models/tool.model.js';
import { PolicySearchModel } from '../../dist/analytics/search/models/policy.model.js';

const CONTAINER = 'interfaceContainerBlock';
const ROLES = 'policyRolesBlock';
const TOOL = 'tool';

function block(id, type = CONTAINER, extra = {}) {
    return { id, tag: `${id}-tag`, blockType: type, ...extra };
}

describe('BlockSearchModel', () => {
    it('exposes constructor as a function', () => {
        assert.equal(typeof BlockSearchModel, 'function');
    });

    it('maps id, tag and blockType onto the instance', () => {
        const b = new BlockSearchModel(block('a', ROLES));
        assert.equal(b.id, 'a');
        assert.equal(b.tag, 'a-tag');
        assert.equal(b.type, ROLES);
    });

    it('initialises links and children to defaults', () => {
        const b = new BlockSearchModel(block('a'));
        assert.deepEqual(b.children, []);
        assert.equal(b.parent, null);
        assert.equal(b.next, null);
        assert.equal(b.prev, null);
    });

    it('returns sorted permissions copy', () => {
        const b = new BlockSearchModel(block('a', CONTAINER, { permissions: ['z', 'a', 'm'] }));
        assert.deepEqual(b.getPermissionsList(), ['a', 'm', 'z']);
    });

    it('returns empty permissions when none provided', () => {
        const b = new BlockSearchModel(block('a'));
        assert.deepEqual(b.getPermissionsList(), []);
    });

    it('builds events from array', () => {
        const b = new BlockSearchModel(block('a', CONTAINER, { events: [{ source: 's' }] }));
        assert.equal(b.getEventList().length, 1);
    });

    it('returns empty events when not an array', () => {
        const b = new BlockSearchModel(block('a', CONTAINER, { events: 'nope' }));
        assert.deepEqual(b.getEventList(), []);
    });

    it('builds artifacts from array', () => {
        const b = new BlockSearchModel(block('a', CONTAINER, { artifacts: [{ uuid: 'u1' }] }));
        assert.equal(b.getArtifactsList().length, 1);
    });

    it('returns empty artifacts when not an array', () => {
        const b = new BlockSearchModel(block('a'));
        assert.deepEqual(b.getArtifactsList(), []);
    });

    it('returns property list array', () => {
        const b = new BlockSearchModel(block('a'));
        assert.ok(Array.isArray(b.getPropList()));
    });

    it('addChildren wires parent and prev/next', () => {
        const root = new BlockSearchModel(block('root'));
        const c1 = new BlockSearchModel(block('c1'));
        const c2 = new BlockSearchModel(block('c2'));
        root.addChildren(c1);
        root.addChildren(c2);
        assert.equal(c1.parent, root);
        assert.equal(c2.parent, root);
        assert.equal(c1.next, c2);
        assert.equal(c2.prev, c1);
        assert.equal(root.children.length, 2);
    });

    it('first child has no prev/next', () => {
        const root = new BlockSearchModel(block('root'));
        const c1 = new BlockSearchModel(block('c1'));
        root.addChildren(c1);
        assert.equal(c1.next, null);
        assert.equal(c1.prev, null);
    });

    it('update sets root path to [0] when no parent', () => {
        const b = new BlockSearchModel(block('a'));
        b.update();
        assert.deepEqual(b.toJson().path, [0]);
    });

    it('update derives path from parent index', () => {
        const root = new BlockSearchModel(block('root'));
        const c1 = new BlockSearchModel(block('c1'));
        const c2 = new BlockSearchModel(block('c2'));
        root.addChildren(c1);
        root.addChildren(c2);
        root.update();
        c1.update();
        c2.update();
        assert.deepEqual(c1.toJson().path, [0, 0]);
        assert.deepEqual(c2.toJson().path, [0, 1]);
    });

    it('toJson exposes id/tag/blockType/config/path', () => {
        const b = new BlockSearchModel(block('a', ROLES));
        const json = b.toJson();
        assert.deepEqual(Object.keys(json).sort(), ['blockType', 'config', 'id', 'path', 'tag']);
        assert.equal(json.blockType, ROLES);
        assert.equal(json.config.children, undefined);
    });

    it('toJson path is a copy, not a reference', () => {
        const b = new BlockSearchModel(block('a'));
        b.update();
        const p = b.toJson().path;
        p.push(99);
        assert.deepEqual(b.toJson().path, [0]);
    });

    it('find returns empty chain for mismatched types', () => {
        const a = new BlockSearchModel(block('a', ROLES));
        const f = new BlockSearchModel(block('f', CONTAINER));
        const chain = a.find(f);
        chain.update();
        assert.equal(chain.hash, 0);
    });

    it('find returns a chain with a pair for matching types', () => {
        const a = new BlockSearchModel(block('a', ROLES));
        const f = new BlockSearchModel(block('f', ROLES));
        const chain = a.find(f);
        chain.update();
        assert.equal(chain.toJson().pairs.length, 1);
    });
});

describe('PairSearchModel', () => {
    const a = new BlockSearchModel(block('a', ROLES, { permissions: ['p'] }));
    const b = new BlockSearchModel(block('b', ROLES, { permissions: ['p'] }));

    it('starts with zero hash', () => {
        const pair = new PairSearchModel(a, b);
        assert.equal(pair.hash, 0);
    });

    it('keeps source and filter references', () => {
        const pair = new PairSearchModel(a, b);
        assert.equal(pair.source, a);
        assert.equal(pair.filter, b);
    });

    it('update produces a numeric hash for identical blocks', () => {
        const pair = new PairSearchModel(a, b);
        pair.update();
        assert.equal(typeof pair.hash, 'number');
        assert.ok(pair.hash > 0);
    });

    it('toJson returns hash plus source/filter json', () => {
        const pair = new PairSearchModel(a, b);
        pair.update();
        const json = pair.toJson();
        assert.deepEqual(Object.keys(json).sort(), ['filter', 'hash', 'source']);
        assert.equal(json.source.id, 'a');
        assert.equal(json.filter.id, 'b');
    });
});

describe('ChainSearchModel', () => {
    it('starts with empty pairs and zero hash', () => {
        const chain = new ChainSearchModel();
        assert.equal(chain.hash, 0);
    });

    it('update on empty chain keeps hash at zero', () => {
        const chain = new ChainSearchModel();
        chain.update();
        assert.equal(chain.hash, 0);
    });

    it('addPair is chainable and grows the chain', () => {
        const a = new BlockSearchModel(block('a', ROLES));
        const b = new BlockSearchModel(block('b', ROLES));
        const chain = new ChainSearchModel();
        const returned = chain.addPair(a, b);
        assert.equal(returned, chain);
        assert.equal(chain.toJson().pairs.length, 1);
    });

    it('update computes hash from pair count and rates', () => {
        const a = new BlockSearchModel(block('a', ROLES, { permissions: ['p'] }));
        const b = new BlockSearchModel(block('b', ROLES, { permissions: ['p'] }));
        const chain = new ChainSearchModel();
        chain.addPair(a, b);
        chain.update();
        assert.ok(chain.hash >= 1000);
    });

    it('toJson exposes hash/target/pairs and target is first source', () => {
        const a = new BlockSearchModel(block('a', ROLES));
        const b = new BlockSearchModel(block('b', ROLES));
        const chain = new ChainSearchModel();
        chain.addPair(a, b);
        const json = chain.toJson();
        assert.deepEqual(Object.keys(json).sort(), ['hash', 'pairs', 'target']);
        assert.equal(json.target.id, 'a');
    });
});

describe('RootSearchModel.fromConfig', () => {
    it('throws on empty config', () => {
        assert.throws(() => RootSearchModel.fromConfig(null), /Empty config/);
    });

    it('builds a tree and lists all blocks', () => {
        const root = RootSearchModel.fromConfig(block('root', CONTAINER, {
            children: [block('c1', ROLES), block('c2', ROLES)]
        }));
        assert.equal(root.filter(ROLES).length, 2);
    });

    it('filter returns only blocks of given type', () => {
        const root = RootSearchModel.fromConfig(block('root', CONTAINER, {
            children: [block('c1', ROLES), block('c2', CONTAINER)]
        }));
        assert.equal(root.filter(ROLES).length, 1);
        assert.equal(root.filter(CONTAINER).length, 2);
    });

    it('findBlock locates a block by id', () => {
        const root = RootSearchModel.fromConfig(block('root', CONTAINER, {
            children: [block('c1', ROLES)]
        }));
        assert.equal(root.findBlock('c1').id, 'c1');
    });

    it('findBlock returns undefined for unknown id', () => {
        const root = RootSearchModel.fromConfig(block('root'));
        assert.equal(root.findBlock('missing'), undefined);
    });

    it('does not descend into nested tool blocks', () => {
        const root = RootSearchModel.fromConfig(block('root', CONTAINER, {
            children: [block('tool1', TOOL, { children: [block('inner', ROLES)] })]
        }));
        assert.ok(root.findBlock('tool1'));
        assert.equal(root.findBlock('inner'), undefined);
    });

    it('treats the root as a tool when it is the root block', () => {
        const root = RootSearchModel.fromConfig(block('root', TOOL, {
            children: [block('inner', ROLES)]
        }));
        assert.ok(root.findBlock('inner'));
    });

    it('search returns one chain per candidate block', () => {
        const root = RootSearchModel.fromConfig(block('root', CONTAINER, {
            children: [block('c1', ROLES), block('c2', ROLES)]
        }));
        const filter = root.findBlock('c1');
        const chains = root.search(filter);
        assert.equal(chains.length, 2);
    });

    it('search sorts chains by descending hash', () => {
        const root = RootSearchModel.fromConfig(block('root', CONTAINER, {
            children: [block('c1', ROLES), block('c2', ROLES)]
        }));
        const filter = root.findBlock('c1');
        const chains = root.search(filter);
        for (let i = 1; i < chains.length; i++) {
            assert.ok(chains[i - 1].hash >= chains[i].hash);
        }
    });

    it('search of absent type returns empty list', () => {
        const root = RootSearchModel.fromConfig(block('root', CONTAINER, {
            children: [block('c1', CONTAINER)]
        }));
        const filter = new BlockSearchModel(block('f', ROLES));
        assert.deepEqual(root.search(filter), []);
    });

    it('computes nested child paths', () => {
        const root = RootSearchModel.fromConfig(block('root', CONTAINER, {
            children: [block('c1', ROLES), block('c2', ROLES)]
        }));
        assert.deepEqual(root.findBlock('c2').toJson().path, [0, 1]);
    });
});

describe('ModuleSearchModel', () => {
    it('throws when config is missing', () => {
        assert.throws(() => new ModuleSearchModel({}), /Empty module config/);
    });

    it('builds from module metadata and config', () => {
        const m = new ModuleSearchModel({
            name: 'M', description: 'd', owner: 'o', topicId: '0.0.1', messageId: 'm1',
            config: block('r', CONTAINER, { children: [block('c1', ROLES)] })
        });
        assert.equal(m.name, 'M');
        assert.equal(m.owner, 'o');
        assert.equal(m.topicId, '0.0.1');
        assert.equal(m.messageId, 'm1');
        assert.equal(m.filter(ROLES).length, 1);
    });
});

describe('ToolSearchModel', () => {
    it('throws when config is missing', () => {
        assert.throws(() => new ToolSearchModel({}), /Empty tool config/);
    });

    it('builds from tool metadata and config', () => {
        const t = new ToolSearchModel({
            name: 'T', owner: 'o', topicId: '0.0.2', messageId: 't1',
            config: block('r', CONTAINER)
        });
        assert.equal(t.name, 'T');
        assert.equal(t.messageId, 't1');
    });
});

describe('PolicySearchModel', () => {
    it('throws when config is missing', () => {
        assert.throws(() => new PolicySearchModel({}), /Empty policy config/);
    });

    it('captures version alongside root metadata', () => {
        const p = new PolicySearchModel({
            name: 'P', version: '1.2.3', description: 'd', owner: 'o',
            topicId: '0.0.3', messageId: 'p1', config: block('r', CONTAINER)
        });
        assert.equal(p.version, '1.2.3');
        assert.equal(p.name, 'P');
        assert.equal(p.description, 'd');
    });
});

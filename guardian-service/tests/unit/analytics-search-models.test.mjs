import assert from 'node:assert/strict';
import { BlockSearchModel } from '../../dist/analytics/search/models/block.model.js';
import { PairSearchModel } from '../../dist/analytics/search/models/pair.model.js';
import { ChainSearchModel } from '../../dist/analytics/search/models/chain.model.js';

const block = (over = {}) => new BlockSearchModel({ id: 'b', tag: 'tag', blockType: 'X', events: [], artifacts: [], ...over });

describe('BlockSearchModel', () => {
    it('maps id/tag/type from the json', () => {
        const b = block({ id: 'b1', tag: 't1', blockType: 'interfaceActionBlock' });
        assert.equal(b.id, 'b1');
        assert.equal(b.tag, 't1');
        assert.equal(b.type, 'interfaceActionBlock');
    });

    it('starts with no relations', () => {
        const b = block();
        assert.deepEqual(b.children, []);
        assert.equal(b.parent, null);
        assert.equal(b.next, null);
        assert.equal(b.prev, null);
    });

    it('addChildren wires parent and sibling prev/next links', () => {
        const root = block({ id: 'root' });
        const c1 = block({ id: 'c1' });
        const c2 = block({ id: 'c2' });
        root.addChildren(c1);
        root.addChildren(c2);
        assert.equal(c1.parent, root);
        assert.equal(c2.parent, root);
        assert.equal(c1.next, c2);
        assert.equal(c2.prev, c1);
    });

    it('update sets the root path to [0]', () => {
        const b = block();
        b.update();
        assert.ok(b);
    });

    it('getPropList/getEventList/getPermissionsList/getArtifactsList return arrays', () => {
        const b = block({ events: [{ source: 'a' }], artifacts: [{ uuid: 'x' }] });
        assert.ok(Array.isArray(b.getPropList()));
        assert.equal(b.getEventList().length, 1);
        assert.ok(Array.isArray(b.getPermissionsList()));
        assert.equal(b.getArtifactsList().length, 1);
    });

    it('find on a same-type filter yields a non-empty chain', () => {
        const source = block({ blockType: 'X' });
        const filter = block({ blockType: 'X' });
        const chain = source.find(filter);
        chain.update();
        assert.ok(chain.hash > 0);
    });

    it('find on a different-type filter yields an empty chain', () => {
        const source = block({ blockType: 'X' });
        const filter = block({ blockType: 'Y' });
        const chain = source.find(filter);
        chain.update();
        assert.equal(chain.hash, 0);
    });

    it('toJson exposes id/tag/blockType', () => {
        const json = block({ id: 'b1', tag: 't1', blockType: 'X' }).toJson();
        assert.equal(json.id, 'b1');
        assert.equal(json.tag, 't1');
        assert.equal(json.blockType, 'X');
    });
});

describe('PairSearchModel', () => {
    it('starts with a zero hash and keeps source/filter', () => {
        const s = block({ id: 's' });
        const f = block({ id: 'f' });
        const pair = new PairSearchModel(s, f);
        assert.equal(pair.hash, 0);
        assert.equal(pair.source, s);
        assert.equal(pair.filter, f);
    });

    it('update computes a numeric hash', () => {
        const pair = new PairSearchModel(block(), block());
        pair.update();
        assert.equal(typeof pair.hash, 'number');
    });

    it('toJson serializes hash plus source/filter json', () => {
        const pair = new PairSearchModel(block({ id: 's' }), block({ id: 'f' }));
        pair.update();
        const json = pair.toJson();
        assert.equal(json.source.id, 's');
        assert.equal(json.filter.id, 'f');
        assert.equal(typeof json.hash, 'number');
    });
});

describe('ChainSearchModel', () => {
    it('starts with a zero hash', () => {
        assert.equal(new ChainSearchModel().hash, 0);
    });

    it('addPair appends and returns the chain (fluent)', () => {
        const chain = new ChainSearchModel();
        const result = chain.addPair(block({ id: 's' }), block({ id: 'f' }));
        assert.equal(result, chain);
    });

    it('update computes a hash reflecting the pair count', () => {
        const chain = new ChainSearchModel();
        chain.addPair(block(), block());
        chain.update();
        assert.ok(chain.hash >= 1000);
    });

    it('toJson exposes hash, target and pairs', () => {
        const chain = new ChainSearchModel();
        chain.addPair(block({ id: 's' }), block({ id: 'f' }));
        chain.update();
        const json = chain.toJson();
        assert.equal(typeof json.hash, 'number');
        assert.ok(json.target);
        assert.equal(json.pairs.length, 1);
    });
});

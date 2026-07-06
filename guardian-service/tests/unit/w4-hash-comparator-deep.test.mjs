import assert from 'node:assert/strict';
import { HashComparator } from '../../dist/analytics/compare/comparators/hash-comparator.js';

const item = (weight) => ({ weight });
const blk = (weights, children = [], length = 0) => ({ weights, children, length });
const policy = (hash, hashMap) => ({ hash, hashMap });
const base = (tree, over = {}) => ({
    roles: [],
    groups: [],
    topics: [],
    tokens: [],
    tree,
    ...over,
});

describe('HashComparator.compare — array weighting', () => {
    it('identical role multisets with identical trees score 100', () => {
        const tree = blk(['F', 'PC', 'FP', 'P', 'T'], [], 0);
        const a = policy('a', base(tree, { roles: [item('x'), item('x')] }));
        const b = policy('b', base(tree, { roles: [item('x'), item('x')] }));
        assert.equal(HashComparator.compare(a, b), 100);
    });

    it('partially overlapping role multisets pull the score below 100', () => {
        const a = policy('a', base(blk(['f', 'pc', 'fp', 'p', 't'], [], 0), { roles: [item('x'), item('y')] }));
        const b = policy('b', base(blk(['F', 'PC', 'FP', 'P', 't'], [], 0), { roles: [item('x'), item('z')] }));
        const rate = HashComparator.compare(a, b);
        assert.ok(rate > 0 && rate < 100);
    });

    it('a one-sided non-empty array still factors into the rate', () => {
        const a = policy('a', base(blk(['F', 'PC', 'FP', 'P', 'T'], [], 0), { roles: [item('x')] }));
        const b = policy('b', base(blk(['G', 'PC', 'FP', 'P', 'T'], [], 0), { roles: [] }));
        const rate = HashComparator.compare(a, b);
        assert.ok(rate >= 0 && rate < 100);
    });

    it('all-empty arrays on both sides do not affect the (tree-only) rate', () => {
        const tree = blk(['F', 'PC', 'FP', 'P', 'T'], [], 0);
        const a = policy('a', base(tree));
        const b = policy('b', base(tree));
        assert.equal(HashComparator.compare(a, b), 100);
    });
});

describe('HashComparator.compare — tree weighting', () => {
    it('mismatched tree TYPE weights collapse the tree contribution to 0', () => {
        const a = policy('a', base(blk(['F', 'PC', 'FP', 'P', 'TYPEA'], [], 0)));
        const b = policy('b', base(blk(['G', 'PC', 'FP', 'P', 'TYPEB'], [], 0)));
        assert.equal(HashComparator.compare(a, b), 0);
    });

    it('both-null trees score 0', () => {
        const a = policy('a', base(null));
        const b = policy('b', base(null));
        assert.equal(HashComparator.compare(a, b), 0);
    });

    it('matching FULL tree weight short-circuits to 100', () => {
        const tree = blk(['SAME', 'PC', 'FP', 'P', 'T'], [], 0);
        const a = policy('a', base(tree));
        const b = policy('b', base(tree));
        assert.equal(HashComparator.compare(a, b), 100);
    });

    it('equal PROP weight with identical children recurses to a full match', () => {
        const child = blk(['cF', 'cPC', 'cFP', 'cP', 'cT'], [], 1);
        const a = policy('a', base(blk(['F1', 'PC', 'FP', 'SAMEPROP', 'T'], [child], 2)));
        const b = policy('b', base(blk(['F2', 'PC', 'FP', 'SAMEPROP', 'T'], [child], 2)));
        assert.equal(HashComparator.compare(a, b), 100);
    });

    it('differing PROP weight blends child similarity into a partial rate', () => {
        const child = blk(['cF', 'cPC', 'cFP', 'cP', 'cT'], [], 1);
        const a = policy('a', base(blk(['F1', 'PC', 'FP', 'PROPA', 'T'], [child], 2)));
        const b = policy('b', base(blk(['F2', 'PC', 'FP', 'PROPB', 'T'], [child], 2)));
        const rate = HashComparator.compare(a, b);
        assert.ok(rate > 0 && rate < 100);
    });

    it('fully different children produce a zero child-similarity', () => {
        const ca = blk(['aF', 'aPC', 'aFP', 'aP', 'aT'], [], 1);
        const cb = blk(['bF', 'bPC', 'bFP', 'bP', 'bT'], [], 1);
        const a = policy('a', base(blk(['F1', 'PC', 'FP', 'PR', 'T'], [ca], 2)));
        const b = policy('b', base(blk(['F2', 'PC', 'FP', 'PR', 'T'], [cb], 2)));
        assert.equal(HashComparator.compare(a, b), 0);
    });
});

describe('HashComparator.createModelByFile', () => {
    const fileData = (over = {}) => ({
        policy: {
            id: 'p1',
            config: { blockType: 'interfaceContainerBlock', tag: 'root', children: [], permissions: ['ANY_ROLE'] },
            policyRoles: [],
            policyGroups: [],
            policyTopics: [],
        },
        schemas: [
            { id: 's1', name: 'S', uuid: 'u1', description: 'd', topicId: '0.0.1', version: '1', iri: '#s1', document: { properties: {} } },
        ],
        tokens: [
            { tokenId: '0.0.5', tokenName: 'T', tokenSymbol: 'TT', tokenType: 'ft', decimals: 2, initialSupply: 0, adminKey: true },
        ],
        artifacts: [],
        ...over,
    });

    it('rejects a null file', async () => {
        await assert.rejects(() => HashComparator.createModelByFile(null), /Invalid file/);
    });

    it('builds a PolicyModel with schemas, tokens, and artifacts wired in', async () => {
        const model = await HashComparator.createModelByFile(fileData());
        assert.ok(model);
        const tree = HashComparator.createTree(model);
        assert.ok(tree);
    });

    it('maps token capability flags from explicit enable* fields', async () => {
        const model = await HashComparator.createModelByFile(
            fileData({
                tokens: [
                    {
                        tokenId: '0.0.6', tokenName: 'F', tokenSymbol: 'FF', tokenType: 'nft',
                        decimals: 0, initialSupply: 0,
                        enableAdmin: true, enableFreeze: true, enableKYC: true, enableWipe: true,
                    },
                ],
            })
        );
        assert.ok(model);
    });

    it('produces a usable hash + hashMap from a built model', async () => {
        const model = await HashComparator.createModelByFile(fileData());
        const out = await HashComparator.createHashMap(model);
        assert.ok(out.hash.length > 0);
        assert.ok(out.hashMap);
        assert.equal(typeof HashComparator.createHash(model), 'string');
    });
});

describe('HashComparator.compare — child matching across weight indices', () => {
    it('children that match only on lower weight indices still contribute', () => {
        const left = blk(['F', 'PC', 'FP', 'SHAREDPROP', 'SHAREDTYPE'], [], 1);
        const right = blk(['F2', 'PC2', 'FP2', 'SHAREDPROP', 'SHAREDTYPE'], [], 1);
        const a = policy('a', base(blk(['T1', 'TPC', 'TFP', 'TP', 'TT'], [left], 2)));
        const b = policy('b', base(blk(['T2', 'TPC', 'TFP', 'TP', 'TT'], [right], 2)));
        const rate = HashComparator.compare(a, b);
        assert.ok(rate > 0 && rate <= 100);
    });

    it('children matching only on TYPE index recurse into grandchildren', () => {
        const grand = blk(['gF', 'gPC', 'gFP', 'gP', 'gT'], [], 1);
        const left = blk(['F', 'PC', 'FP', 'P', 'SAMETYPE'], [grand], 2);
        const right = blk(['F2', 'PC2', 'FP2', 'P2', 'SAMETYPE'], [grand], 2);
        const a = policy('a', base(blk(['T1', 'TPC', 'TFP', 'TP', 'TT'], [left], 4)));
        const b = policy('b', base(blk(['T2', 'TPC', 'TFP', 'TP', 'TT'], [right], 4)));
        const rate = HashComparator.compare(a, b);
        assert.ok(rate >= 0 && rate <= 100);
    });
});

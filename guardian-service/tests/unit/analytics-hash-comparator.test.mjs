import assert from 'node:assert/strict';
import { HashComparator } from '../../dist/analytics/compare/comparators/hash-comparator.js';

const w = (label, weights = ['', '', '', '', label], children = [], length = 0) => ({
    weights,
    label,
    children,
    length,
});

describe('HashComparator.options', () => {
    it('exposes a documented CompareOptions instance', () => {
        const o = HashComparator.options;
        assert.equal(o.idLvl, 'None');
        assert.equal(o.propLvl, 'All');
        assert.equal(o.eventLvl, 'All');
        assert.equal(o.childLvl, 'All');
    });
});

describe('HashComparator.createTree', () => {
    it('returns null for null input', () => {
        assert.equal(HashComparator.createTree(null), null);
    });

    it('emits roles/groups/topics/tokens/tree from a fake policy', () => {
        const policyOptions = HashComparator.options;
        const tree = HashComparator.createTree({
            options: policyOptions,
            roles: [{ toWeight: () => ({ weight: 'r1' }) }],
            groups: [{ toWeight: () => ({ weight: 'g1' }) }],
            topics: [{ toWeight: () => ({ weight: 't1' }) }],
            tokens: [{ toWeight: () => ({ weight: 'tok1' }) }],
            tree: { toWeight: () => ({ weight: 'root' }) },
        });
        assert.deepEqual(tree.roles, [{ weight: 'r1' }]);
        assert.deepEqual(tree.groups, [{ weight: 'g1' }]);
        assert.deepEqual(tree.topics, [{ weight: 't1' }]);
        assert.deepEqual(tree.tokens, [{ weight: 'tok1' }]);
        assert.deepEqual(tree.tree, { weight: 'root' });
    });

    it('omits arrays that are missing on the policy', () => {
        const policyOptions = HashComparator.options;
        const tree = HashComparator.createTree({
            options: policyOptions,
            tree: { toWeight: () => ({ weight: 'root' }) },
        });
        assert.equal(tree.roles, undefined);
        assert.equal(tree.groups, undefined);
        assert.equal(tree.topics, undefined);
        assert.equal(tree.tokens, undefined);
    });
});

describe('HashComparator.createHash / createHashMap', () => {
    it('createHash returns null for null input', () => {
        assert.equal(HashComparator.createHash(null), null);
    });

    it('createHash returns a deterministic non-empty string', () => {
        const policy = {
            options: HashComparator.options,
            tree: { toWeight: () => ({ weight: 'root' }) },
        };
        const a = HashComparator.createHash(policy);
        const b = HashComparator.createHash(policy);
        assert.equal(a, b);
        assert.ok(a.length > 0);
    });

    it('createHashMap returns null fields for null input', async () => {
        const out = await HashComparator.createHashMap(null);
        assert.deepEqual(out, { hash: null, hashMap: null });
    });

    it('createHashMap returns matching {hash, hashMap}', async () => {
        const policy = {
            options: HashComparator.options,
            tree: { toWeight: () => ({ weight: 'root' }) },
        };
        const out = await HashComparator.createHashMap(policy);
        assert.ok(out.hash.length > 0);
        assert.ok(out.hashMap.tree);
    });
});

describe('HashComparator.compare', () => {
    it('returns 0 for null / missing hashMap on either side', () => {
        assert.equal(HashComparator.compare(null, null), 0);
        assert.equal(HashComparator.compare({ hash: 'a', hashMap: null }, { hash: 'b', hashMap: {} }), 0);
        assert.equal(HashComparator.compare({ hash: 'a', hashMap: {} }, null), 0);
    });

    it('returns 100 when both hashes are identical', () => {
        const policy = {
            hash: 'X',
            hashMap: {
                roles: [], groups: [], topics: [], tokens: [],
                tree: { weights: ['', '', '', '', 'type'], children: [], length: 0 },
            },
        };
        assert.equal(HashComparator.compare(policy, policy), 100);
    });

    it('produces a numeric 0–100 rate when hashes differ', () => {
        const policyLeft = {
            hash: 'A',
            hashMap: {
                roles: [], groups: [], topics: [], tokens: [],
                tree: { weights: ['L1', 'L2', 'L3', 'L4', 'tree'], children: [], length: 0 },
            },
        };
        const policyRight = {
            hash: 'B',
            hashMap: {
                roles: [], groups: [], topics: [], tokens: [],
                tree: { weights: ['L1', 'L2', 'L3', 'L4', 'tree'], children: [], length: 0 },
            },
        };
        const rate = HashComparator.compare(policyLeft, policyRight);
        assert.ok(rate >= 0 && rate <= 100);
    });
});

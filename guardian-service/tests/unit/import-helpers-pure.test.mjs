import assert from 'node:assert/strict';
import { checkForCircularDependency } from '../../dist/helpers/import-helpers/common/load-helper.js';
import { findSubTools, importToolErrors } from '../../dist/helpers/import-helpers/tool/tool-import-helper.js';

describe('checkForCircularDependency', () => {
    it('returns false when document is missing', () => {
        assert.equal(checkForCircularDependency({}), false);
    });

    it('returns false when $defs / $id are missing', () => {
        assert.equal(checkForCircularDependency({ document: { $id: '#a' } }), false);
        assert.equal(checkForCircularDependency({ document: { $defs: {} } }), false);
    });

    it('returns true when $defs includes the schema\'s own $id', () => {
        const schema = {
            document: {
                $id: '#self',
                $defs: { '#self': { type: 'object' } },
            },
        };
        assert.equal(checkForCircularDependency(schema), true);
    });

    it('returns false when $defs does not include the $id', () => {
        const schema = {
            document: {
                $id: '#self',
                $defs: { '#other': {} },
            },
        };
        assert.equal(checkForCircularDependency(schema), false);
    });

    it('returns false when $defs is empty', () => {
        const schema = { document: { $id: '#x', $defs: {} } };
        assert.equal(checkForCircularDependency(schema), false);
    });
});

describe('findSubTools', () => {
    it('returns silently for null/undefined block', () => {
        const result = new Set();
        findSubTools(null, result);
        findSubTools(undefined, result);
        assert.equal(result.size, 0);
    });

    it('records messageId when block is a Tool and not the root', () => {
        const result = new Set();
        findSubTools({ blockType: 'tool', messageId: 'm-1' }, result);
        assert.deepEqual(Array.from(result), ['m-1']);
    });

    it('does NOT record the root tool block (isRoot=true)', () => {
        const result = new Set();
        findSubTools({ blockType: 'tool', messageId: 'm-1' }, result, true);
        assert.equal(result.size, 0);
    });

    it('descends into children of a non-tool block', () => {
        const result = new Set();
        const tree = {
            blockType: 'group',
            children: [
                { blockType: 'tool', messageId: 'm-A' },
                { blockType: 'leaf', messageId: 'm-LEAF' }, // not a tool, not recorded
                {
                    blockType: 'group',
                    children: [
                        { blockType: 'tool', messageId: 'm-B' },
                    ],
                },
            ],
        };
        findSubTools(tree, result);
        assert.deepEqual(Array.from(result).sort(), ['m-A', 'm-B']);
    });

    it('does NOT recurse into a non-root tool block (treats it as a leaf)', () => {
        const result = new Set();
        const tree = {
            blockType: 'tool',
            messageId: 'parent-tool',
            children: [
                { blockType: 'tool', messageId: 'inner-tool' },
            ],
        };
        findSubTools(tree, result);
        assert.deepEqual(Array.from(result), ['parent-tool']);
    });

    it('skips a tool block missing a string messageId', () => {
        const result = new Set();
        findSubTools({ blockType: 'tool' }, result);
        findSubTools({ blockType: 'tool', messageId: 123 }, result);
        assert.equal(result.size, 0);
    });

    it('deduplicates repeated messageIds', () => {
        const result = new Set();
        const tree = {
            blockType: 'group',
            children: [
                { blockType: 'tool', messageId: 'dup' },
                { blockType: 'tool', messageId: 'dup' },
            ],
        };
        findSubTools(tree, result);
        assert.equal(result.size, 1);
    });
});

describe('importToolErrors', () => {
    it('groups errors by type and embeds JSON arrays for each', () => {
        const message = importToolErrors([
            { type: 'schema', name: 'A' },
            { type: 'schema', name: 'B' },
            { type: 'tool', name: 'T1' },
            { type: 'other', name: 'O1' },
        ]);
        assert.ok(message.startsWith('Failed to import components:'));
        assert.ok(message.includes('schemas: ["A","B"]'));
        assert.ok(message.includes('tools: ["T1"]'));
        assert.ok(message.includes('others: ["O1"]'));
    });

    it('omits a section with no entries', () => {
        const message = importToolErrors([{ type: 'schema', name: 'A' }]);
        assert.ok(message.includes('schemas:'));
        assert.ok(!message.includes('tools:'));
        assert.ok(!message.includes('others:'));
    });

    it('produces only the prefix for an empty input', () => {
        assert.equal(importToolErrors([]), 'Failed to import components:');
    });
});

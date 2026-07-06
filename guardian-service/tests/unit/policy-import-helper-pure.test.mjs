import assert from 'node:assert/strict';
import { PolicyImportExportHelper } from '../../dist/helpers/import-helpers/policy/policy-import-helper.js';
import { SchemaCache } from '../../dist/helpers/import-helpers/common/load-helper.js';

describe('PolicyImportExportHelper.errorsMessage', () => {
    it('is a static function', () => {
        assert.equal(typeof PolicyImportExportHelper.errorsMessage, 'function');
    });

    it('returns only the prefix for no errors', () => {
        assert.equal(
            PolicyImportExportHelper.errorsMessage([]),
            'Failed to import components:'
        );
    });

    it('renders schema errors as a JSON array', () => {
        assert.equal(
            PolicyImportExportHelper.errorsMessage([{ type: 'schema', name: 'A' }]),
            'Failed to import components: schemas: ["A"];'
        );
    });

    it('renders tool errors as a JSON array', () => {
        assert.equal(
            PolicyImportExportHelper.errorsMessage([{ type: 'tool', name: 'B' }]),
            'Failed to import components: tools: ["B"];'
        );
    });

    it('groups unknown types under others', () => {
        assert.equal(
            PolicyImportExportHelper.errorsMessage([{ type: 'whatever', name: 'C' }]),
            'Failed to import components: others: ["C"];'
        );
    });

    it('combines all three sections in order', () => {
        const msg = PolicyImportExportHelper.errorsMessage([
            { type: 'schema', name: 'A' },
            { type: 'tool', name: 'B' },
            { type: 'misc', name: 'C' }
        ]);
        assert.equal(
            msg,
            'Failed to import components: schemas: ["A"]; tools: ["B"]; others: ["C"];'
        );
    });

    it('groups multiple entries of the same type', () => {
        const msg = PolicyImportExportHelper.errorsMessage([
            { type: 'schema', name: 'A' },
            { type: 'schema', name: 'B' }
        ]);
        assert.equal(msg, 'Failed to import components: schemas: ["A","B"];');
    });

    it('omits sections that have no entries', () => {
        const msg = PolicyImportExportHelper.errorsMessage([{ type: 'tool', name: 'T' }]);
        assert.ok(!msg.includes('schemas'));
        assert.ok(!msg.includes('others'));
    });
});

describe('PolicyImportExportHelper.findTools', () => {
    it('is a static function', () => {
        assert.equal(typeof PolicyImportExportHelper.findTools, 'function');
    });

    it('returns silently for null block', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools(null, result);
        assert.equal(result.size, 0);
    });

    it('records a tool messageId at the root', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({ blockType: 'tool', messageId: 'root-tool' }, result);
        assert.deepEqual([...result], ['root-tool']);
    });

    it('does not descend into a nested tool', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({
            blockType: 'tool',
            messageId: 'outer',
            children: [{ blockType: 'tool', messageId: 'inner' }]
        }, result);
        assert.deepEqual([...result], ['outer']);
    });

    it('skips a tool block without a string messageId', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({ blockType: 'tool' }, result);
        assert.equal(result.size, 0);
    });

    it('skips a tool block with a non-string messageId', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({ blockType: 'tool', messageId: 123 }, result);
        assert.equal(result.size, 0);
    });

    it('descends into children of a container block', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({
            blockType: 'interfaceContainerBlock',
            children: [
                { blockType: 'tool', messageId: 'm1' },
                { blockType: 'tool', messageId: 'm2' }
            ]
        }, result);
        assert.deepEqual([...result].sort(), ['m1', 'm2']);
    });

    it('deduplicates repeated messageIds', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({
            blockType: 'interfaceContainerBlock',
            children: [
                { blockType: 'tool', messageId: 'dup' },
                { blockType: 'tool', messageId: 'dup' }
            ]
        }, result);
        assert.deepEqual([...result], ['dup']);
    });

    it('recurses through nested containers', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({
            blockType: 'interfaceContainerBlock',
            children: [{
                blockType: 'interfaceContainerBlock',
                children: [{ blockType: 'tool', messageId: 'deep' }]
            }]
        }, result);
        assert.deepEqual([...result], ['deep']);
    });

    it('ignores a container block without a children array', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({ blockType: 'interfaceContainerBlock' }, result);
        assert.equal(result.size, 0);
    });
});

describe('SchemaCache', () => {
    it('exposes static cache methods', () => {
        assert.equal(typeof SchemaCache.hasSchema, 'function');
        assert.equal(typeof SchemaCache.getSchema, 'function');
        assert.equal(typeof SchemaCache.setSchema, 'function');
    });

    it('reports false for an unknown key', () => {
        assert.equal(SchemaCache.hasSchema('cache-test-unknown'), false);
    });

    it('stores and retrieves a deep-cloned schema', () => {
        const schema = { name: 'S', nested: { value: 1 } };
        SchemaCache.setSchema('cache-test-1', schema);
        assert.equal(SchemaCache.hasSchema('cache-test-1'), true);
        const got = SchemaCache.getSchema('cache-test-1');
        assert.deepEqual(got, schema);
        assert.notEqual(got, schema);
    });

    it('returns null for a missing key', () => {
        assert.equal(SchemaCache.getSchema('cache-test-missing'), null);
    });

    it('overwrites an existing entry', () => {
        SchemaCache.setSchema('cache-test-2', { v: 1 });
        SchemaCache.setSchema('cache-test-2', { v: 2 });
        assert.deepEqual(SchemaCache.getSchema('cache-test-2'), { v: 2 });
    });

    it('silently ignores values that cannot be serialised', () => {
        const circular = {};
        circular.self = circular;
        SchemaCache.setSchema('cache-test-circular', circular);
        assert.equal(SchemaCache.hasSchema('cache-test-circular'), false);
    });

    it('round-trips array schemas', () => {
        SchemaCache.setSchema('cache-test-arr', [{ a: 1 }, { b: 2 }]);
        assert.deepEqual(SchemaCache.getSchema('cache-test-arr'), [{ a: 1 }, { b: 2 }]);
    });
});

import assert from 'node:assert/strict';
import { findSubTools, importToolErrors } from '../../dist/helpers/import-helpers/tool/tool-import-helper.js';
import { SchemaCache, checkForCircularDependency } from '../../dist/helpers/import-helpers/common/load-helper.js';
import { onlyUnique, fixSchemaDefsOnImport } from '../../dist/helpers/import-helpers/schema/schema-helper.js';
import { publishConfig, getSubject, uniqueDocuments } from '../../dist/api/helpers/policy-statistics-helpers.js';
import { publishLabelConfig } from '../../dist/api/helpers/policy-labels-helpers.js';
import { publishRuleConfig } from '../../dist/api/helpers/schema-rules-helpers.js';

describe('findSubTools', () => {
    it('does nothing for null block', () => {
        const set = new Set();
        findSubTools(null, set);
        assert.equal(set.size, 0);
    });

    it('adds a nested tool messageId', () => {
        const set = new Set();
        findSubTools({ blockType: 'interfaceContainerBlock', children: [{ blockType: 'tool', messageId: 'm1' }] }, set);
        assert.deepEqual([...set], ['m1']);
    });

    it('skips the root tool when isRoot=true and recurses children', () => {
        const set = new Set();
        findSubTools({ blockType: 'tool', messageId: 'root', children: [{ blockType: 'tool', messageId: 'm2' }] }, set, true);
        assert.deepEqual([...set], ['m2']);
    });

    it('ignores a tool without a string messageId', () => {
        const set = new Set();
        findSubTools({ blockType: 'tool', messageId: 123 }, set);
        assert.equal(set.size, 0);
    });

    it('dedups repeated messageIds via the Set', () => {
        const set = new Set();
        findSubTools({
            blockType: 'container',
            children: [
                { blockType: 'tool', messageId: 'dup' },
                { blockType: 'tool', messageId: 'dup' },
            ],
        }, set);
        assert.equal(set.size, 1);
    });

    it('recurses deeply through nested containers', () => {
        const set = new Set();
        findSubTools({
            blockType: 'a',
            children: [{ blockType: 'b', children: [{ blockType: 'tool', messageId: 'deep' }] }],
        }, set);
        assert.deepEqual([...set], ['deep']);
    });

    it('handles a leaf block with no children', () => {
        const set = new Set();
        findSubTools({ blockType: 'buttonBlock' }, set);
        assert.equal(set.size, 0);
    });
});

describe('importToolErrors', () => {
    it('returns the base prefix for an empty list', () => {
        assert.equal(importToolErrors([]), 'Failed to import components:');
    });

    it('groups schema errors', () => {
        const msg = importToolErrors([{ type: 'schema', name: 'S1' }]);
        assert.ok(msg.includes('schemas: ["S1"]'));
    });

    it('groups tool errors', () => {
        const msg = importToolErrors([{ type: 'tool', name: 'T1' }]);
        assert.ok(msg.includes('tools: ["T1"]'));
    });

    it('classifies unknown types as others', () => {
        const msg = importToolErrors([{ type: 'mystery', name: 'X' }]);
        assert.ok(msg.includes('others: ["X"]'));
    });

    it('combines all three categories in order', () => {
        const msg = importToolErrors([
            { type: 'schema', name: 'S' },
            { type: 'tool', name: 'T' },
            { type: 'weird', name: 'O' },
        ]);
        assert.ok(msg.indexOf('schemas') < msg.indexOf('tools'));
        assert.ok(msg.indexOf('tools') < msg.indexOf('others'));
    });

    it('lists multiple names within a category', () => {
        const msg = importToolErrors([{ type: 'schema', name: 'A' }, { type: 'schema', name: 'B' }]);
        assert.ok(msg.includes('["A","B"]'));
    });
});

describe('checkForCircularDependency', () => {
    it('true when $id appears in $defs', () => {
        assert.equal(checkForCircularDependency({ document: { $id: '#x', $defs: { '#x': {} } } }), true);
    });

    it('false when $id not in $defs', () => {
        assert.equal(checkForCircularDependency({ document: { $id: '#x', $defs: { '#y': {} } } }), false);
    });

    it('false when no $defs', () => {
        assert.equal(checkForCircularDependency({ document: { $id: '#x' } }), false);
    });

    it('false when document missing', () => {
        assert.equal(checkForCircularDependency({}), false);
    });
});

describe('onlyUnique (Array.filter predicate)', () => {
    it('removes duplicate primitives keeping first occurrence', () => {
        assert.deepEqual([1, 1, 2, 3, 3].filter(onlyUnique), [1, 2, 3]);
    });

    it('is a no-op on an already-unique array', () => {
        assert.deepEqual(['a', 'b'].filter(onlyUnique), ['a', 'b']);
    });

    it('returns empty for empty input', () => {
        assert.deepEqual([].filter(onlyUnique), []);
    });

    it('keeps the first index for repeated values', () => {
        assert.equal(onlyUnique('z', 0, ['z', 'z']), true);
        assert.equal(onlyUnique('z', 1, ['z', 'z']), false);
    });
});

describe('SchemaCache', () => {
    it('round-trips a schema by id', () => {
        SchemaCache.setSchema('w2-id', { a: 1 });
        assert.equal(SchemaCache.hasSchema('w2-id'), true);
        assert.deepEqual(SchemaCache.getSchema('w2-id'), { a: 1 });
    });

    it('getSchema returns null for an unknown id', () => {
        assert.equal(SchemaCache.getSchema('w2-missing'), null);
    });

    it('hasSchema false for unknown id', () => {
        assert.equal(SchemaCache.hasSchema('w2-nope'), false);
    });

    it('setSchema swallows circular structures (catch branch)', () => {
        const circ = {};
        circ.self = circ;
        SchemaCache.setSchema('w2-circ', circ);
        assert.equal(SchemaCache.hasSchema('w2-circ'), false);
    });
});

describe('fixSchemaDefsOnImport', () => {
    const makeSchema = (iri, fields) => ({
        iri,
        fields,
        conditions: [],
        update(f) { this.fields = f; },
        updateRefs() {},
    });

    it('returns true and caches when iri already mapped', () => {
        const map = { '#a': {} };
        assert.equal(fixSchemaDefsOnImport('#a', [], map), true);
    });

    it('returns false when iri not found among schemas', () => {
        assert.equal(fixSchemaDefsOnImport('#missing', [makeSchema('#a', [])], {}), false);
    });

    it('valid leaf schema with no ref fields returns true and maps', () => {
        const map = {};
        const s = makeSchema('#a', [{ isRef: false, type: 'string' }]);
        assert.equal(fixSchemaDefsOnImport('#a', [s], map), true);
        assert.equal(map['#a'], s);
    });

    it('resolves ref fields recursively when target exists', () => {
        const child = makeSchema('#child', [{ isRef: false, type: 'number' }]);
        const parent = makeSchema('#parent', [{ isRef: true, type: '#child' }]);
        const map = {};
        assert.equal(fixSchemaDefsOnImport('#parent', [parent, child], map), true);
        assert.ok(map['#parent']);
        assert.ok(map['#child']);
    });

    it('nulls a dangling ref field type and returns false', () => {
        const field = { isRef: true, type: '#gone' };
        const parent = makeSchema('#parent', [field]);
        const map = {};
        assert.equal(fixSchemaDefsOnImport('#parent', [parent], map), false);
        assert.equal(field.type, null);
    });
});

describe('publishConfig (statistics)', () => {
    it('filters rules to schemas referenced by variables', () => {
        const data = {
            rules: [{ schemaId: 's1' }, { schemaId: 's2' }],
            variables: [{ schemaId: 's1' }],
        };
        const out = publishConfig(data);
        assert.deepEqual(out.rules, [{ schemaId: 's1' }]);
    });

    it('drops all rules when no variables', () => {
        const out = publishConfig({ rules: [{ schemaId: 's1' }], variables: [] });
        assert.deepEqual(out.rules, []);
    });

    it('tolerates missing rules/variables', () => {
        const out = publishConfig({});
        assert.deepEqual(out.rules, []);
    });

    it('keeps rules referenced by multiple variables once', () => {
        const out = publishConfig({
            rules: [{ schemaId: 's1' }, { schemaId: 's3' }],
            variables: [{ schemaId: 's1' }, { schemaId: 's1' }],
        });
        assert.deepEqual(out.rules, [{ schemaId: 's1' }]);
    });
});

describe('getSubject', () => {
    it('returns the credentialSubject object when it has an id', () => {
        const doc = { document: { credentialSubject: { id: 'x', v: 1 } } };
        assert.deepEqual(getSubject(doc), { id: 'x', v: 1 });
    });

    it('uses the first element of an array credentialSubject', () => {
        const doc = { document: { credentialSubject: [{ id: 'first' }, { id: 'second' }] } };
        assert.equal(getSubject(doc).id, 'first');
    });

    it('returns the document itself when no credentialSubject id', () => {
        const doc = { document: { credentialSubject: { v: 1 } } };
        assert.equal(getSubject(doc), doc);
    });

    it('returns the document when no document field', () => {
        const doc = { other: true };
        assert.equal(getSubject(doc), doc);
    });
});

describe('uniqueDocuments', () => {
    it('returns documents grouped/deduped by schema hash', () => {
        const docs = [
            { schema: 'S', messageId: 'm1', relationships: [] },
            { schema: 'S', messageId: 'm2', relationships: [] },
        ];
        const out = uniqueDocuments(docs);
        assert.equal(out.length, 2);
    });

    it('drops a doc that is a relationship target of another in the same schema', () => {
        const docs = [
            { schema: 'S', messageId: 'm1', relationships: ['m2'] },
            { schema: 'S', messageId: 'm2', relationships: [] },
        ];
        const out = uniqueDocuments(docs);
        const ids = out.map((d) => d.messageId);
        assert.deepEqual(ids, ['m1']);
    });

    it('keeps docs of different schemas independent', () => {
        const docs = [
            { schema: 'A', messageId: 'a1', relationships: [] },
            { schema: 'B', messageId: 'b1', relationships: [] },
        ];
        assert.equal(uniqueDocuments(docs).length, 2);
    });

    it('handles empty input', () => {
        assert.deepEqual(uniqueDocuments([]), []);
    });
});

describe('publish*Config passthroughs', () => {
    it('publishLabelConfig returns its argument unchanged', () => {
        const data = { x: 1 };
        assert.equal(publishLabelConfig(data), data);
    });

    it('publishRuleConfig returns a config object', () => {
        const out = publishRuleConfig({ rules: [], variables: [] });
        assert.equal(typeof out, 'object');
    });
});

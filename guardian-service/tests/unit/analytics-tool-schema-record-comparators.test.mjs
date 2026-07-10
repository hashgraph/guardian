import assert from 'node:assert/strict';
import { ToolComparator } from '../../dist/analytics/compare/comparators/tool-comparator.js';
import { SchemaComparator } from '../../dist/analytics/compare/comparators/schema-comparator.js';
import { RecordComparator } from '../../dist/analytics/compare/comparators/record-comparator.js';
import { ToolModel } from '../../dist/analytics/compare/models/tool.model.js';
import { SchemaModel } from '../../dist/analytics/compare/models/schema.model.js';
import { RecordModel } from '../../dist/analytics/compare/models/record.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };
const schemaOpts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

const tool = (overrides = {}) => new ToolModel({
    id: 't-1', name: 'Tool', description: 'desc', hash: 'h-1', messageId: 'm-1',
    config: { blockType: 'tool', tag: 'tool-root', children: [], inputEvents: [], outputEvents: [], variables: [] },
    ...overrides
}, opts);

const schema = (overrides = {}) => new SchemaModel({
    id: 'sid', name: 'My Schema', uuid: 'sid-uuid', description: 'desc', topicId: '0.0.1',
    version: '1.0.0', iri: '#sid',
    document: { properties: { amount: { type: 'string', title: 'A', description: 'A' } } },
    ...overrides
}, schemaOpts);

const record = (docs = []) => {
    const r = new RecordModel(schemaOpts);
    r.setDocuments(docs);
    return r;
};

describe('ToolComparator', () => {
    it('constructs with default options', () => {
        assert.ok(new ToolComparator());
    });

    it('compare returns one result per right-hand tool', () => {
        assert.equal(new ToolComparator().compare([tool(), tool(), tool()]).length, 2);
    });

    it('compare of a single tool yields no comparisons', () => {
        assert.deepEqual(new ToolComparator().compare([tool()]), []);
    });

    it('a result exposes left/right info and a numeric total', () => {
        const [result] = new ToolComparator().compare([tool(), tool()]);
        assert.ok(result.left);
        assert.ok(result.right);
        assert.equal(typeof result.total, 'number');
    });

    it('two identical tools compare as fully similar', () => {
        const [result] = new ToolComparator().compare([tool(), tool()]);
        assert.equal(result.total, 100);
    });
});

describe('SchemaComparator', () => {
    it('constructs with default options', () => {
        assert.ok(new SchemaComparator());
    });

    it('compare returns a single result object with left/right/total', () => {
        const result = new SchemaComparator().compare(schema(), schema());
        assert.ok(result.left);
        assert.ok(result.right);
        assert.equal(typeof result.total, 'number');
    });

    it('two identical schemas compare as fully similar', () => {
        const result = new SchemaComparator().compare(schema(), schema());
        assert.equal(result.total, 100);
    });

    it('differing schemas produce a lower-or-equal total', () => {
        const a = schema();
        const b = schema({ document: { properties: { other: { type: 'number', title: 'B', description: 'B' } } } });
        const result = new SchemaComparator().compare(a, b);
        assert.ok(result.total <= 100);
    });
});

describe('RecordComparator', () => {
    it('constructs with default options', () => {
        assert.ok(new RecordComparator());
    });

    it('compare of a single record yields no comparisons', () => {
        assert.deepEqual(new RecordComparator().compare([record([])]), []);
    });

    it('compare of an empty list yields no comparisons', () => {
        assert.deepEqual(new RecordComparator().compare([]), []);
    });
});

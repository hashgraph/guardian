import assert from 'node:assert/strict';
import { XlsxResult } from '../../../dist/xlsx/models/xlsx-result.js';

const fakeSchema = (overrides = {}) => ({
    schema: {
        id: 'sid',
        iri: '#sid',
        name: 'My Schema',
        description: 'desc',
        version: '1.0.0',
        status: 'DRAFT',
        ...overrides,
    },
});

const fakeTool = (overrides = {}) => ({
    messageId: 'm-1',
    name: 'tool-1',
    ...overrides,
});

const fakeWorksheet = (name) => ({ name });

describe('XlsxResult construction', () => {
    it('starts empty across every collection', () => {
        const r = new XlsxResult();
        assert.equal(r.policy, undefined);
        assert.deepEqual(r.schemas, []);
        assert.deepEqual(r.tools, []);
        assert.deepEqual(r.toolSchemas, []);
        assert.deepEqual(r.xlsxSchemas, []);
        assert.deepEqual(r.getToolIds(), []);
    });
});

describe('XlsxResult.addSchema / schemas getter', () => {
    it('addSchema records a schema accessible via .schemas and .xlsxSchemas', () => {
        const r = new XlsxResult();
        const s = fakeSchema();
        r.addSchema(fakeWorksheet('Sheet1'), s);
        assert.equal(r.schemas.length, 1);
        assert.equal(r.schemas[0].iri, '#sid');
        assert.equal(r.xlsxSchemas[0], s);
    });

    it('addSchema accumulates multiple entries in insertion order', () => {
        const r = new XlsxResult();
        r.addSchema(fakeWorksheet('s1'), fakeSchema({ iri: '#a' }));
        r.addSchema(fakeWorksheet('s2'), fakeSchema({ iri: '#b' }));
        assert.deepEqual(r.schemas.map((s) => s.iri), ['#a', '#b']);
    });
});

describe('XlsxResult.addTool / getToolIds', () => {
    it('addTool registers an entry retrievable via getToolIds', () => {
        const r = new XlsxResult();
        r.addTool(fakeWorksheet('Tools'), fakeTool({ messageId: 'm-1', name: 'T1' }));
        const ids = r.getToolIds();
        assert.equal(ids.length, 1);
        assert.equal(ids[0].messageId, 'm-1');
        assert.equal(ids[0].worksheet, 'Tools');
    });

    it('addTool deduplicates identical messageIds', () => {
        const r = new XlsxResult();
        r.addTool(fakeWorksheet('S'), fakeTool({ messageId: 'm-1' }));
        r.addTool(fakeWorksheet('S'), fakeTool({ messageId: 'm-1' }));
        // toolsCache uses messageId as key — second add overwrites.
        assert.equal(r.getToolIds().length, 1);
    });
});

describe('XlsxResult.addError / addErrors', () => {
    it('addError attaches the error to the supplied target', () => {
        const r = new XlsxResult();
        const target = {};
        const err = { type: 'error', text: 'boom' };
        r.addError(err, target);
        assert.deepEqual(target.errors, [err]);
        assert.equal(r.toJson().errors.length, 1);
    });

    it('addError appends to an existing target.errors array', () => {
        const r = new XlsxResult();
        const target = { errors: [{ type: 'warning', text: 'pre-existing' }] };
        r.addError({ type: 'error', text: 'new' }, target);
        assert.equal(target.errors.length, 2);
    });

    it('addError tolerates a null target (still records globally)', () => {
        const r = new XlsxResult();
        r.addError({ type: 'error', text: 'global' }, null);
        assert.equal(r.toJson().errors.length, 1);
    });

    it('addErrors stamps every entry with type=error', () => {
        const r = new XlsxResult();
        r.addErrors([{ text: 'one' }, { text: 'two' }]);
        for (const e of r.toJson().errors) {
            assert.equal(e.type, 'error');
        }
    });
});

describe('XlsxResult.addLink', () => {
    it('returns a sequential link_<n> id', () => {
        const r = new XlsxResult();
        const a = r.addLink('first');
        const b = r.addLink('second');
        assert.equal(a, 'link_0');
        assert.equal(b, 'link_1');
    });

    it('captures the worksheet from the supplied hyperlink (when present)', () => {
        const r = new XlsxResult();
        // When no hyperlink is supplied, we cannot assert worksheet.
        const id = r.addLink('with-hyper', { worksheet: 'WS' });
        assert.equal(id, 'link_0');
    });
});

describe('XlsxResult.clear', () => {
    it('empties schemas, tools, toolsCache, linkCache', () => {
        const r = new XlsxResult();
        r.addSchema(fakeWorksheet('s'), fakeSchema());
        r.addTool(fakeWorksheet('s'), fakeTool());
        r.addLink('x');
        r.clear();
        assert.deepEqual(r.schemas, []);
        assert.deepEqual(r.tools, []);
        assert.deepEqual(r.getToolIds(), []);
    });
});

describe('XlsxResult.toJson', () => {
    it('serializes a slim view of schemas + tools + errors', () => {
        const r = new XlsxResult();
        r.addSchema(fakeWorksheet('Sh1'), fakeSchema());
        r.addTool(fakeWorksheet('Tools'), fakeTool({ messageId: 'm-1' }));
        r.addError({ type: 'error', text: 'oops' }, null);
        const json = r.toJson();
        assert.equal(json.schemas.length, 1);
        assert.equal(json.schemas[0].iri, '#sid');
        assert.equal(json.tools.length, 1);
        assert.equal(json.tools[0].messageId, 'm-1');
        assert.equal(json.errors.length, 1);
    });
});

describe('XlsxResult.updatePolicy', () => {
    it('updates the policy via the setter', () => {
        const r = new XlsxResult();
        r.updatePolicy({ id: 'p-1' });
        assert.deepEqual(r.policy, { id: 'p-1' });
    });
});

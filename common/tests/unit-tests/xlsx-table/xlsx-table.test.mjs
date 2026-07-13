import { assert } from 'chai';
import { Table } from '../../../dist/xlsx/models/table.js';
import { Dictionary } from '../../../dist/xlsx/models/dictionary.js';

describe('Table construction', () => {
    it('start === end before setDefault', () => {
        const t = new Table({ c: 1, r: 1 });
        assert.deepEqual(t.end, t.start);
    });

    it('exposes field headers iterator with configured styles', () => {
        const t = new Table({ c: 1, r: 1 });
        const headers = Array.from(t.fieldHeaders);
        assert.isAbove(headers.length, 0);
        for (const h of headers) {
            assert.ok(h.style?.font);
        }
    });

    it('field headers include the required/visibility/default/key columns', () => {
        const t = new Table({ c: 1, r: 1 });
        const titles = Array.from(t.fieldHeaders).map(h => h.title);
        assert.include(titles, Dictionary.REQUIRED_FIELD);
        assert.include(titles, Dictionary.FIELD_TYPE);
        assert.include(titles, Dictionary.QUESTION);
        assert.include(titles, Dictionary.KEY);
        assert.include(titles, Dictionary.DEFAULT);
        assert.include(titles, Dictionary.SUGGEST);
    });

    it('schema headers include name/description/type/tool/tool-id', () => {
        const t = new Table({ c: 1, r: 1 });
        const titles = Array.from(t.schemaHeaders).map(h => h.title);
        assert.include(titles, Dictionary.SCHEMA_NAME);
        assert.include(titles, Dictionary.SCHEMA_DESCRIPTION);
        assert.include(titles, Dictionary.SCHEMA_TYPE);
        assert.include(titles, Dictionary.SCHEMA_TOOL);
        assert.include(titles, Dictionary.SCHEMA_TOOL_ID);
    });
});

describe('Table header recognition', () => {
    it('isSchemaHeader matches schema header titles only', () => {
        const t = new Table({ c: 1, r: 1 });
        assert.isTrue(t.isSchemaHeader(Dictionary.SCHEMA_NAME));
        assert.isTrue(t.isSchemaHeader(Dictionary.SCHEMA_TYPE));
        assert.isFalse(t.isSchemaHeader(Dictionary.REQUIRED_FIELD));
        assert.isFalse(t.isSchemaHeader('Unknown'));
    });

    it('isFieldHeader matches field header titles only', () => {
        const t = new Table({ c: 1, r: 1 });
        assert.isTrue(t.isFieldHeader(Dictionary.REQUIRED_FIELD));
        assert.isTrue(t.isFieldHeader(Dictionary.ANSWER));
        assert.isFalse(t.isFieldHeader(Dictionary.SCHEMA_NAME));
        assert.isFalse(t.isFieldHeader('Unknown'));
    });

    it('isName always returns true', () => {
        const t = new Table({ c: 1, r: 1 });
        assert.isTrue(t.isName('anything'));
        assert.isTrue(t.isName(''));
    });
});

describe('Table.setDefault with tool=true', () => {
    let t;
    beforeEach(() => {
        t = new Table({ c: 2, r: 5 });
        t.setDefault(true);
    });

    it('places schema headers on sequential rows from start', () => {
        assert.equal(t.getRow(Dictionary.SCHEMA_NAME), 5);
        assert.equal(t.getRow(Dictionary.SCHEMA_DESCRIPTION), 6);
        assert.equal(t.getRow(Dictionary.SCHEMA_TYPE), 7);
        assert.equal(t.getRow(Dictionary.SCHEMA_TOOL), 8);
        assert.equal(t.getRow(Dictionary.SCHEMA_TOOL_ID), 9);
    });

    it('places field headers on sequential columns from start', () => {
        assert.equal(t.getCol(Dictionary.REQUIRED_FIELD), 2);
        assert.equal(t.getCol(Dictionary.FIELD_TYPE), 3);
        assert.equal(t.getCol(Dictionary.PARAMETER), 4);
    });

    it('hasCol returns true for placed field headers', () => {
        assert.isTrue(t.hasCol(Dictionary.REQUIRED_FIELD));
    });

    it('getErrorHeader returns null once required headers are placed', () => {
        assert.isNull(t.getErrorHeader());
    });
});

describe('Table.setDefault with tool=false', () => {
    it('removes tool headers from the schema header set', () => {
        const t = new Table({ c: 1, r: 1 });
        t.setDefault(false);
        const titles = Array.from(t.schemaHeaders).map(h => h.title);
        assert.notInclude(titles, Dictionary.SCHEMA_TOOL);
        assert.notInclude(titles, Dictionary.SCHEMA_TOOL_ID);
    });

    it('isSchemaHeader is false for removed tool headers', () => {
        const t = new Table({ c: 1, r: 1 });
        t.setDefault(false);
        assert.isFalse(t.isSchemaHeader(Dictionary.SCHEMA_TOOL));
    });
});

describe('Table set/get coordinates', () => {
    it('hasCol is false for a freshly constructed unplaced header', () => {
        const t = new Table({ c: 1, r: 1 });
        assert.isFalse(t.hasCol(Dictionary.REQUIRED_FIELD));
    });

    it('setCol updates a field header column', () => {
        const t = new Table({ c: 1, r: 1 });
        t.setCol(Dictionary.REQUIRED_FIELD, 12);
        assert.equal(t.getCol(Dictionary.REQUIRED_FIELD), 12);
    });

    it('setRow updates a schema header row', () => {
        const t = new Table({ c: 1, r: 1 });
        t.setRow(Dictionary.SCHEMA_NAME, 42);
        assert.equal(t.getRow(Dictionary.SCHEMA_NAME), 42);
    });

    it('setCol on an unknown name is a no-op (does not throw)', () => {
        const t = new Table({ c: 1, r: 1 });
        assert.doesNotThrow(() => t.setCol('Unknown', 1));
    });

    it('setEnd updates the end coordinate', () => {
        const t = new Table({ c: 1, r: 1 });
        t.setEnd(10, 20);
        assert.deepEqual(t.end, { c: 10, r: 20 });
    });
});

describe('Table.getErrorHeader', () => {
    it('returns a required field header that has not been placed', () => {
        const t = new Table({ c: 1, r: 1 });
        const err = t.getErrorHeader();
        assert.isNotNull(err);
        assert.isTrue(err.required);
    });
});

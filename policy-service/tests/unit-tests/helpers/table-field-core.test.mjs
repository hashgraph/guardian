import assert from 'node:assert/strict';
import {
    isPlainObject,
    isTableValue,
    buildTableHelper,
} from '../../../dist/policy-engine/helpers/table-field-core.js';

describe('isPlainObject', () => {
    it('returns true for object literals and Object()', () => {
        assert.equal(isPlainObject({}), true);
        assert.equal(isPlainObject({ a: 1 }), true);
        assert.equal(isPlainObject(Object()), true);
    });

    it('returns false for null/undefined/primitives', () => {
        assert.equal(isPlainObject(null), false);
        assert.equal(isPlainObject(undefined), false);
        assert.equal(isPlainObject(0), false);
        assert.equal(isPlainObject('s'), false);
        assert.equal(isPlainObject(true), false);
    });

    it('returns false for arrays and class instances', () => {
        assert.equal(isPlainObject([]), false);
        class Foo {}
        assert.equal(isPlainObject(new Foo()), false);
    });
});

describe('isTableValue', () => {
    it('returns true for { type: "table", ... }', () => {
        assert.equal(isTableValue({ type: 'table' }), true);
        assert.equal(isTableValue({ type: 'table', rows: [], columnKeys: [] }), true);
    });

    it('returns false for plain objects without type=table', () => {
        assert.equal(isTableValue({}), false);
        assert.equal(isTableValue({ type: 'image' }), false);
    });

    it('returns false for non-plain-objects', () => {
        assert.equal(isTableValue(null), false);
        assert.equal(isTableValue('table'), false);
        assert.equal(isTableValue([]), false);
    });
});

describe('buildTableHelper().normalize', () => {
    const helper = buildTableHelper();

    it('returns an empty table for null', () => {
        const out = helper.normalize(null);
        assert.equal(out.type, 'table');
        assert.deepEqual(out.columnKeys, []);
        assert.deepEqual(out.rows, []);
    });

    it('parses a JSON string into a table', () => {
        const json = JSON.stringify({
            type: 'table',
            columnKeys: ['a'],
            rows: [{ a: '1' }],
        });
        const out = helper.normalize(json);
        assert.equal(out.type, 'table');
        assert.deepEqual(out.columnKeys, ['a']);
        assert.deepEqual(out.rows, [{ a: '1' }]);
    });

    it('returns an empty table for invalid JSON', () => {
        const out = helper.normalize('{not json');
        assert.equal(out.type, 'table');
        assert.deepEqual(out.columnKeys, []);
        assert.deepEqual(out.rows, []);
    });

    it('returns an empty table for non-table objects', () => {
        const out = helper.normalize({ type: 'image' });
        assert.equal(out.type, 'table');
        assert.deepEqual(out.columnKeys, []);
        assert.deepEqual(out.rows, []);
    });

    it('coerces missing rows/columnKeys arrays to []', () => {
        const out = helper.normalize({ type: 'table' });
        assert.deepEqual(out.rows, []);
        assert.deepEqual(out.columnKeys, []);
    });

    it('preserves a string fileId on the normalized output', () => {
        const out = helper.normalize({ type: 'table', fileId: 'F1' });
        assert.equal(out.fileId, 'F1');
    });
});

describe('buildTableHelper() with a tablesPack', () => {
    const pack = {
        F1: { columnKeys: ['k'], rows: [{ k: 'a' }, { k: 'b' }] },
    };
    const helper = buildTableHelper(pack);

    it('substitutes packed rows/columnKeys when fileId is a known key', () => {
        const out = helper.normalize({ type: 'table', fileId: 'F1' });
        assert.deepEqual(out.columnKeys, ['k']);
        assert.deepEqual(out.rows, [{ k: 'a' }, { k: 'b' }]);
        assert.equal(out.fileId, 'F1');
    });

    it('falls through to inline rows when fileId is not in the pack', () => {
        const out = helper.normalize({
            type: 'table',
            fileId: 'UNKNOWN',
            columnKeys: ['z'],
            rows: [{ z: '9' }],
        });
        assert.deepEqual(out.columnKeys, ['z']);
        assert.deepEqual(out.rows, [{ z: '9' }]);
    });
});

describe('buildTableHelper() row/cell/column accessors', () => {
    const helper = buildTableHelper();
    const table = {
        type: 'table',
        columnKeys: ['a', 'b'],
        rows: [
            { a: '1', b: '2' },
            { a: '3', b: '4' },
        ],
    };

    it('keys() prefers explicit columnKeys', () => {
        assert.deepEqual(helper.keys(table), ['a', 'b']);
    });

    it('keys() falls back to first-row keys when columnKeys is empty', () => {
        const tNoKeys = { type: 'table', columnKeys: [], rows: [{ x: '1', y: '2' }] };
        assert.deepEqual(helper.keys(tNoKeys), ['x', 'y']);
    });

    it('rows() returns the rows array', () => {
        assert.deepEqual(helper.rows(table), table.rows);
    });

    it('cell() looks up by row index and string key', () => {
        assert.equal(helper.cell(table, 1, 'b'), '4');
    });

    it('cell() looks up by row index and numeric column index', () => {
        assert.equal(helper.cell(table, 0, 0), '1');
        assert.equal(helper.cell(table, 1, 1), '4');
    });

    it('cell() returns undefined for out-of-range row index', () => {
        assert.equal(helper.cell(table, 5, 'a'), undefined);
    });

    it('col() returns the values for a string key', () => {
        assert.deepEqual(helper.col(table, 'a'), ['1', '3']);
    });

    it('col() returns the values for a numeric key index', () => {
        assert.deepEqual(helper.col(table, 1), ['2', '4']);
    });
});

describe('buildTableHelper().num', () => {
    const { num } = buildTableHelper();

    it('passes numbers through', () => {
        assert.equal(num(0), 0);
        assert.equal(num(-3.14), -3.14);
    });

    it('returns 0 for non-finite numbers', () => {
        assert.equal(num(Infinity), 0);
        assert.equal(num(NaN), 0);
    });

    it('parses dotted-decimal strings', () => {
        assert.equal(num('1.5'), 1.5);
    });

    it('treats comma as decimal separator', () => {
        assert.equal(num('1,5'), 1.5);
    });

    it('returns 0 for unparseable strings or non-numeric types', () => {
        assert.equal(num('abc'), 0);
        assert.equal(num({}), 0);
        assert.equal(num(null), 0);
        assert.equal(num(undefined), 0);
        assert.equal(num(true), 0);
    });
});

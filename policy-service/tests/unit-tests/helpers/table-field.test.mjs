import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {
    parseCsvToTable,
    decodeGridFileText,
    isPlainObject,
    isTableValue,
    isTableWithFileId,
    parseIfJson,
    hydrateTablesInObject,
    collectTablesPack
} from '../../../dist/policy-engine/helpers/table-field.js';

describe('table-field helpers', () => {
    it('exports are defined', () => {
        assert.equal(typeof parseCsvToTable, 'function');
        assert.equal(typeof decodeGridFileText, 'function');
        assert.equal(typeof isPlainObject, 'function');
        assert.equal(typeof isTableValue, 'function');
        assert.equal(typeof isTableWithFileId, 'function');
        assert.equal(typeof parseIfJson, 'function');
        assert.equal(typeof hydrateTablesInObject, 'function');
        assert.equal(typeof collectTablesPack, 'function');
    });

    describe('parseCsvToTable', () => {
        it('parses a basic comma-delimited table', () => {
            const { columnKeys, rows } = parseCsvToTable('a,b,c\n1,2,3\n4,5,6');
            assert.deepEqual(columnKeys, ['a', 'b', 'c']);
            assert.deepEqual(rows, [
                { a: '1', b: '2', c: '3' },
                { a: '4', b: '5', c: '6' }
            ]);
        });

        it('returns empty result for empty input', () => {
            const { columnKeys, rows } = parseCsvToTable('');
            assert.deepEqual(columnKeys, []);
            assert.deepEqual(rows, []);
        });

        it('returns header only with no data rows', () => {
            const { columnKeys, rows } = parseCsvToTable('x,y');
            assert.deepEqual(columnKeys, ['x', 'y']);
            assert.deepEqual(rows, []);
        });

        it('strips a leading BOM from the header', () => {
            const { columnKeys } = parseCsvToTable('﻿a,b\n1,2');
            assert.deepEqual(columnKeys, ['a', 'b']);
        });

        it('trims header keys and cell values', () => {
            const { columnKeys, rows } = parseCsvToTable(' a , b \n  1  ,  2  ');
            assert.deepEqual(columnKeys, ['a', 'b']);
            assert.deepEqual(rows, [{ a: '1', b: '2' }]);
        });

        it('honours quoted fields containing the delimiter', () => {
            const { rows } = parseCsvToTable('a,b\n"x,y",z');
            assert.deepEqual(rows, [{ a: 'x,y', b: 'z' }]);
        });

        it('honours quoted fields containing newlines', () => {
            const { rows } = parseCsvToTable('a,b\n"line1\nline2",z');
            assert.deepEqual(rows, [{ a: 'line1\nline2', b: 'z' }]);
        });

        it('handles escaped double quotes inside a quoted field', () => {
            const { rows } = parseCsvToTable('a,b\n"he said ""hi""",z');
            assert.deepEqual(rows, [{ a: 'he said "hi"', b: 'z' }]);
        });

        it('supports an alternate delimiter', () => {
            const { columnKeys, rows } = parseCsvToTable('a;b\n1;2', ';');
            assert.deepEqual(columnKeys, ['a', 'b']);
            assert.deepEqual(rows, [{ a: '1', b: '2' }]);
        });

        it('handles CRLF line endings', () => {
            const { rows } = parseCsvToTable('a,b\r\n1,2\r\n3,4');
            assert.deepEqual(rows, [
                { a: '1', b: '2' },
                { a: '3', b: '4' }
            ]);
        });

        it('skips rows that are entirely blank', () => {
            const { rows } = parseCsvToTable('a,b\n1,2\n,\n3,4');
            assert.deepEqual(rows, [
                { a: '1', b: '2' },
                { a: '3', b: '4' }
            ]);
        });

        it('fills missing trailing cells with empty strings', () => {
            const { rows } = parseCsvToTable('a,b,c\n1,2');
            assert.deepEqual(rows, [{ a: '1', b: '2', c: '' }]);
        });

        it('uses the column index as key when a header is empty', () => {
            const { columnKeys, rows } = parseCsvToTable('a,,c\n1,2,3');
            assert.deepEqual(columnKeys, ['a', '', 'c']);
            assert.deepEqual(rows, [{ a: '1', 1: '2', c: '3' }]);
        });

        it('parses a single-column table', () => {
            const { columnKeys, rows } = parseCsvToTable('h\n1\n2');
            assert.deepEqual(columnKeys, ['h']);
            assert.deepEqual(rows, [{ h: '1' }, { h: '2' }]);
        });

        it('handles a trailing newline without producing a blank row', () => {
            const { rows } = parseCsvToTable('a,b\n1,2\n');
            assert.deepEqual(rows, [{ a: '1', b: '2' }]);
        });

        it('handles lone CR line endings', () => {
            const { rows } = parseCsvToTable('a,b\r1,2\r3,4');
            assert.deepEqual(rows, [
                { a: '1', b: '2' },
                { a: '3', b: '4' }
            ]);
        });

        it('keeps an empty quoted field as an empty string', () => {
            const { rows } = parseCsvToTable('a,b\n"",z');
            assert.deepEqual(rows, [{ a: '', b: 'z' }]);
        });

        it('treats a partially-blank row as data, not skipped', () => {
            const { rows } = parseCsvToTable('a,b\n1,');
            assert.deepEqual(rows, [{ a: '1', b: '' }]);
        });

        it('parses values with leading and trailing quoted whitespace', () => {
            const { rows } = parseCsvToTable('a\n"  spaced  "');
            assert.deepEqual(rows, [{ a: 'spaced' }]);
        });
    });

    describe('decodeGridFileText', () => {
        it('decodes a plain utf8 buffer', async () => {
            const text = await decodeGridFileText(Buffer.from('hello world', 'utf8'));
            assert.equal(text, 'hello world');
        });

        it('decompresses a gzip buffer', async () => {
            const gz = gzipSync(Buffer.from('compressed payload', 'utf8'));
            const text = await decodeGridFileText(gz);
            assert.equal(text, 'compressed payload');
        });

        it('handles an empty buffer', async () => {
            const text = await decodeGridFileText(Buffer.alloc(0));
            assert.equal(text, '');
        });

        it('respects an explicit encoding', async () => {
            const buf = Buffer.from('abc', 'utf8');
            const text = await decodeGridFileText(buf, 'base64');
            assert.equal(text, buf.toString('base64'));
        });
    });

    describe('isPlainObject', () => {
        it('is true for an object literal', () => {
            assert.equal(isPlainObject({ a: 1 }), true);
        });
        it('is true for an empty object', () => {
            assert.equal(isPlainObject({}), true);
        });
        it('is false for null', () => {
            assert.equal(isPlainObject(null), false);
        });
        it('is false for undefined', () => {
            assert.equal(isPlainObject(undefined), false);
        });
        it('is false for an array', () => {
            assert.equal(isPlainObject([1, 2]), false);
        });
        it('is false for a primitive string', () => {
            assert.equal(isPlainObject('x'), false);
        });
        it('is false for a number', () => {
            assert.equal(isPlainObject(5), false);
        });
        it('is false for a class instance', () => {
            class Foo {}
            assert.equal(isPlainObject(new Foo()), false);
        });
    });

    describe('isTableValue', () => {
        it('is true for a plain object with type table', () => {
            assert.equal(isTableValue({ type: 'table' }), true);
        });
        it('is false for a plain object with a different type', () => {
            assert.equal(isTableValue({ type: 'other' }), false);
        });
        it('is false for a non-object', () => {
            assert.equal(isTableValue('table'), false);
        });
        it('is false for null', () => {
            assert.equal(isTableValue(null), false);
        });
    });

    describe('isTableWithFileId', () => {
        it('is true for a table with a non-empty fileId', () => {
            assert.equal(isTableWithFileId({ type: 'table', fileId: 'abc' }), true);
        });
        it('is false when fileId is an empty string', () => {
            assert.equal(isTableWithFileId({ type: 'table', fileId: '' }), false);
        });
        it('is false when fileId is whitespace only', () => {
            assert.equal(isTableWithFileId({ type: 'table', fileId: '   ' }), false);
        });
        it('is false when fileId is missing', () => {
            assert.equal(isTableWithFileId({ type: 'table' }), false);
        });
        it('is false when fileId is not a string', () => {
            assert.equal(isTableWithFileId({ type: 'table', fileId: 123 }), false);
        });
        it('is false when not a table', () => {
            assert.equal(isTableWithFileId({ type: 'x', fileId: 'abc' }), false);
        });
    });

    describe('parseIfJson', () => {
        it('parses a JSON object string', () => {
            assert.deepEqual(parseIfJson('{"a":1}'), { a: 1 });
        });
        it('parses a JSON array string', () => {
            assert.deepEqual(parseIfJson('[1,2,3]'), [1, 2, 3]);
        });
        it('trims surrounding whitespace before parsing', () => {
            assert.deepEqual(parseIfJson('   {"a":1}   '), { a: 1 });
        });
        it('returns the original for a non-string input', () => {
            const obj = { a: 1 };
            assert.equal(parseIfJson(obj), obj);
        });
        it('returns the original for an empty string', () => {
            assert.equal(parseIfJson(''), '');
        });
        it('returns the original for plain text', () => {
            assert.equal(parseIfJson('hello'), 'hello');
        });
        it('returns the original for malformed JSON', () => {
            assert.equal(parseIfJson('{not json}'), '{not json}');
        });
        it('returns a number input unchanged', () => {
            assert.equal(parseIfJson(42), 42);
        });
    });

    describe('hydrateTablesInObject', () => {
        it('returns a no-op disposer for null root', async () => {
            const dispose = await hydrateTablesInObject(null, async () => '');
            assert.equal(typeof dispose, 'function');
            dispose();
        });

        it('hydrates a table node from CSV and disposes it', async () => {
            const root = { table: { type: 'table', fileId: 'f1' } };
            const loader = async (id) => {
                assert.equal(id, 'f1');
                return 'a,b\n1,2';
            };
            const dispose = await hydrateTablesInObject(root, loader);
            assert.deepEqual(root.table.columnKeys, ['a', 'b']);
            assert.deepEqual(root.table.rows, [{ a: '1', b: '2' }]);
            dispose();
            assert.equal(root.table.columnKeys, undefined);
            assert.equal(root.table.rows, undefined);
        });

        it('does not reload a table already containing columns and rows', async () => {
            const root = {
                table: { type: 'table', fileId: 'f1', columnKeys: ['x'], rows: [{ x: '9' }] }
            };
            let called = false;
            const dispose = await hydrateTablesInObject(root, async () => {
                called = true;
                return 'a\n1';
            });
            assert.equal(called, false);
            assert.deepEqual(root.table.rows, [{ x: '9' }]);
            dispose();
        });

        it('hydrates a JSON-string table value and restores the string on dispose', async () => {
            const root = { cell: JSON.stringify({ type: 'table', fileId: 'f2' }) };
            const dispose = await hydrateTablesInObject(root, async () => 'h\nv');
            assert.equal(typeof root.cell, 'object');
            assert.equal(root.cell.type, 'table');
            dispose();
            assert.equal(typeof root.cell, 'string');
        });

        it('hydrates tables nested inside arrays', async () => {
            const root = { list: [{ type: 'table', fileId: 'f3' }] };
            const dispose = await hydrateTablesInObject(root, async () => 'k\n7');
            assert.deepEqual(root.list[0].rows, [{ k: '7' }]);
            dispose();
        });
    });

    describe('collectTablesPack', () => {
        it('collects a single hydrated table', () => {
            const root = {
                t: { type: 'table', fileId: 'f1', rows: [{ a: '1' }], columnKeys: ['a'] }
            };
            const pack = collectTablesPack(root);
            assert.deepEqual(pack, { f1: { rows: [{ a: '1' }], columnKeys: ['a'] } });
        });

        it('ignores tables missing rows or columnKeys', () => {
            const root = { t: { type: 'table', fileId: 'f1' } };
            assert.deepEqual(collectTablesPack(root), {});
        });

        it('collects tables nested in arrays and objects', () => {
            const root = {
                arr: [{ type: 'table', fileId: 'a', rows: [], columnKeys: [] }],
                nested: { inner: { type: 'table', fileId: 'b', rows: [{ x: '1' }], columnKeys: ['x'] } }
            };
            const pack = collectTablesPack(root);
            assert.deepEqual(Object.keys(pack).sort(), ['a', 'b']);
        });

        it('returns the provided accumulator for null root', () => {
            const acc = {};
            assert.equal(collectTablesPack(null, acc), acc);
            assert.deepEqual(acc, {});
        });

        it('merges into an existing accumulator', () => {
            const acc = { existing: { rows: [], columnKeys: [] } };
            const root = { t: { type: 'table', fileId: 'f', rows: [], columnKeys: [] } };
            const pack = collectTablesPack(root, acc);
            assert.deepEqual(Object.keys(pack).sort(), ['existing', 'f']);
        });
    });
});

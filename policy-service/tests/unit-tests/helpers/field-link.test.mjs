import { assert } from 'chai';
import { FieldLink } from '../../../dist/policy-engine/helpers/math-model/field-link.js';

describe('FieldLink', () => {
    it('constructs with empty defaults and a generated id', () => {
        const link = new FieldLink();
        assert.equal(link.variableNameText, '');
        assert.equal(link.field, '');
        assert.match(link.id, /^[0-9a-f-]+$/);
        assert.equal(link.empty, true);
        assert.equal(link.validated, false);
    });

    it('captures supplied name + path', () => {
        const link = new FieldLink('myVar', 'a.b');
        assert.equal(link.variableNameText, 'myVar');
        assert.equal(link.field, 'a.b');
        assert.equal(link.path, 'a.b');
    });

    describe('update / validate', () => {
        it('marks validName=true for an identifier-like name and validField when path is set', () => {
            const link = new FieldLink('myVar', 'a.b');
            link.update();
            assert.equal(link.validName, true);
            assert.equal(link.validField, true);
            assert.equal(link.valid, true);
            assert.equal(link.error, '');
        });

        it('marks invalid name with explicit error string', () => {
            const link = new FieldLink('1bad-name', 'a.b');
            link.update();
            assert.equal(link.validName, false);
            assert.equal(link.error, 'Invalid name');
        });

        it('marks invalid field when path is empty', () => {
            const link = new FieldLink('valid', '');
            link.update();
            assert.equal(link.validField, false);
            assert.equal(link.error, 'Invalid field');
        });

        it('treats a whitespace-only name as invalid', () => {
            const link = new FieldLink('   ', 'a.b');
            link.update();
            assert.equal(link.validName, false);
        });

        it('flips empty=false after first update', () => {
            const link = new FieldLink('a', 'b');
            assert.equal(link.empty, true);
            link.update();
            assert.equal(link.empty, false);
        });

        it('validate() sets validated=true and re-runs internal checks', () => {
            const link = new FieldLink('a', 'b');
            link.validate();
            assert.equal(link.validated, true);
            assert.equal(link.valid, true);
        });
    });

    describe('subscribe / destroy', () => {
        it('subscribe receives the callback and update() invokes it', () => {
            const link = new FieldLink('a', 'b');
            let called = 0;
            link.subscribe(() => { called++; });
            link.update();
            assert.equal(called, 1);
        });

        it('destroy() clears the subscriber', () => {
            const link = new FieldLink('a', 'b');
            let called = 0;
            link.subscribe(() => { called++; });
            link.destroy();
            link.update();
            assert.equal(called, 0);
        });
    });

    describe('getLatex / toJson', () => {
        it('getLatex returns null when invalid', () => {
            const link = new FieldLink('1bad', '');
            link.update();
            assert.equal(link.getLatex(), null);
        });

        it('toJson serialises to { type, name, description, field, schema }', () => {
            const link = new FieldLink('a', 'b');
            link.schema = 'sch1';
            link.description = 'desc';
            link.update();
            const json = link.toJson();
            assert.equal(json.type, link.type);
            assert.equal(json.name, 'a');
            assert.equal(json.description, 'desc');
            assert.equal(json.field, 'b');
            assert.equal(json.schema, 'sch1');
        });

        it("toJson returns '' for missing schema/description", () => {
            const link = new FieldLink('a', 'b');
            const json = link.toJson();
            assert.equal(json.schema, '');
            assert.equal(json.description, '');
        });
    });

    describe('static from', () => {
        it('returns null for non-object input', () => {
            assert.equal(FieldLink.from(null), null);
            assert.equal(FieldLink.from('not-an-object'), null);
        });

        it('rebuilds the link from a JSON snapshot', () => {
            const link = FieldLink.from({
                type: 'LINK',
                name: 'qty',
                description: 'd',
                field: 'a.b',
                schema: 'sch1',
            });
            assert.ok(link);
            assert.equal(link.variableNameText, 'qty');
            assert.equal(link.field, 'a.b');
            assert.equal(link.schema, 'sch1');
            assert.equal(link.description, 'd');
            assert.equal(link.empty, false);
        });
    });

    describe('table output', () => {
        const tableLink = (rows) => FieldLink.from({
            type: 'link',
            name: '',
            description: '',
            field: 'results',
            schema: '',
            rows
        });

        it('is a table only when it carries rows', () => {
            assert.equal(new FieldLink('a', 'b').isTable, false);
            assert.equal(tableLink([]).isTable, true);
        });

        it('keeps the rows through toJson and from', () => {
            const rows = [{ year: 'y1', value: 'r1' }, { year: '', value: 'r2' }];
            const json = tableLink(rows).toJson();
            assert.deepEqual(json.rows, rows);
            assert.notEqual(json.rows[0], rows[0]);
            assert.deepEqual(FieldLink.from(json).rows, rows);
        });

        it('leaves rows out of the JSON of an ordinary output', () => {
            const link = new FieldLink('a', 'b');
            assert.equal('rows' in link.toJson(), false);
        });

        it('is valid with an empty name when every filled cell is a variable name', () => {
            const link = tableLink([{ a: 'r1', b: '' }, { a: 'x,i', b: '  ' }]);
            link.update();
            assert.equal(link.validName, true);
            assert.equal(link.valid, true);
        });

        it('is invalid when a filled cell is not a variable name', () => {
            const link = tableLink([{ a: 'r1', b: '1bad' }]);
            link.update();
            assert.equal(link.validName, false);
            assert.equal(link.error, 'Invalid name');
        });

        it('rejects a non-string cell from imported JSON', () => {
            const link = tableLink([{ a: 123 }]);
            link.update();
            assert.equal(link.validName, false);
            assert.equal(link.error, 'Invalid name');
        });

        it('rejects more than 1000 rows', () => {
            const link = tableLink(Array.from({ length: 1001 }, () => ({ a: '' })));
            link.update();
            assert.equal(link.validName, false);
            assert.equal(link.error, 'Too many rows');
        });

        it('is invalid without a field', () => {
            const link = tableLink([{ a: 'r1' }]);
            link.field = '';
            link.update();
            assert.equal(link.validField, false);
        });

        it('lists the normalised names of the filled cells', () => {
            const link = tableLink([{ a: 'r1', b: '' }, { a: 'x,i', b: 'r1' }]);
            assert.deepEqual(link.getCellNames(), ['r1', 'x_i', 'r1']);
        });

        it('fills each cell from the scope and leaves an empty cell empty', () => {
            const link = tableLink([{ a: 'r1', b: '' }, { a: 'list', b: 'missing' }]);
            const rows = link.getTableRows({ r1: 5, list: [1, 2] });
            assert.deepEqual(rows, [
                { a: 5, b: '' },
                { a: [1, 2], b: undefined }
            ]);
        });
    });

    describe('table list output', () => {
        const tableListLink = (tables) => FieldLink.from({
            type: 'link',
            name: '',
            description: '',
            field: 'sites.results',
            schema: '',
            tables
        });

        it('is a table and a table list when it carries tables', () => {
            const link = tableListLink([[{ a: 'r1' }]]);
            assert.equal(link.isTable, true);
            assert.equal(link.isTableList, true);
            assert.equal(link.rows, null);
        });

        it('keeps the tables through toJson and from', () => {
            const tables = [[{ a: 'r1' }], [{ a: '' }, { a: 'r2' }]];
            const json = tableListLink(tables).toJson();
            assert.deepEqual(json.tables, tables);
            assert.equal('rows' in json, false);
            assert.deepEqual(FieldLink.from(json).tables, tables);
        });

        it('checks the cells of every table', () => {
            const link = tableListLink([[{ a: 'r1' }], [{ a: '1bad' }]]);
            link.update();
            assert.equal(link.validName, false);
            assert.equal(link.error, 'Invalid name');
        });

        it('counts the 1000-row limit across all tables', () => {
            const link = tableListLink([
                Array.from({ length: 600 }, () => ({ a: '' })),
                Array.from({ length: 401 }, () => ({ a: '' }))
            ]);
            link.update();
            assert.equal(link.error, 'Too many rows');
        });

        it('rejects more than 100 tables', () => {
            const link = tableListLink(Array.from({ length: 101 }, () => []));
            link.update();
            assert.equal(link.validName, false);
            assert.equal(link.error, 'Too many tables');
        });

        it('fills every table from the scope and names the cells of all tables', () => {
            const link = tableListLink([[{ a: 'r1' }], [{ a: 'r2' }, { a: '' }]]);
            assert.deepEqual(link.getTableList({ r1: 1, r2: 2 }), [[{ a: 1 }], [{ a: 2 }, { a: '' }]]);
            assert.deepEqual(link.getCellNames(), ['r1', 'r2']);
        });
    });

    describe('column table output', () => {
        const columnLink = (columns) => FieldLink.from({
            type: 'link',
            name: '',
            description: '',
            field: 'results',
            schema: '#s',
            columns
        });

        it('is a single table and keeps the columns through toJson and from', () => {
            const link = columnLink({ year: 'y', co2: '' });
            assert.equal(link.isTable, true);
            assert.equal(link.isTableList, false);
            const json = link.toJson();
            assert.deepEqual(json.columns, { year: 'y', co2: '' });
            assert.equal('rows' in json, false);
            assert.equal('tables' in json, false);
            assert.deepEqual(FieldLink.from(json).columns, { year: 'y', co2: '' });
        });

        it('accepts variable names and empty columns, and names the bound variables', () => {
            const link = columnLink({ year: 'y', co2: '', area: 'x,i' });
            link.update();
            assert.equal(link.validName, true);
            assert.equal(link.error, '');
            assert.deepEqual(link.getCellNames(), ['y', 'x_i']);
        });

        it('rejects a column that is not a variable name or not a string', () => {
            const bad = columnLink({ year: '1bad' });
            bad.update();
            assert.equal(bad.validName, false);
            assert.equal(bad.error, 'Invalid name');
            const number = columnLink({ year: 5 });
            number.update();
            assert.equal(number.validName, false);
        });

        it('puts element N of every list into row N and fills shorter lists with empty cells', () => {
            const link = columnLink({ year: 'y', co2: 'c', note: '' });
            assert.deepEqual(link.getTableRows({ y: [2020, 2021, 2022], c: [42, 20] }), [
                { year: 2020, co2: 42, note: '' },
                { year: 2021, co2: 20, note: '' },
                { year: 2022, co2: '', note: '' }
            ]);
        });

        it('repeats a single value in every row and keeps nested values as they are', () => {
            const link = columnLink({ year: 'y', site: 's', area: 'a' });
            assert.deepEqual(link.getTableRows({ y: [2020, 2021], s: 'S1', a: [[1, 2], [3]] }), [
                { year: 2020, site: 'S1', area: [1, 2] },
                { year: 2021, site: 'S1', area: [3] }
            ]);
        });

        it('makes one row from single values and no rows when no column is bound', () => {
            assert.deepEqual(columnLink({ year: 'y', co2: '' }).getTableRows({ y: 2020 }), [
                { year: 2020, co2: '' }
            ]);
            assert.deepEqual(columnLink({ year: '', co2: '' }).getTableRows({}), []);
        });

        it('makes no rows from an empty list', () => {
            assert.deepEqual(columnLink({ year: 'y', site: 's' }).getTableRows({ y: [], s: 'S1' }), []);
        });

        it('rejects more than 10000 rows', () => {
            const link = columnLink({ year: 'y' });
            assert.equal(link.getTableRows({ y: new Array(10000).fill(1) }).length, 10000);
            assert.throws(
                () => link.getTableRows({ y: new Array(10001).fill(1) }),
                'Too many rows: 10001. The limit is 10000'
            );
        });

        it('is not limited to 1000 rows by the grid limit', () => {
            const link = columnLink({ year: 'y' });
            link.update();
            assert.equal(link.validName, true);
            assert.equal(link.getTableRows({ y: new Array(1500).fill(1) }).length, 1500);
        });

        it('rejects a huge list before it builds any row', () => {
            const link = columnLink({ year: 'y', co2: 'c' });
            assert.throws(
                () => link.getTableRows({ y: new Array(1000000000), c: 1 }),
                'Too many rows: 1000000000. The limit is 10000'
            );
        });

        it('names the configured columns the schema does not declare', () => {
            assert.deepEqual(columnLink({ year: 'y', yeer: 'z', co2: '' }).getUnknownColumns(['year', 'co2']), ['yeer']);
            assert.deepEqual(columnLink({ year: 'y' }).getUnknownColumns(['year', 'co2']), []);
            const grid = FieldLink.from({ type: 'link', name: '', description: '', field: 'results', schema: '', rows: [{ year: 'y' }, { note: '' }] });
            assert.deepEqual(grid.getUnknownColumns(['year']), ['note']);
            const list = FieldLink.from({ type: 'link', name: '', description: '', field: 'results', schema: '', tables: [[{ year: 'y' }], [{ old: '' }]] });
            assert.deepEqual(list.getUnknownColumns(['year']), ['old']);
        });
    });
});

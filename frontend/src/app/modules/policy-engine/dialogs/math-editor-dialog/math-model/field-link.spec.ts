import { FieldLink } from './field-link';
import { MathItemType } from './math-item.type';

// ─── name validation ──────────────────────────────────────────────────────────
describe('FieldLink._update — name validation', () => {
    it('accepts a simple identifier', () => {
        const link = new FieldLink('myVar', 'doc.field');
        link.update();
        expect(link.validName).toBeTrue();
        expect(link.variableName).toBe('myVar');
    });

    it('accepts comma-subscript notation and normalises to underscore', () => {
        const link = new FieldLink('fNRB_y,i', 'doc.field');
        link.update();
        expect(link.validName).toBeTrue();
        expect(link.variableName).toBe('fNRB_y_i');
    });

    it('preserves original text in variableNameText after comma normalisation', () => {
        const link = new FieldLink('x,i,j', 'doc.field');
        link.update();
        expect(link.variableNameText).toBe('x,i,j');
        expect(link.variableName).toBe('x_i_j');
    });

    it('rejects name starting with a digit', () => {
        const link = new FieldLink('1foo', 'doc.field');
        link.update();
        expect(link.validName).toBeFalse();
    });

    it('rejects empty name', () => {
        const link = new FieldLink('', 'doc.field');
        link.update();
        expect(link.validName).toBeFalse();
    });

    it('rejects name with leading comma', () => {
        const link = new FieldLink(',x', 'doc.field');
        link.update();
        expect(link.validName).toBeFalse();
    });

    it('rejects name with trailing comma', () => {
        const link = new FieldLink('x,', 'doc.field');
        link.update();
        expect(link.validName).toBeFalse();
    });
});

// ─── toJson serialisation ─────────────────────────────────────────────────────
describe('FieldLink.toJson', () => {
    it('serialises type as LINK', () => {
        const link = new FieldLink('x', 'doc.field');
        link.update();
        expect(link.toJson().type).toBe(MathItemType.LINK);
    });

    it('name in JSON is variableNameText (original notation, not normalised)', () => {
        const link = new FieldLink('x,i', 'doc.field');
        link.update();
        expect(link.toJson().name).toBe('x,i');
    });

    it('includes field and schema', () => {
        const link = new FieldLink('x', 'doc.field');
        link.schema = 'schema#1';
        link.update();
        const json = link.toJson();
        expect(json.field).toBe('doc.field');
        expect(json.schema).toBe('schema#1');
    });
});

// ─── round-trip via FieldLink.from ────────────────────────────────────────────
describe('FieldLink.from — round-trip', () => {
    it('restores variableNameText from JSON name (comma notation)', () => {
        const original = new FieldLink('fNRB_y,i', 'doc.field');
        original.update();
        const restored = FieldLink.from(original.toJson())!;
        restored.update();
        expect(restored.variableNameText).toBe('fNRB_y,i');
        expect(restored.variableName).toBe('fNRB_y_i');
        expect(restored.validName).toBeTrue();
    });

    it('returns null for non-object input', () => {
        expect(FieldLink.from(null as any)).toBeNull();
        expect(FieldLink.from(undefined as any)).toBeNull();
    });
});

// ─── table output ─────────────────────────────────────────────────────────────
describe('FieldLink table output', () => {
    function tableLink(rows: Record<string, string>[]): FieldLink {
        return FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field: 'results',
            schema: '',
            rows
        })!;
    }

    it('is a table only when it carries rows', () => {
        expect(new FieldLink('a', 'b').isTable).toBeFalse();
        expect(tableLink([]).isTable).toBeTrue();
    });

    it('keeps the rows through toJson and from', () => {
        const rows = [{ year: 'y1', value: 'r1' }, { year: '', value: 'r2' }];
        const json = tableLink(rows).toJson();
        expect(json.rows).toEqual(rows);
        expect(FieldLink.from(json)!.rows).toEqual(rows);
    });

    it('leaves rows out of the JSON of an ordinary output', () => {
        expect('rows' in new FieldLink('a', 'b').toJson()).toBeFalse();
    });

    it('is valid with an empty name when every filled cell is a variable name', () => {
        const link = tableLink([{ a: 'r1', b: '' }, { a: 'x,i', b: ' ' }]);
        link.update();
        expect(link.valid).toBeTrue();
    });

    it('is invalid when a filled cell is not a variable name', () => {
        const link = tableLink([{ a: '1bad' }]);
        link.update();
        expect(link.validName).toBeFalse();
        expect(link.error).toBe('Invalid name');
    });

    it('rejects a non-string cell from imported JSON', () => {
        const link = FieldLink.from(JSON.parse(`{
            "type": "link",
            "name": "",
            "description": "",
            "field": "results",
            "schema": "",
            "rows": [{ "a": 123 }]
        }`))!;
        link.update();
        expect(link.validName).toBeFalse();
        expect(link.error).toBe('Invalid name');
    });

    it('rejects more than 1000 rows', () => {
        const link = tableLink(Array.from({ length: 1001 }, () => ({ a: '' })));
        link.update();
        expect(link.validName).toBeFalse();
        expect(link.error).toBe('Too many rows');
    });

    it('fills each cell from the scope and leaves an empty cell empty', () => {
        const link = tableLink([{ a: 'r1', b: '' }]);
        expect(link.getTableRows({ r1: 5 })).toEqual([{ a: 5, b: '' }]);
        expect(link.getCellNames()).toEqual(['r1']);
    });
});

describe('FieldLink table list output', () => {
    function tableListLink(tables: Record<string, string>[][]): FieldLink {
        return FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field: 'sites.results',
            schema: '',
            tables
        })!;
    }

    it('is a table and a table list when it carries tables', () => {
        const link = tableListLink([[{ a: 'r1' }]]);
        expect(link.isTable).toBeTrue();
        expect(link.isTableList).toBeTrue();
        expect(link.rows).toBeNull();
    });

    it('keeps the tables through toJson and from', () => {
        const tables = [[{ a: 'r1' }], [{ a: '' }, { a: 'r2' }]];
        const json = tableListLink(tables).toJson();
        expect(json.tables).toEqual(tables);
        expect('rows' in json).toBeFalse();
        expect(FieldLink.from(json)!.tables).toEqual(tables);
    });

    it('checks the cells of every table', () => {
        const link = tableListLink([[{ a: 'r1' }], [{ a: '1bad' }]]);
        link.update();
        expect(link.validName).toBeFalse();
        expect(link.error).toBe('Invalid name');
    });

    it('counts the 1000-row limit across all tables', () => {
        const link = tableListLink([
            Array.from({ length: 600 }, () => ({ a: '' })),
            Array.from({ length: 401 }, () => ({ a: '' }))
        ]);
        link.update();
        expect(link.error).toBe('Too many rows');
    });

    it('rejects more than 100 tables', () => {
        const link = tableListLink(Array.from({ length: 101 }, () => []));
        link.update();
        expect(link.validName).toBeFalse();
        expect(link.error).toBe('Too many tables');
    });

    it('fills every table from the scope and names the cells of all tables', () => {
        const link = tableListLink([[{ a: 'r1' }], [{ a: 'r2' }, { a: '' }]]);
        expect(link.getTableList({ r1: 1, r2: 2 })).toEqual([[{ a: 1 }], [{ a: 2 }, { a: '' }]]);
        expect(link.getCellNames()).toEqual(['r1', 'r2']);
    });
});

describe('FieldLink column table output', () => {
    function columnLink(columns: Record<string, any>): FieldLink {
        return FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field: 'results',
            schema: '#s',
            columns
        })!;
    }

    it('is a single table and keeps the columns through toJson and from', () => {
        const link = columnLink({ year: 'y', co2: '' });
        expect(link.isTable).toBeTrue();
        expect(link.isTableList).toBeFalse();
        const json = link.toJson();
        expect(json.columns).toEqual({ year: 'y', co2: '' });
        expect('rows' in json).toBeFalse();
        expect('tables' in json).toBeFalse();
        expect(FieldLink.from(json)!.columns).toEqual({ year: 'y', co2: '' });
    });

    it('accepts variable names and empty columns, and names the bound variables', () => {
        const link = columnLink({ year: 'y', co2: '', area: 'x,i' });
        link.update();
        expect(link.validName).toBeTrue();
        expect(link.error).toBe('');
        expect(link.getCellNames()).toEqual(['y', 'x_i']);
    });

    it('rejects a column that is not a variable name or not a string', () => {
        const bad = columnLink({ year: '1bad' });
        bad.update();
        expect(bad.validName).toBeFalse();
        expect(bad.error).toBe('Invalid name');
        const number = columnLink({ year: 5 });
        number.update();
        expect(number.validName).toBeFalse();
    });

    it('puts element N of every list into row N and fills shorter lists with empty cells', () => {
        const link = columnLink({ year: 'y', co2: 'c', note: '' });
        expect(link.getTableRows({ y: [2020, 2021, 2022], c: [42, 20] })).toEqual([
            { year: 2020, co2: 42, note: '' },
            { year: 2021, co2: 20, note: '' },
            { year: 2022, co2: '', note: '' }
        ]);
    });

    it('repeats a single value in every row and keeps nested values as they are', () => {
        const link = columnLink({ year: 'y', site: 's', area: 'a' });
        expect(link.getTableRows({ y: [2020, 2021], s: 'S1', a: [[1, 2], [3]] })).toEqual([
            { year: 2020, site: 'S1', area: [1, 2] },
            { year: 2021, site: 'S1', area: [3] }
        ]);
    });

    it('makes one row from single values and no rows when no column is bound', () => {
        expect(columnLink({ year: 'y', co2: '' }).getTableRows({ y: 2020 })).toEqual([{ year: 2020, co2: '' }]);
        expect(columnLink({ year: '', co2: '' }).getTableRows({})).toEqual([]);
    });

    it('makes no rows from an empty list', () => {
        expect(columnLink({ year: 'y', site: 's' }).getTableRows({ y: [], s: 'S1' })).toEqual([]);
    });

    it('rejects more than 10000 rows', () => {
        const link = columnLink({ year: 'y' });
        expect(link.getTableRows({ y: new Array(10000).fill(1) }).length).toBe(10000);
        expect(() => link.getTableRows({ y: new Array(10001).fill(1) }))
            .toThrowError('Too many rows: 10001. The limit is 10000');
    });

    it('is not limited to 1000 rows by the grid limit', () => {
        const link = columnLink({ year: 'y' });
        link.update();
        expect(link.validName).toBeTrue();
        expect(link.getTableRows({ y: new Array(1500).fill(1) }).length).toBe(1500);
    });

    it('rejects a huge list before it builds any row', () => {
        const link = columnLink({ year: 'y', co2: 'c' });
        expect(() => link.getTableRows({ y: new Array(1000000000), c: 1 }))
            .toThrowError('Too many rows: 1000000000. The limit is 10000');
    });

    it('names the configured columns the schema does not declare', () => {
        expect(columnLink({ year: 'y', yeer: 'z', co2: '' }).getUnknownColumns(['year', 'co2'])).toEqual(['yeer']);
        expect(columnLink({ year: 'y' }).getUnknownColumns(['year', 'co2'])).toEqual([]);
        const grid = FieldLink.from({ type: MathItemType.LINK, name: '', description: '', field: 'results', schema: '', rows: [{ year: 'y' }, { note: '' }] })!;
        expect(grid.getUnknownColumns(['year'])).toEqual(['note']);
        const list = FieldLink.from({ type: MathItemType.LINK, name: '', description: '', field: 'results', schema: '', tables: [[{ year: 'y' }], [{ old: '' }]] })!;
        expect(list.getUnknownColumns(['year'])).toEqual(['old']);
    });
});

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
});

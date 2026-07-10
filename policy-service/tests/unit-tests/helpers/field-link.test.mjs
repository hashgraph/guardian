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
});

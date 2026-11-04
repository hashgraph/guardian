import { UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { FieldForm } from '../schema-form-model/field-form';
import { computeCompletion, countRequired } from './schema-form-completion';

describe('countRequired', () => {
    const document: any = {
        $id: '#count&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#count&1.0.0', term: 'count&1.0.0' }),
        type: SchemaDataTypes.object,
        properties: {
            name: { type: SchemaDataTypes.string, title: 'Name', description: 'Name' },
            tags: { type: SchemaDataTypes.array, title: 'Tags', description: 'Tags', items: { type: SchemaDataTypes.string } },
            group: { $ref: '#group', title: 'Group', description: 'Group' },
            extra: { $ref: '#group', title: 'Extra', description: 'Extra' },
        },
        required: ['name', 'tags', 'group'],
        $defs: {
            '#group': {
                $id: '#group', type: SchemaDataTypes.object,
                properties: { inner: { type: SchemaDataTypes.number, title: 'Inner', description: 'Inner' } },
                required: ['inner'],
            },
        },
    };
    const build = (preset?: any): FieldForm => {
        const form = new FieldForm(new UntypedFormGroup({}));
        form.setData({ schema: new Schema({ iri: '#count&1.0.0', document }), preset });
        form.build();
        return form;
    };

    it('counts required leaves and arrays, not optional sub-schemas that were not added', () => {
        expect(countRequired(build().controls)).toEqual({ answered: 0, total: 3 });
    });

    it('needs at least one row in a required array', () => {
        const form = build({ name: 'a', group: { inner: 1 } });
        expect(countRequired(form.controls)).toEqual({ answered: 2, total: 3 });
        const withRow = build({ name: 'a', tags: ['x'], group: { inner: 1 } });
        expect(countRequired(withRow.controls)).toEqual({ answered: 3, total: 3 });
    });

    it('counts a required sub-schema through its own fields', () => {
        const form = build({ name: 'a', tags: ['x'], group: {} });
        expect(countRequired(form.controls)).toEqual({ answered: 2, total: 3 });
    });

    it('ignores an optional sub-schema until it is added, then counts its required fields', () => {
        const form = build({ name: 'a', tags: ['x'], group: { inner: 1 }, extra: {} });
        expect(countRequired(form.controls)).toEqual({ answered: 3, total: 4 });
    });

    it('returns zero for no controls', () => {
        expect(countRequired(null)).toEqual({ answered: 0, total: 0 });
    });
});

describe('countRequired – arrays of rows, excluded fields and Preview', () => {
    const text = (title: string) => ({ type: SchemaDataTypes.string, title, description: title });
    const document: any = {
        $id: '#cr&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#cr&1.0.0', term: 'cr&1.0.0' }),
        type: SchemaDataTypes.object,
        properties: {
            name: text('Name'),
            note: text('Note'),
            rows: { type: SchemaDataTypes.array, title: 'Rows', description: 'Rows', items: { $ref: '#row' } },
        },
        required: ['name', 'rows'],
        $defs: {
            '#row': { $id: '#row', type: SchemaDataTypes.object, properties: { v: text('V') }, required: ['v'] },
        },
    };
    const build = (preset?: any, setup?: (schema: Schema) => void, requiredFields?: string[] | null, doc: any = document): FieldForm => {
        const schema = new Schema({ iri: '#cr&1.0.0', document: doc });
        setup?.(schema);
        const form = new FieldForm(new UntypedFormGroup({}));
        form.setData({ schema, preset, requiredFields });
        form.build();
        return form;
    };

    it('does not answer a required array while one of its rows is invalid', () => {
        const form = build({ name: 'a', rows: [{ v: '1' }, {}] });
        expect(countRequired(form.controls)).toEqual({ answered: 1, total: 2 });
        const valid = build({ name: 'a', rows: [{ v: '1' }, { v: '2' }] });
        expect(countRequired(valid.controls)).toEqual({ answered: 2, total: 2 });
        form.destroy();
        valid.destroy();
    });

    it('does not count a hidden field', () => {
        const form = build({}, (schema) => {
            schema.fields.find(field => field.name === 'name')!.hidden = true;
        });
        expect(countRequired(form.controls)).toEqual({ answered: 0, total: 1 });
        form.destroy();
    });

    it('does not count an autocalculate field', () => {
        const doc = structuredClone(document);
        doc.properties.name.$comment = JSON.stringify({ '@id': 'ctx:name', term: 'name', autocalculate: true });
        const form = build({}, undefined, undefined, doc);
        expect(countRequired(form.controls)).toEqual({ answered: 0, total: 1 });
        form.destroy();
    });

    it('counts exactly the fields that Preview requires', () => {
        const ordinary = build({}, undefined, null);
        expect(countRequired(ordinary.controls).total).toBe(2);
        const preview = build({}, undefined, ['note']);
        expect(countRequired(preview.controls)).toEqual({ answered: 0, total: 1 });
        const filled = build({ note: 'x' }, undefined, ['note']);
        expect(countRequired(filled.controls)).toEqual({ answered: 1, total: 1 });
        ordinary.destroy();
        preview.destroy();
        filled.destroy();
    });
});

describe('computeCompletion', () => {
    const text = (title: string) => ({ type: SchemaDataTypes.string, title, description: title });
    const document: any = {
        $id: '#cc&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#cc&1.0.0', term: 'cc&1.0.0' }),
        type: SchemaDataTypes.object,
        properties: {
            name: text('Name'),
            group: { $ref: '#group', title: 'Group', description: 'Group' },
        },
        required: ['name', 'group'],
        $defs: {
            '#group': { $id: '#group', type: SchemaDataTypes.object, properties: { inner: text('Inner') }, required: ['inner'] },
        },
    };
    const build = (preset?: any): FieldForm => {
        const form = new FieldForm(new UntypedFormGroup({}));
        form.setData({ schema: new Schema({ iri: '#cc&1.0.0', document }), preset });
        form.build();
        return form;
    };

    it('counts the form itself when there are no sections', () => {
        const form = build({ name: 'a' });
        expect(computeCompletion(form.controls, [])).toEqual({ answered: 1, total: 2, sections: [] });
        form.destroy();
    });

    it('sums the sections and reports invalid fields per section', () => {
        const form = build({ name: 'a', group: {} });
        const [name, group] = form.controls!;
        const sections = [
            { id: 's0', title: 'Main', controls: [name] },
            { id: 's1', title: 'Group', controls: [group] },
        ];
        const result = computeCompletion(form.controls, sections);
        expect(result.answered).toBe(1);
        expect(result.total).toBe(2);
        expect(result.sections.map(item => [item.title, item.answered, item.total])).toEqual([['Main', 1, 1], ['Group', 0, 1]]);
        expect(result.sections.map(item => item.hasErrors)).toEqual([false, true]);
        form.destroy();
    });
});

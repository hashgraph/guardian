import { UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { FieldForm } from '../schema-form-model/field-form';
import { countRequired } from './schema-form-completion';

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

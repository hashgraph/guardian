import { UntypedFormGroup } from '@angular/forms';
import { Schema } from '@guardian/interfaces';
import { FieldForm } from '../schema-form-model/field-form';
import { walkFields } from './schema-form-walk';

describe('walkFields', () => {
    const document: any = {
        $id: '#walk&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#walk&1.0.0', term: 'walk&1.0.0' }),
        title: 'Walk',
        description: 'Walk',
        type: 'object',
        properties: {
            name: { type: 'string', title: 'Name', description: 'Name' },
            tags: { type: 'array', title: 'Tags', description: 'Tags', items: { type: 'string' } },
            group: { $ref: '#group' },
            optional: { type: 'string', title: 'Optional', description: 'Optional' },
        },
        required: ['name', 'tags', 'group'],
        $defs: {
            '#group': {
                $id: '#group',
                title: 'Group',
                description: 'Group',
                type: 'object',
                properties: { inner: { type: 'number', title: 'Inner', description: 'Inner' } },
                required: ['inner'],
            },
        },
    };
    const build = (preset?: any): FieldForm => {
        const form = new FieldForm(new UntypedFormGroup({}));
        form.setData({ schema: new Schema({ iri: '#walk&1.0.0', document }), preset });
        form.build();
        return form;
    };

    it('walks in document order with dot paths and labels', () => {
        const form = build({ tags: ['a', 'b'] });
        const targets = walkFields(form.controls);
        expect(targets.map(target => target.path)).toEqual([
            'name', 'tags', 'tags.0', 'tags.1', 'group', 'group.inner', 'optional'
        ]);
        expect(targets.find(target => target.path === 'tags.1')?.labels).toEqual(['Tags', '#2']);
        expect(targets.find(target => target.path === 'group.inner')?.labels).toEqual(['group', 'Inner']);
        form.destroy();
    });

    it('marks required leaves and a required array as one unit', () => {
        const form = build({ tags: ['a', 'b'] });
        const units = walkFields(form.controls).filter(target => target.requiredUnit).map(target => target.path);
        expect(units).toEqual(['name', 'tags', 'group.inner']);
        form.destroy();
    });

    it('does not count disabled fields', () => {
        const form = build();
        form.form.get('name')?.disable();
        const units = walkFields(form.controls).filter(target => target.requiredUnit).map(target => target.path);
        expect(units).not.toContain('name');
        form.destroy();
    });
});

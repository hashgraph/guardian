import { UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { FieldForm, IFieldControl } from '../schema-form-model/field-form';
import { computeCompletion, countRequired, requiredWithoutControl } from './schema-form-completion';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { DialogService } from 'primeng/dynamicdialog';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FormTextareaComponent } from './form-textarea/form-textarea.component';
import { SchemaFormComponent } from './schema-form.component';

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

    it('adds fields without a control as unanswered, to their section or to the whole form', () => {
        const form = build({ name: 'a', group: {} });
        const [name, group] = form.controls!;
        const sections = [
            { id: 's0', title: 'Main', controls: [name] },
            { id: 's1', title: 'Group', controls: [group] },
        ];
        const result = computeCompletion(form.controls, sections, [1, 1]);
        expect(result.sections.map(item => [item.title, item.answered, item.total])).toEqual([['Main', 1, 1], ['Group', 0, 3]]);
        expect(result.total).toBe(4);
        expect(computeCompletion(form.controls, [], [-1, -1])).toEqual({ answered: 1, total: 4, sections: [] });
        form.destroy();
    });
});

describe('requiredWithoutControl', () => {
    const text = (title: string) => ({ type: SchemaDataTypes.string, title, description: title });
    const document: any = {
        $id: '#rw&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#rw&1.0.0', term: 'rw&1.0.0' }),
        type: SchemaDataTypes.object,
        properties: {
            name: text('Name'),
            extra: { $ref: '#group', title: 'Extra', description: 'Extra' },
        },
        required: ['name'],
        $defs: {
            '#group': { $id: '#group', type: SchemaDataTypes.object, properties: { inner: text('Inner'), other: text('Other') } },
        },
    };
    const build = (preset: any, requiredFields: string[]): FieldForm => {
        const form = new FieldForm(new UntypedFormGroup({}));
        form.setData({ schema: new Schema({ iri: '#rw&1.0.0', document }), preset, requiredFields });
        form.build();
        return form;
    };

    it('lists required fields inside a sub-schema that was not added, once each', () => {
        const form = build({}, ['name', 'extra.inner', 'extra.other']);
        expect(requiredWithoutControl(form.controls, ['name', 'extra.inner', 'extra.other', 'extra.inner'])).toEqual(['extra.inner', 'extra.other']);
        form.destroy();
    });

    it('leaves out fields that have a control, row paths and paths with no existing parent', () => {
        const form = build({ extra: {} }, ['name', 'extra.inner']);
        expect(requiredWithoutControl(form.controls, ['name', 'extra.inner', 'rows.0.v', 'missing.inner'])).toEqual([]);
        expect(requiredWithoutControl(form.controls, null)).toEqual([]);
        form.destroy();
    });
});

const createView = (model: FieldForm) => {
    TestBed.configureTestingModule({
        declarations: [SchemaFormComponent, FormTextareaComponent],
        imports: [CommonModule, ReactiveFormsModule],
        providers: [
            { provide: IPFSService, useValue: {} },
            { provide: DialogService, useValue: {} },
        ],
        schemas: [NO_ERRORS_SCHEMA],
    });
    const fixture = TestBed.createComponent(SchemaFormComponent);
    fixture.componentRef.setInput('form-model', model);
    fixture.componentRef.setInput('showButtons', false);
    fixture.detectChanges();
    return fixture;
};


describe('SchemaFormComponent requiredLeft cache', () => {
    const text = (title: string) => ({ type: SchemaDataTypes.string, title, description: title });
    const document: any = {
        $id: '#rl&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#rl&1.0.0', term: 'rl&1.0.0' }),
        type: SchemaDataTypes.object,
        properties: {
            group: { $ref: '#group', title: 'Group', description: 'Group' },
            rows: { type: SchemaDataTypes.array, title: 'Rows', description: 'Rows', items: { $ref: '#group' } },
        },
        required: ['group'],
        $defs: {
            '#group': {
                $id: '#group', type: SchemaDataTypes.object,
                properties: { one: text('One'), two: text('Two') },
                required: ['one', 'two'],
            },
        },
    };
    const build = () => {
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema: new Schema({ iri: '#rl&1.0.0', document }), preset: { group: {} } });
        model.build();
        const fixture = createView(model);
        const view = fixture.componentInstance;
        return { model, view, fixture, group: model.controls!.find((c) => c.name === 'group')! };
    };

    it('reuses the count until a child value changes', () => {
        const { view, group } = build();
        const first = view.requiredLeft(group);
        expect(first).toEqual(jasmine.objectContaining({ left: 2, total: 2 }));
        expect(view.requiredLeft(group)).toBe(first);
        group.control.get('one')!.setValue('x');
        expect(view.requiredLeft(group)).toEqual(jasmine.objectContaining({ left: 1, total: 2 }));
    });

    it('updates after a condition hides a required field', () => {
        const { model, view, group } = build();
        expect(view.requiredLeft(group).total).toBe(2);
        // A condition hides a field with emitEvent: false and announces it on controlsChanged$.
        group.model!.controls!.find((c: IFieldControl<any>) => c.name === 'two')!.visibility = false;
        model.controlsChanged$.next();
        expect(view.requiredLeft(group)).toEqual(jasmine.objectContaining({ left: 1, total: 1 }));
    });

    it('stops listening on destroy', () => {
        const { model, view, fixture, group } = build();
        view.requiredLeft(group);
        fixture.destroy();
        expect(() => model.controlsChanged$.next()).not.toThrow();
    });
});

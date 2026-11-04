import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FieldForm, IFieldControl } from '../schema-form-model/field-form';
import { FormTextareaComponent } from './form-textarea/form-textarea.component';
import { SchemaFormComponent } from './schema-form.component';

describe('SchemaFormComponent layout helpers', () => {
    const properties: any = {
        name: { type: SchemaDataTypes.string, title: 'Name', description: 'Name' },
        notes: { type: SchemaDataTypes.string, title: 'Notes', description: 'Notes', default: 'n/a' },
        count: { type: SchemaDataTypes.number, title: 'Count', description: 'Count' },
        whole: { type: SchemaDataTypes.integer, title: 'Whole', description: 'Whole' },
        when: { type: SchemaDataTypes.string, format: 'date', title: 'When', description: 'When' },
        email: { type: SchemaDataTypes.string, format: 'email', title: 'Email', description: 'Email' },
        flag: { type: SchemaDataTypes.boolean, title: 'Flag', description: 'Flag' },
        yesNo: { type: SchemaDataTypes.string, title: 'YesNo', description: 'YesNo', enum: ['Yes', 'No'] },
        kind: { type: SchemaDataTypes.string, title: 'Kind', description: 'Kind', enum: ['Company', 'NGO', 'Government', 'Individual'] },
        many: { type: SchemaDataTypes.string, title: 'Many', description: 'Many', enum: ['One', 'Two', 'Three', 'Four', 'Five'] },
        tags: { type: SchemaDataTypes.array, title: 'Tags', description: 'Tags', items: { type: SchemaDataTypes.string } },
        group: { $ref: '#group', title: 'Group', description: 'Group' },
    };
    const document: any = {
        $id: '#layout&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#layout&1.0.0', term: 'layout&1.0.0' }),
        type: SchemaDataTypes.object,
        properties,
        $defs: {
            '#group': {
                $id: '#group', type: SchemaDataTypes.object,
                properties: { inner: { type: SchemaDataTypes.number, title: 'Inner', description: 'Inner' } },
            },
        },
    };

    const setup = () => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormComponent, FormTextareaComponent],
            imports: [CommonModule, ReactiveFormsModule],
            providers: [
                { provide: IPFSService, useValue: {} },
                { provide: DialogService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema: new Schema({ iri: '#layout&1.0.0', document }) });
        model.build();
        const fixture = TestBed.createComponent(SchemaFormComponent);
        fixture.componentRef.setInput('form-model', model);
        fixture.componentRef.setInput('showButtons', false);
        const view = fixture.componentInstance;
        const control = (name: string): IFieldControl<any> => model.controls!.find((c) => c.name === name)!;
        return { fixture, view, model, control };
    };

    it('gives long controls the full row and short ones one column', () => {
        const { view, control } = setup();
        for (const name of ['name', 'tags', 'group', 'kind']) {
            expect(view.isFullRow(control(name))).withContext(name).toBeTrue();
        }
        for (const name of ['count', 'whole', 'when', 'email', 'flag', 'yesNo', 'many']) {
            expect(view.isFullRow(control(name))).withContext(name).toBeFalse();
        }
    });

    it('picks the enum mode from the option count and label length', () => {
        const { view, control } = setup();
        expect(view.enumMode(control('yesNo'))).toBe('seg');
        expect(view.enumMode(control('kind'))).toBe('cards');
        expect(view.enumMode(control('many'))).toBe('select');
    });

    it('switches a remote enum once its values load', () => {
        const { view, control } = setup();
        const item = control('many');
        item.enumValues = undefined;
        expect(view.enumMode(item)).toBe('select');
        item.enumValues = ['A', 'B'];
        expect(view.enumMode(item)).toBe('seg');
    });

    it('tags a schema default until the field is edited', () => {
        const { view, control } = setup();
        const item = control('notes');
        expect(view.isDefaultValue(item)).toBeTrue();
        item.control.markAsTouched();
        expect(view.isDefaultValue(item)).toBeFalse();
        expect(view.isDefaultValue(control('name'))).toBeFalse();
    });

    it('sets a segmented boolean and clears it to undefined', () => {
        const { view, control } = setup();
        const item = control('flag');
        view.setChoice(item, true);
        expect(item.control.value).toBeTrue();
        expect(item.control.touched).toBeTrue();
        expect(item.control.dirty).toBeTrue();
        view.setChoice(item, undefined);
        expect(item.control.value).toBeUndefined();
    });

    it('renders segmented and card controls for short enums and booleans', () => {
        const { fixture, model } = setup();
        model.controls = model.controls!.filter((c) => ['flag', 'yesNo', 'kind'].includes(c.name));
        fixture.detectChanges();
        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelectorAll('.sf-choice[role="radiogroup"] [role="radio"]').length).toBe(2 + 2 + 4);
        expect(root.querySelectorAll('.sf-cards[role="radiogroup"] [role="radio"]').length).toBe(4);
        expect(root.querySelectorAll('form.sf-grid .sf-full').length).toBe(1);
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

describe('SchemaFormComponent lone fields', () => {
    const text = (title: string) => ({ type: SchemaDataTypes.string, format: 'date', title, description: title });
    const document: any = {
        $id: '#lone&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#lone&1.0.0', term: 'lone&1.0.0' }),
        type: SchemaDataTypes.object,
        properties: {
            name: { type: SchemaDataTypes.string, title: 'Name', description: 'Name' },
            a: text('A'),
            b: text('B'),
            notes: { type: SchemaDataTypes.string, title: 'Notes', description: 'Notes' },
        },
    };

    it('updates when a neighbour hides', () => {
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema: new Schema({ iri: '#lone&1.0.0', document }) });
        model.build();
        const fixture = createView(model);
        const view = fixture.componentInstance;
        const byName = (name: string) => model.controls!.find((c) => c.name === name)!;
        // name (full) | a b (share a row) | notes (full)
        expect([0, 1, 2, 3].map((i) => view.isLoneField(i))).toEqual([false, false, false, false]);
        // The check runs from `ngDoCheck`; calling it directly avoids re-rendering a model edited by hand.
        byName('b').visibility = false;
        view.ngDoCheck();
        expect(view.isLoneField(1)).toBeTrue();
        byName('b').visibility = true;
        view.ngDoCheck();
        expect(view.isLoneField(1)).toBeFalse();
    });

    it('follows a swapped list of the same length and visibility', () => {
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema: new Schema({ iri: '#lone&1.0.0', document }) });
        model.build();
        const fixture = createView(model);
        const view = fixture.componentInstance;
        const [name, a, b, notes] = model.controls!;
        fixture.componentRef.setInput('renderControls', [name, a, notes]);
        fixture.detectChanges();
        expect(view.isLoneField(1)).toBeTrue();
        fixture.componentRef.setInput('renderControls', [name, a, b]);
        fixture.detectChanges();
        expect(view.isLoneField(1)).toBeFalse();
    });

    it('caches the enum mode per values array and recomputes when a new one is assigned', () => {
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema: new Schema({ iri: '#lone&1.0.0', document }) });
        model.build();
        const view = createView(model).componentInstance;
        const item = model.controls![1];
        item.enumValues = ['A', 'B'];
        expect(view.enumMode(item)).toBe('seg');
        item.enumValues = ['A', 'B', 'C', 'D', 'E'];
        expect(view.enumMode(item)).toBe('select');
    });
});

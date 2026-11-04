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

describe('SchemaFormComponent field metadata', () => {
    const document: any = {
        $id: '#meta&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#meta&1.0.0', term: 'meta&1.0.0' }),
        type: SchemaDataTypes.object,
        properties: {
            name: { type: SchemaDataTypes.string, title: 'Name', description: 'Name' },
            kind: { type: SchemaDataTypes.string, title: 'Kind', description: 'Kind', enum: ['A', 'B', 'C'] },
            when: { type: SchemaDataTypes.string, format: 'date', title: 'When', description: 'When' },
            group: { $ref: '#group', title: 'Group', description: 'Group' },
            rows: { type: SchemaDataTypes.array, title: 'Rows', description: 'Rows', items: { $ref: '#group' } },
        },
        $defs: {
            '#group': {
                $id: '#group', type: SchemaDataTypes.object,
                properties: { inner: { type: SchemaDataTypes.number, title: 'Inner', description: 'Inner' } },
            },
        },
    };

    const setup = (showMetadata?: boolean) => {
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
        model.setData({ schema: new Schema({ iri: '#meta&1.0.0', document }) });
        if (showMetadata !== undefined) {
            model.showMetadata = showMetadata;
        }
        model.build();
        const fixture = TestBed.createComponent(SchemaFormComponent);
        fixture.componentRef.setInput('form-model', model);
        fixture.componentRef.setInput('showButtons', false);
        fixture.detectChanges();
        const control = (name: string): IFieldControl<any> => model.controls!.find((c) => c.name === name)!;
        return { fixture, view: fixture.componentInstance, model, control };
    };

    const strips = (fixture: any): HTMLElement[] =>
        Array.from(fixture.nativeElement.querySelectorAll('.sf-meta'));

    it('hides the strip by default', () => {
        const { fixture } = setup();
        expect(strips(fixture).length).toBe(0);
    });

    it('shows key, type, dot path and allowed values when the flag is on', () => {
        const { fixture, control } = setup(true);
        const text = (id: string) => (fixture.nativeElement.querySelector(`.sf-meta[data-meta-id="${id}"]`) as HTMLElement)?.textContent || '';
        const kind = text(control('kind').id);
        expect(kind).toContain('kind');
        expect(kind).toContain('3 allowed values');
        expect(kind).toContain(control('kind').path);
        expect(text(control('when').id)).toContain('string · date');
        expect(text(control('group').id)).toContain('object · sub-schema');
        expect(text(control('rows').id)).toContain('array · object · sub-schema');
    });

    it('shows no strip on a sub-schema card when the flag is off', () => {
        const { fixture, control } = setup(false);
        expect(fixture.nativeElement.querySelector(`.sf-meta[data-meta-id="${control('group').id}"]`)).toBeNull();
    });

    it('reads the flag from the root form for a nested form', () => {
        const { view, model, control } = setup(false);
        const group = control('group');
        model.addGroup(group);
        const child = group.model as FieldForm;
        expect(child.rootForm).toBe(model);
        expect(view.showMetadata).toBeFalse();
        model.showMetadata = true;
        expect(view.showMetadata).toBeTrue();
        expect(child.rootForm.showMetadata).toBeTrue();
    });

    it('puts the row index into the path of a field inside an array', () => {
        const { model, control } = setup(true);
        const rows = control('rows');
        model.addItem(rows);
        model.addItem(rows);
        const inner = (row: number) => (rows.list![row].model as FieldForm).controls!.find((c) => c.name === 'inner')!;
        const form = (row: number) => rows.list![row].model as FieldForm;
        expect(form(0).metadataPath(inner(0))).toBe(`${rows.path}.0.inner`);
        expect(form(1).metadataPath(inner(1))).toBe(`${rows.path}.1.inner`);
    });

    it('flags a field revealed by a condition', () => {
        const field = (name: string): any => ({
            name, title: name, description: name, type: 'string',
            isArray: false, isRef: false, required: false, readOnly: false,
        });
        const form = new FieldForm(new UntypedFormGroup({}));
        form.setData({
            fields: [field('a'), field('b'), field('c')],
            conditions: [{ ifCondition: { field: field('a'), fieldValue: '1' }, thenFields: [field('b')], elseFields: [] }],
        });
        form.build();
        expect(form.isConditional({ name: 'b' } as any)).toBeTrue();
        expect(form.isConditional({ name: 'c' } as any)).toBeFalse();
    });

    it('flags a user-ordered field revealed by a condition', () => {
        const field = (name: string, extra: any = {}): any => ({
            name, title: name, description: name, type: 'string',
            isArray: false, isRef: false, required: false, readOnly: false, ...extra,
        });
        const form = new FieldForm(new UntypedFormGroup({}));
        form.setData({
            fields: [field('a'), field('b', { conditionUserOrdered: true })],
            conditions: [{
                ifCondition: { field: field('a'), fieldValue: '1' },
                thenFields: [field('b', { conditionUserOrdered: true })],
                elseFields: [],
            }],
        });
        form.build();
        expect(form.isConditional({ name: 'b' } as any)).toBeTrue();
    });
});

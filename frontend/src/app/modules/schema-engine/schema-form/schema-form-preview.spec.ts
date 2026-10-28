import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, ElementRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FieldForm } from '../schema-form-model/field-form';
import { SchemaFormComponent } from './schema-form.component';
import { SchemaFormRootComponent } from '../schema-form-root/schema-form-root.component';

describe('SchemaFormComponent Preview table validation', () => {
    const render = () => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormComponent],
            imports: [CommonModule, ReactiveFormsModule, TableModule],
            providers: [
                { provide: IPFSService, useValue: {} },
                { provide: DialogService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const schema = new Schema({ iri: '#calc&1.0.0', document: {
            $id: '#calc&1.0.0',
            $comment: JSON.stringify({ '@id': 'ctx:#calc&1.0.0', term: 'calc&1.0.0' }),
            type: SchemaDataTypes.object,
            properties: { rows: { type: SchemaDataTypes.array, items: { $ref: '#row' } } },
            $defs: { '#row': {
                $id: '#row', type: SchemaDataTypes.object,
                properties: { rate: { type: SchemaDataTypes.number, title: 'Rate', description: 'Rate' } },
                required: ['rate'],
            } },
        } });
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema, preset: { rows: [{ rate: 0 }, {}] }, requiredFields: ['rows.rate'] });
        model.build();
        const fixture = TestBed.createComponent(SchemaFormComponent);
        fixture.componentRef.setInput('form-model', model);
        fixture.componentRef.setInput('showButtons', false);
        fixture.componentRef.setInput('previewValidation', true);
        fixture.detectChanges();
        const first = model.controls![0].list![0].model.controls[0];
        const second = model.controls![0].list![1].model.controls[0];
        return { fixture, first, second };
    };

    it('marks only the reported empty cell and exposes its exact scroll target', () => {
        const { fixture, first, second } = render();
        fixture.componentRef.setInput('previewMissingFieldIds', [second.id]);
        fixture.detectChanges();
        const target = fixture.nativeElement.querySelector(`[preview-field-id="${second.id}"]`);
        expect(target).not.toBeNull();
        expect(target.classList.contains('preview-missing-field')).toBeTrue();
        const table = fixture.nativeElement.querySelector('p-table').parentElement;
        expect(table.classList.contains('table-validation-error')).toBeTrue();
        expect(getComputedStyle(table).outlineColor).toBe('rgb(244, 67, 54)');
        expect(getComputedStyle(target).outlineColor).toBe('rgb(244, 67, 54)');
        expect(getComputedStyle(target).outlineStyle).toBe('solid');
        expect(target.textContent).not.toContain('Required for calculation preview');
        expect(target.querySelector('textarea')).not.toBeNull();
        expect(fixture.nativeElement.querySelector(`[preview-field-id="${first.id}"]`).classList.contains('preview-missing-field')).toBeFalse();
        expect(first.control.value).toBe(0);
        second.control.setValue(3);
        fixture.detectChanges();
        expect(target.classList.contains('preview-missing-field')).toBeFalse();
        expect(table.classList.contains('table-validation-error')).toBeFalse();
        expect(target.querySelector('[role="alert"]')).toBeNull();
    });

    it('scrolls and focuses the actual indexed cell rendered by the table', () => {
        const { fixture, first, second } = render();
        fixture.componentRef.setInput('previewMissingFieldIds', [second.id]);
        fixture.detectChanges();
        const root = new SchemaFormRootComponent(new UntypedFormBuilder(),
            jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']));
        root.model = fixture.componentInstance.formModel;
        root.previewMissingFields = ['rows.1.rate'];
        Object.assign(root, {
            contentContainerRef: new ElementRef(fixture.nativeElement),
            childForm: fixture.componentInstance,
        });
        const target = fixture.nativeElement.querySelector(`[preview-field-id="${second.id}"]`);
        const neighbour = fixture.nativeElement.querySelector(`[preview-field-id="${first.id}"]`);
        const scroll = spyOn(target, 'scrollIntoView');
        const otherScroll = spyOn(neighbour, 'scrollIntoView');
        const focus = spyOn(target.querySelector('textarea'), 'focus');
        root.focusPreviewField('rows.1.rate');
        expect(scroll).toHaveBeenCalledOnceWith({ behavior: 'smooth', block: 'center' });
        expect(otherScroll).not.toHaveBeenCalled();
        expect(focus).toHaveBeenCalledOnceWith({ preventScroll: true });
        expect(first.control.value).toBe(0);
    });

    it('keeps Preview hints off without missing ids and treats supplied zero as a value', () => {
        const { fixture, first, second } = render();
        expect(fixture.nativeElement.querySelector('.preview-missing-field')).toBeNull();
        expect(fixture.nativeElement.querySelector(`[preview-field-id="${second.id}"]`)).toBeNull();
        fixture.componentRef.setInput('previewMissingFieldIds', [first.id, second.id]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.preview-missing-field').length).toBe(1);
        fixture.componentRef.setInput('previewMissingFieldIds', []);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.preview-missing-field')).toBeNull();
        expect(first.control.value).toBe(0);
    });
    it('outlines ordinary validator errors without a Preview label or focus marker', () => {
        const { fixture, first, second } = render();
        fixture.componentRef.setInput('previewValidation', false);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.preview-missing-field').length).toBe(1);
        expect(fixture.nativeElement.querySelector('.table-validation-error')).not.toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Required for calculation preview');
        expect(fixture.nativeElement.querySelector(`[preview-field-id="${second.id}"]`)).toBeNull();
        expect(first.control.valid).toBeTrue();
        second.control.setValue(0);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.preview-missing-field')).toBeNull();
        expect(second.control.valid).toBeTrue();
        expect(fixture.nativeElement.querySelector('.table-validation-error')).toBeNull();
    });

    it('shows an optional ordinary field validator error and ignores disabled cells', () => {
        const { fixture, first, second } = render();
        fixture.componentRef.setInput('previewValidation', false);
        first.required = false;
        first.control.setValidators(Validators.min(1));
        first.control.updateValueAndValidity();
        second.control.disable();
        fixture.detectChanges();
        const rows = fixture.nativeElement.querySelectorAll('tbody tr');
        expect(first.control.invalid).toBeTrue();
        expect(rows[0].querySelector('.preview-missing-field')).not.toBeNull();
        expect(rows[1].querySelector('.preview-missing-field')).toBeNull();
        expect(fixture.nativeElement.querySelector('.table-validation-error')).not.toBeNull();
        first.control.setValue(2);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.preview-missing-field')).toBeNull();
    });

});

import { CommonModule } from '@angular/common';
import { Component, forwardRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { DialogService } from 'primeng/dynamicdialog';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FieldForm } from '../schema-form-model/field-form';
import { FormTextareaComponent } from './form-textarea/form-textarea.component';
import { SchemaFormComponent } from './schema-form.component';

@Component({
    selector: 'app-rich-text-editor',
    template: '',
    standalone: false,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichTextInputStub), multi: true }],
})
class RichTextInputStub implements ControlValueAccessor {
    writeValue(): void { }
    registerOnChange(): void { }
    registerOnTouched(): void { }
}

function field(extra: any = {}): any {
    return { name: 'project', type: 'string', description: 'Project', required: false, isArray: false,
        isRef: false, advisoryText: '  First line\n<b>plain text</b>  ', ...extra };
}

function setup(fields: any[]) {
    TestBed.configureTestingModule({
        declarations: [SchemaFormComponent, FormTextareaComponent, RichTextInputStub],
        imports: [CommonModule, ReactiveFormsModule],
        providers: [{ provide: IPFSService, useValue: {} }, { provide: DialogService, useValue: {} }],
        schemas: [NO_ERRORS_SCHEMA],
    });
    const model = new FieldForm(new UntypedFormGroup({}));
    model.setData({ fields });
    model.build();
    const fixture = TestBed.createComponent(SchemaFormComponent);
    fixture.componentRef.setInput('form-model', model);
    fixture.componentRef.setInput('showButtons', false);
    fixture.detectChanges();
    return { model, fixture, view: fixture.componentInstance };
}

const hints = (element: HTMLElement): HTMLElement[] => Array.from(element.querySelectorAll('.sf-advisory'));

describe('Schema form advisory text', () => {
    it('shows plain text under the label and above the input without HTML rendering', () => {
        const { fixture, model } = setup([field()]);
        const element: HTMLElement = fixture.nativeElement;
        expect(hints(element).length).toBe(1);
        expect(hints(element)[0].textContent).toBe('First line\n<b>plain text</b>');
        expect(hints(element)[0].querySelector('b')).toBeNull();
        expect(hints(element)[0].previousElementSibling?.classList.contains('sf-label')).toBe(true);
        expect(hints(element)[0].compareDocumentPosition(element.querySelector('.form-field-value')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        model.form.get('project')!.setValue('Project Hub');
        expect(model.form.value).toEqual({ project: 'Project Hub' });
    });

    it('leaves no hint element for absent, empty and unsupported guidance', () => {
        const { fixture } = setup([
            field({ name: 'absent', advisoryText: undefined }), field({ name: 'empty', advisoryText: '  ' }),
            field({ name: 'help', type: 'null' }), field({ name: 'system', readOnly: true }),
            field({ name: 'calculated', autocalculate: true, comment: '{"autocalculate":true}' }),
            field({ name: 'ref', type: 'string' }),
        ]);
        expect(hints(fixture.nativeElement).length).toBe(0);
    });

    it('shows simple array guidance once under the label, also before any value is added', () => {
        const { fixture, model } = setup([field({ isArray: true })]);
        const element: HTMLElement = fixture.nativeElement;
        expect(element.querySelectorAll('.form-field-array-item-container').length).toBe(0);
        expect(hints(element).length).toBe(1);
        expect(hints(element)[0].textContent).toBe('First line\n<b>plain text</b>');
        expect(hints(element)[0].previousElementSibling?.classList.contains('sf-label')).toBe(true);
        const item = model.controls![0];
        model.addItem(item);
        model.addItem(item);
        fixture.componentRef.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        expect(element.querySelectorAll('.form-field-array-item-container').length).toBe(2);
        expect(hints(element).length).toBe(1);
        expect(element.querySelector('.form-field-array-item-container .sf-advisory')).toBeNull();
    });

    for (const customType of ['geo', 'sentinel']) {
        for (const isArray of [false, true]) {
            it(`keeps ${customType} guidance in the collapsed ${isArray ? 'array' : 'single'} card header`, () => {
                const { fixture, model, view } = setup([field({ isRef: true, isArray, customType, type: '#spatial', fields: [], conditions: [] })]);
                const item = model.controls![0];
                view.toggleOpen(item, false);
                fixture.componentRef.changeDetectorRef.markForCheck();
                fixture.detectChanges();
                const element: HTMLElement = fixture.nativeElement;
                expect(element.querySelector('.sf-card-body')).toBeNull();
                expect(element.querySelector('.sf-card-head .sf-advisory')?.textContent).toBe('First line\n<b>plain text</b>');
            });
        }
    }

    for (const customType of ['geo', 'sentinel']) {
        it(`shows ${customType} array guidance once in the open card header, not in every record`, () => {
            const { fixture, model, view } = setup([field({ isRef: true, isArray: true, customType, type: '#spatial', fields: [], conditions: [] })]);
            const item = model.controls![0];
            model.addItem(item);
            model.addItem(item);
            model.addItem(item);
            view.toggleOpen(item, true);
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
            const element: HTMLElement = fixture.nativeElement;
            expect(element.querySelectorAll('.sf-record').length).toBe(3);
            expect(hints(element).length).toBe(1);
            expect(element.querySelector('.sf-card-head .sf-advisory')?.textContent).toBe('First line\n<b>plain text</b>');
            expect(element.querySelector('.sf-record .sf-advisory')).toBeNull();
        });
    }

    it('never shows guidance on an ordinary sub-schema card', () => {
        const { fixture } = setup([field({ isRef: true, customType: 'subSchema', type: '#child', fields: [], conditions: [] })]);
        expect(fixture.nativeElement.querySelector('.sf-card-head')).not.toBeNull();
        expect(hints(fixture.nativeElement).length).toBe(0);
    });

    for (const customType of ['richText', 'table']) {
        it(`shows guidance before the ${customType} control`, () => {
            const { fixture } = setup([field({ customType })]);
            expect(hints(fixture.nativeElement).length).toBe(1);
        });
    }
});

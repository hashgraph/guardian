import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { ChangeDetectorRef, ElementRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { AccordionModule } from 'primeng/accordion';
import { SchemaFormNavigationComponent } from '../schema-form-navigation/schema-form-navigation.component';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FieldForm } from '../schema-form-model/field-form';
import { SchemaFormComponent } from './schema-form.component';
import { FormTextareaComponent } from './form-textarea/form-textarea.component';
import { SchemaFormRootComponent } from '../schema-form-root/schema-form-root.component';

describe('SchemaFormComponent Preview table validation', () => {
    const render = () => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormComponent, FormTextareaComponent],
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

    it('renders a required Preview section before its optional sub-form is added', () => {
        const { fixture } = render();
        const schema = new Schema({ iri: '#optional', document: {
            $id: '#optional', type: SchemaDataTypes.object,
            properties: { section: { $ref: '#section', title: 'Section', description: 'Section' } },
            $defs: { '#section': {
                $id: '#section', type: SchemaDataTypes.object,
                properties: { rate: { type: SchemaDataTypes.number, title: 'Rate', description: 'Rate' } },
            } },
        } });
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema, requiredFields: ['section.rate'] });
        model.build();
        const section = model.controls![0];
        expect(section.control).toBeNull();
        expect(section.required).toBeTrue();
        fixture.componentRef.setInput('form-model', model);
        expect(() => fixture.detectChanges()).not.toThrow();
        const header = fixture.nativeElement.querySelector(`[preview-field-id="${section.id}"]`);
        expect(header.querySelector('.required-field')).not.toBeNull();
        fixture.componentInstance.addGroup(section);
        expect(() => fixture.detectChanges()).not.toThrow();
        expect(section.control.get('rate')?.errors?.['required']).toBeTrue();
        section.control.disable();
        fixture.detectChanges();
        expect(header.querySelector('.required-field')).toBeNull();
    });

    const renderSection = (preview: boolean, array = false) => {
        const { fixture } = render();
        tick(48);
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({
            schema: new Schema({ iri: '#sections', document: {
                $id: '#sections', type: SchemaDataTypes.object,
                properties: { section: array ? { type: SchemaDataTypes.array, items: { $ref: '#section' } } : { $ref: '#section' } },
                $defs: {
                    '#section': { $id: '#section', type: SchemaDataTypes.object,
                        properties: { details: { $ref: '#details' } } },
                    '#details': { $id: '#details', type: SchemaDataTypes.object,
                        properties: { rate: { type: SchemaDataTypes.number, title: 'Rate', description: 'Rate' } } },
                },
            } }),
            preset: { section: array ? [{ details: { rate: 3 } }] : { details: { rate: 3 } } },
            requiredFields: preview ? [] : null,
        });
        model.build();
        fixture.componentRef.setInput('previewValidation', preview);
        fixture.componentRef.setInput('form-model', model);
        fixture.detectChanges();
        tick(128);
        fixture.detectChanges();
        fixture.debugElement.query(By.css('p-accordion')).triggerEventHandler('valueChange', null);
        fixture.detectChanges();
        tick(0);
        return fixture;
    };

    for (const array of [false, true]) {
        it(`reports loading before rendering a Preview input section with array ${array}`, fakeAsync(() => {
            const fixture = renderSection(true, array);
            const view = fixture.componentInstance;
            const changes = spyOn(view.previewLoadingChange, 'emit');
            fixture.debugElement.query(By.css('p-accordion')).triggerEventHandler('valueChange', 0);
            fixture.detectChanges();
            expect(changes).toHaveBeenCalledOnceWith(true);
            expect(fixture.debugElement.query(By.directive(SchemaFormComponent))).toBeNull();
            tick(16);
            expect(view.isPreviewSectionReady(view.formModel.controls![0])).toBeFalse();
            tick(16);
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.directive(SchemaFormComponent))).not.toBeNull();
            tick(16);
            expect(changes.calls.allArgs()).toEqual([[true], [false]]);
            expect(view.formModel.form.getRawValue().section).toEqual(array ? [{ details: { rate: 3 } }] : { details: { rate: 3 } });
        }));
    }

    it('renders an ordinary input section immediately without Preview loading', fakeAsync(() => {
        const fixture = renderSection(false);
        const view = fixture.componentInstance;
        const changes = spyOn(view.previewLoadingChange, 'emit');
        fixture.debugElement.query(By.css('p-accordion')).triggerEventHandler('valueChange', 0);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.directive(SchemaFormComponent))).not.toBeNull();
        expect(changes).not.toHaveBeenCalled();
    }));

    it('cancels pending Preview input rendering and balances its notification on close', fakeAsync(() => {
        const fixture = renderSection(true);
        const view = fixture.componentInstance;
        const changes = spyOn(view.previewLoadingChange, 'emit');
        const accordion = fixture.debugElement.query(By.css('p-accordion'));
        accordion.triggerEventHandler('valueChange', 0);
        tick(16);
        accordion.triggerEventHandler('valueChange', null);
        tick(64);
        expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        expect(view.isPreviewSectionReady(view.formModel.controls![0])).toBeFalse();
    }));

    it('cancels queued Preview input work when ordinary validation is restored', fakeAsync(() => {
        const fixture = renderSection(true);
        const view = fixture.componentInstance;
        const changes = spyOn(view.previewLoadingChange, 'emit');
        fixture.debugElement.query(By.css('p-accordion')).triggerEventHandler('valueChange', 0);
        tick(16);
        fixture.componentRef.setInput('previewValidation', false);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.directive(SchemaFormComponent))).not.toBeNull();
        tick(64);
        expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        expect(Reflect.get(view, 'previewFrames').size).toBe(0);
    }));

    for (const preview of [false, true]) {
        it(`renders a row added to a top-level list with Preview ${preview}`, fakeAsync(() => {
            const { fixture } = render();
            tick(48);
            const model = new FieldForm(new UntypedFormGroup({}));
            model.setData({
                schema: new Schema({ iri: '#sections', document: {
                    $id: '#sections', type: SchemaDataTypes.object,
                    properties: { section: { type: SchemaDataTypes.array, items: { $ref: '#section' } } },
                    $defs: {
                        '#section': { $id: '#section', type: SchemaDataTypes.object,
                            properties: { details: { $ref: '#details' } } },
                        '#details': { $id: '#details', type: SchemaDataTypes.object,
                            properties: { rate: { type: SchemaDataTypes.number, title: 'Rate', description: 'Rate' } } },
                    },
                } }),
                preset: { section: [{ details: { rate: 3 } }] },
                requiredFields: preview ? [] : null,
            });
            model.build();
            fixture.componentRef.setInput('previewValidation', preview);
            fixture.componentRef.setInput('form-model', model);
            fixture.detectChanges();
            tick(64);
            fixture.detectChanges();
            const view = fixture.componentInstance;
            const rows = view.formModel.controls![0];
            expect(rows.open).toBeTrue();
            const changes = spyOn(view.previewLoadingChange, 'emit');
            view.addItem(rows);
            fixture.detectChanges(false);
            const added = rows.list![1];
            expect(added.open).toBeTrue();
            tick(64);
            fixture.detectChanges(false);
            expect(view.isPreviewSectionReady(added)).toBeTrue();
            expect(changes.calls.allArgs()).toEqual(preview ? [[true], [false]] : []);
        }));
    }

    const renderLarge = (preview: boolean) => {
        const { fixture } = render();
        tick(48);
        const properties = Object.fromEntries(Array.from({ length: 25 }, (_, index) =>
            [`f${index}`, { type: SchemaDataTypes.number, title: `F${index}`, description: `F${index}` }]));
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({
            schema: new Schema({ iri: '#large', document: { $id: '#large', type: SchemaDataTypes.object, properties } }),
            requiredFields: preview ? [] : null,
        });
        model.build();
        const changes = spyOn(fixture.componentInstance.previewLoadingChange, 'emit');
        fixture.componentRef.setInput('previewValidation', preview);
        fixture.componentRef.setInput('form-model', model);
        fixture.detectChanges();
        const count = () => fixture.nativeElement.querySelectorAll('.form-field-container').length;
        return { fixture, changes, count };
    };

    it('renders Preview input fields in parts across frames and reports loading until the last part', fakeAsync(() => {
        const { fixture, changes, count } = renderLarge(true);
        expect(count()).toBe(10);
        expect(changes.calls.allArgs()).toEqual([[true]]);
        tick(16);
        expect(count()).toBe(20);
        tick(16);
        expect(count()).toBe(25);
        expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        tick(64);
        expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        fixture.destroy();
    }));

    it('renders every ordinary input field at once without loading notifications', fakeAsync(() => {
        const { changes, count } = renderLarge(false);
        expect(count()).toBe(25);
        tick(64);
        expect(changes).not.toHaveBeenCalled();
    }));

    for (const action of ['destroy', 'ordinary']) {
        it(`balances Preview input loading when interrupted by ${action}`, fakeAsync(() => {
            const { fixture, changes, count } = renderLarge(true);
            tick(16);
            if (action === 'destroy') {
                fixture.destroy();
            } else {
                fixture.componentRef.setInput('previewValidation', false);
                fixture.detectChanges();
                expect(count()).toBe(25);
            }
            tick(64);
            expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        }));
    }

    it('prepares a Preview input section opened from navigation', fakeAsync(() => {
        const fixture = renderSection(true);
        const view = fixture.componentInstance;
        const changes = spyOn(view.previewLoadingChange, 'emit');
        view.openField(view.formModel.controls![0].id);
        expect(changes).toHaveBeenCalledOnceWith(true);
        tick(1200);
        expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        expect(view.isPreviewSectionReady(view.formModel.controls![0])).toBeTrue();
    }));

    it('shows root loading synchronously for a real Preview input accordion-header click', fakeAsync(() => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormRootComponent, SchemaFormComponent, FormTextareaComponent, SchemaFormNavigationComponent],
            imports: [CommonModule, ReactiveFormsModule, AccordionModule, TableModule],
            providers: [
                UntypedFormBuilder,
                { provide: IPFSService, useValue: {} },
                { provide: DialogService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(SchemaFormRootComponent);
        fixture.componentRef.setInput('schema', new Schema({ iri: '#input', document: {
            $id: '#input', type: SchemaDataTypes.object,
            properties: { section: { $ref: '#section', title: 'Section', description: 'Section' } },
            $defs: { '#section': { $id: '#section', type: SchemaDataTypes.object,
                properties: { rate: { type: SchemaDataTypes.number, title: 'Rate', description: 'Rate' } } } },
        } }));
        fixture.componentRef.setInput('preset', { section: { rate: 3 } });
        fixture.componentRef.setInput('requiredFields', []);
        fixture.componentRef.setInput('showButtons', true);
        fixture.detectChanges();
        tick(256);
        fixture.detectChanges();
        const form = fixture.debugElement.query(By.directive(SchemaFormComponent));
        const header = form.query(By.css('p-accordion-header'));
        header.nativeElement.click();
        fixture.detectChanges();
        tick(64);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
        header.nativeElement.click();
        fixture.detectChanges();
        expect(fixture.componentInstance.previewLoadingCount).toBeGreaterThan(0);
        const cancel: HTMLButtonElement = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('.progress-footer button')).find(button => button.textContent?.trim() === 'Cancel')!;
        expect(cancel).toBeDefined();
        expect(cancel.disabled).toBeFalse();
        expect(cancel.closest('[inert]')).toBeNull();
        const cancelled = spyOn(fixture.componentInstance.cancelBtnEvent, 'emit');
        cancel.click();
        expect(cancelled).toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('.form-field-container').inert).toBeTrue();
        expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).not.toBeNull();
        tick(48);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
        expect(fixture.nativeElement.querySelector('.form-field-container').inert).toBeFalse();
    }));

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
        expect(getComputedStyle(target).outlineStyle).toBe('none');
        expect(getComputedStyle(target.querySelector('textarea')).borderColor).toBe('rgb(244, 67, 54)');
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

describe('SchemaFormComponent large tables inside opened sections', () => {
    const frames = async (count: number) => {
        for (let index = 0; index < count; index++) {
            await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        }
    };

    const render = (preview: boolean) => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormComponent, FormTextareaComponent],
            imports: [CommonModule, ReactiveFormsModule, TableModule, Textarea],
            providers: [
                { provide: IPFSService, useValue: {} },
                { provide: DialogService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const columns = Array.from({ length: 5 }, (_, index) => `c${index}`);
        const definitions: Record<string, any> = {
            '#row': {
                $id: '#row', type: SchemaDataTypes.object,
                properties: Object.fromEntries(columns.map((name) => [name, { type: SchemaDataTypes.string, title: name, description: name }])),
            },
            '#s0': {
                $id: '#s0', type: SchemaDataTypes.object,
                properties: { rows: { type: SchemaDataTypes.array, title: 'Rows', description: 'Rows', items: { $ref: '#row' } } },
            },
        };
        let preset: any = { rows: Array.from({ length: 120 }, (_, row) => Object.fromEntries(columns.map((name) => [name, `${row}-${name}`]))) };
        for (let depth = 1; depth < 4; depth++) {
            definitions[`#s${depth}`] = {
                $id: `#s${depth}`, type: SchemaDataTypes.object,
                properties: { [`s${depth - 1}`]: { $ref: `#s${depth - 1}`, title: `Section ${depth - 1}`, description: `Section ${depth - 1}` } },
            };
            preset = { [`s${depth - 1}`]: preset };
        }
        const schema = new Schema({ iri: '#large&1.0.0', document: {
            $id: '#large&1.0.0',
            $comment: JSON.stringify({ '@id': 'ctx:#large&1.0.0', term: 'large&1.0.0' }),
            type: SchemaDataTypes.object,
            properties: { s3: { $ref: '#s3', title: 'Section 3', description: 'Section 3' } },
            $defs: definitions,
        } } as any);
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema, preset: { s3: preset }, requiredFields: preview ? [] : null });
        model.build();
        const fixture = TestBed.createComponent(SchemaFormComponent);
        fixture.componentRef.setInput('form-model', model);
        fixture.componentRef.setInput('showButtons', false);
        fixture.componentRef.setInput('previewValidation', preview);
        return fixture;
    };

    const openAll = async (fixture: ComponentFixture<SchemaFormComponent>) => {
        for (let round = 0; round < 6; round++) {
            const elements = [fixture.debugElement, ...fixture.debugElement.queryAll(By.directive(SchemaFormComponent))];
            for (const element of elements) {
                const form: SchemaFormComponent = element.componentInstance;
                form.isShown = form.isShown.map(() => true);
                for (const item of form.formModel?.controls || []) {
                    if (item.isRef && !item.isArray && !item.open) {
                        item.open = true;
                        form.preparePreviewSection(item);
                        element.injector.get(ChangeDetectorRef).markForCheck();
                    }
                }
            }
            fixture.detectChanges();
            await frames(6);
        }
    };

    [true, false].forEach((preview) => {
        it(`opens every section and shows the table without a stack overflow with Preview ${preview}`, async () => {
            const errors: string[] = [];
            const onError = (event: ErrorEvent) => {
                errors.push(event.message);
                event.preventDefault();
            };
            window.addEventListener('error', onError);
            const fixture = render(preview);
            try {
                fixture.detectChanges();
                await frames(4);
                await openAll(fixture);
            } catch (caught: any) {
                errors.push(String(caught?.message || caught));
            }
            window.removeEventListener('error', onError);
            expect(errors).toEqual([]);
            const cells = fixture.debugElement.queryAll(By.css('td textarea'));
            expect(cells.length).toBe(600);
            expect(cells[0].nativeElement.value).toBe('0-c0');
            expect(cells.every((cell) => !!cell.injector.get(Textarea, null))).toBeTrue();
        });
    });
});

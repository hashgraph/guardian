import { ChangeDetectorRef, ElementRef, NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { UntypedFormBuilder } from '@angular/forms';
import { ISchemaDocument, Schema, SchemaDataTypes } from '@guardian/interfaces';
import { SchemaFormRootComponent } from './schema-form-root.component';

describe('SchemaFormRootComponent — required fields', () => {
    const numberField = (name: string): ISchemaDocument => ({ type: SchemaDataTypes.number, title: name, description: name });

    const calcDocument: ISchemaDocument = {
        $id: '#calc&1.0.0',
        $comment: JSON.stringify({ '@id': 'ctx:#calc&1.0.0', term: 'calc&1.0.0' }),
        title: 'Calc',
        description: 'Calc',
        type: SchemaDataTypes.object,
        properties: {
            amount: numberField('amount'),
            rate: numberField('rate'),
        },
        required: ['amount', 'rate'],
    };

    const createRoot = (): SchemaFormRootComponent => {
        const changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges', 'markForCheck']);
        const root = new SchemaFormRootComponent(new UntypedFormBuilder(), changeDetector);
        root.schema = new Schema({ iri: '#calc&1.0.0', document: calcDocument });
        root.ngOnChanges({ schema: new SimpleChange(null, root.schema, true) });
        tick(64);
        flush();
        return root;
    };

    const setRequired = (root: SchemaFormRootComponent, requiredFields: string[] | null): void => {
        const previous = root.requiredFields;
        root.requiredFields = requiredFields;
        root.ngOnChanges({ requiredFields: new SimpleChange(previous, requiredFields, false) });
        tick(64);
        flush();
    };

    const createRootWith = (document: ISchemaDocument, preset: unknown = null): SchemaFormRootComponent => {
        const changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges', 'markForCheck']);
        const root = new SchemaFormRootComponent(new UntypedFormBuilder(), changeDetector);
        root.schema = new Schema({ iri: '#calc&1.0.0', document });
        root.presetDocument = preset;
        root.ngOnChanges({
            schema: new SimpleChange(null, root.schema, true),
            presetDocument: new SimpleChange(null, preset, true)
        });
        tick(64);
        flush();
        return root;
    };

    const listDocument = (required: string[]): ISchemaDocument => ({
        ...calcDocument,
        properties: {
            amount: numberField('amount'),
            rows: { type: SchemaDataTypes.array, title: 'rows', description: 'rows', items: { type: SchemaDataTypes.number } },
        },
        required,
    });

    it('creates no row for a list that only the preview requires', fakeAsync(() => {
        const root = createRootWith(listDocument(['amount']));
        setRequired(root, ['amount', 'rows']);
        expect(root.model?.controls?.find(field => field.name === 'rows')?.list?.length).toBe(0);
        expect(root.group.getRawValue().rows).toEqual([]);
    }));

    it('still creates the first row of an ordinarily required list, also in preview', fakeAsync(() => {
        const root = createRootWith(listDocument(['amount', 'rows']));
        expect(root.model?.controls?.find(field => field.name === 'rows')?.list?.length).toBe(1);
        setRequired(root, ['amount']);
        expect(root.model?.controls?.find(field => field.name === 'rows')?.list?.length).toBe(1);
    }));

    const defaultDocument: ISchemaDocument = {
        ...calcDocument,
        properties: {
            amount: Object.assign(numberField('amount'), { default: 3 }),
            rate: numberField('rate'),
        },
    };

    it('keeps the default value label after preview is turned on and off', fakeAsync(() => {
        const root = createRootWith(defaultDocument);
        const amount = () => root.model?.controls?.find(field => field.name === 'amount');
        expect(amount()?.isPreset).toBeFalsy();
        setRequired(root, ['amount']);
        expect(amount()?.isPreset).toBeFalse();
        setRequired(root, null);
        expect(amount()?.isPreset).toBeFalse();
        expect(root.group.get('amount')?.value).toBe(3);
    }));

    for (const value of [7, 0]) {
        it(`keeps an edited default styled as edited after requirement rebuilds (${value})`, fakeAsync(() => {
            const root = createRootWith(defaultDocument);
            root.group.get('amount')?.setValue(value);
            root.group.get('amount')?.markAsDirty();
            setRequired(root, ['amount']);
            expect(root.group.get('amount')?.dirty).toBeTrue();
            expect(root.group.get('amount')?.value).toBe(value);
            expect(root.group.get('rate')?.pristine).toBeTrue();
            setRequired(root, null);
            const amount = root.model?.controls?.find(field => field.name === 'amount');
            expect(!!(amount?.default && !amount.isPreset && !amount.control.dirty)).toBeFalse();
            expect(root.group.get('amount')?.value).toBe(value);
        }));
    }

    it('still marks values loaded from a document as preset after a rebuild', fakeAsync(() => {
        const root = createRootWith(defaultDocument, { amount: 5 });
        setRequired(root, ['amount']);
        expect(root.model?.controls?.find(field => field.name === 'amount')?.isPreset).toBeTrue();
        expect(root.group.get('amount')?.value).toBe(5);
    }));

    it('updates Preview requirements without replacing fields, values or open sections', fakeAsync(() => {
        const root = createRootWith(defaultDocument);
        setRequired(root, ['amount']);
        const model = root.model!;
        const group = root.group;
        const amount = model.controls!.find(field => field.name === 'amount')!;
        amount.open = false;
        amount.control.setValue(7);
        amount.control.markAsDirty();
        const destroy = spyOn(model, 'destroy').and.callThrough();
        const values = jasmine.createSpy('values');
        group.valueChanges.subscribe(values);
        const forms = jasmine.createSpy('forms');
        root.form.subscribe(forms);
        setRequired(root, ['rate']);
        expect(root.model).toBe(model);
        expect(root.group).toBe(group);
        expect(root.model!.controls!.find(field => field.name === 'amount')).toBe(amount);
        expect(amount.open).toBeFalse();
        expect(amount.control.value).toBe(7);
        expect(amount.control.dirty).toBeTrue();
        expect(amount.isPreset).toBeFalse();
        expect(amount.control.errors).toBeNull();
        expect(group.get('rate')?.errors?.['required']).toBeTrue();
        expect(destroy).not.toHaveBeenCalled();
        expect(values).not.toHaveBeenCalled();
        expect(forms).not.toHaveBeenCalled();
        setRequired(root, null);
        expect(root.model).not.toBe(model);
        expect(root.group.get('amount')?.value).toBe(7);
        expect(root.group.get('amount')?.dirty).toBeTrue();
        expect(root.group.get('rate')?.errors?.['required']).toBeTrue();
    }));

    it('updates existing scalar list validators and keeps empty rows during Preview', fakeAsync(() => {
        const root = createRootWith(listDocument(['amount']), { rows: [null, 0] });
        setRequired(root, ['amount']);
        const rows = root.model!.controls!.find(field => field.name === 'rows')!;
        const list = rows.list;
        setRequired(root, ['rows']);
        expect(root.model!.controls!.find(field => field.name === 'rows')).toBe(rows);
        expect(rows.list).toBe(list);
        expect(rows.control.get('0')?.errors?.['required']).toBeTrue();
        expect(rows.control.get('1')?.errors).toBeNull();
        expect(root.group.invalid).toBeTrue();
        setRequired(root, []);
        expect(rows.control.get('0')?.errors).toBeNull();
        expect(root.group.valid).toBeTrue();
        expect(rows.list?.length).toBe(2);
        setRequired(root, null);
        expect(root.group.getRawValue().rows).toEqual([null, 0]);
        expect(root.group.get('amount')?.errors?.['required']).toBeTrue();
    }));

    it('updates indexed cells and parent marks without replacing table rows', fakeAsync(() => {
        const document: ISchemaDocument = {
            ...calcDocument,
            properties: { rows: { type: SchemaDataTypes.array, items: { $ref: '#row' } } },
            required: [],
            $defs: { '#row': { $id: '#row', type: SchemaDataTypes.object,
                properties: { amount: numberField('amount'), rate: numberField('rate') },
                required: ['amount', 'rate'],
            } },
        };
        const root = createRootWith(document, { rows: [{ amount: 0 }, {}] });
        setRequired(root, ['rows.0.amount']);
        const rows = root.model!.controls![0];
        rows.open = false;
        rows.list![1].open = true;
        const first = rows.list![0];
        const second = rows.list![1];
        first.control.get('rate')?.disable();
        setRequired(root, ['rows.1.rate']);
        expect(root.model!.controls![0]).toBe(rows);
        expect(rows.list![0]).toBe(first);
        expect(rows.list![1]).toBe(second);
        expect(rows.open).toBeFalse();
        expect(second.open).toBeTrue();
        expect(first.control.get('amount')?.value).toBe(0);
        expect(first.control.get('rate')?.disabled).toBeTrue();
        expect(second.control.get('amount')?.errors).toBeNull();
        expect(second.control.get('rate')?.errors?.['required']).toBeTrue();
        expect(root.group.invalid).toBeTrue();
        second.control.get('rate')?.setValue(2);
        expect(root.group.valid).toBeTrue();
        setRequired(root, []);
        expect(rows.required).toBeFalse();
    }));

    it('rebuilds for a changed schema even when Preview requirements also change', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, ['amount']);
        const model = root.model;
        const previous = root.schema;
        root.schema = new Schema({ iri: '#calc&1.0.0', document: {
            ...calcDocument, properties: { amount: numberField('amount'), extra: numberField('extra') },
        } });
        root.requiredFields = ['extra'];
        root.ngOnChanges({
            schema: new SimpleChange(previous, root.schema, false),
            requiredFields: new SimpleChange(['amount'], root.requiredFields, false),
        });
        tick(64);
        flush();
        expect(root.model).not.toBe(model);
        expect(root.group.get('extra')?.errors?.['required']).toBeTrue();
        expect(root.group.get('rate')).toBeNull();
    }));

    it('does not update requirements in place while the model is in ordinary mode', fakeAsync(() => {
        const root = createRoot();
        const model = root.model!;
        const amount = root.group.get('amount')!;
        expect(model.updatePreviewRequiredFields([])).toBeFalse();
        expect(amount.errors?.['required']).toBeTrue();
        expect(root.group.get('rate')?.errors?.['required']).toBeTrue();
        const update = spyOn(model, 'updatePreviewRequiredFields').and.callThrough();
        setRequired(root, ['rate']);
        expect(root.model).not.toBe(model);
        expect(update).toHaveBeenCalledOnceWith(['rate']);
        expect(root.group.get('amount')?.errors).toBeNull();
        expect(root.group.get('rate')?.errors?.['required']).toBeTrue();
    }));

    for (const preview of [false, true]) {
        it(`rebuilds and applies loaded values when requirements also arrive with Preview ${preview}`, fakeAsync(() => {
            const root = createRoot();
            if (preview) setRequired(root, ['amount']);
            const model = root.model!;
            const update = spyOn(model, 'updatePreviewRequiredFields').and.callThrough();
            const forms = jasmine.createSpy('forms');
            const presets = jasmine.createSpy('presets');
            root.form.subscribe(forms);
            root.presetApplied.subscribe(presets);
            const previous = root.requiredFields;
            root.requiredFields = preview ? ['rate'] : null;
            root.presetDocument = { amount: 7 };
            root.ngOnChanges({
                requiredFields: new SimpleChange(previous, root.requiredFields, false),
                presetDocument: new SimpleChange(null, root.presetDocument, false),
            });
            tick(64);
            flush();
            expect(update).not.toHaveBeenCalled();
            expect(root.model).not.toBe(model);
            expect(forms).toHaveBeenCalledOnceWith(root.group);
            expect(presets).toHaveBeenCalledOnceWith(root.group);
            expect(root.group.get('amount')?.value).toBe(7);
            expect(root.model!.controls![0].isPreset).toBeTrue();
            expect(root.group.get('rate')?.errors?.['required']).toBeTrue();
        }));
    }

    it('builds with the schema rule when no list is given', fakeAsync(() => {
        const root = createRoot();
        expect(root.group.get('amount')?.errors?.['required']).toBeTruthy();
        expect(root.group.get('rate')?.errors?.['required']).toBeTruthy();
    }));

    it('keeps the previous Preview model visible until a loaded preset can render after a paint', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, ['rate']);
        const model = root.model;
        const applied = spyOn(root.presetApplied, 'emit');
        root.presetDocument = { amount: 7, rate: 2 };
        root.ngOnChanges({ presetDocument: new SimpleChange(null, root.presetDocument, false) });
        expect(root.loading).toBeTrue();
        expect(root.model).toBe(model);
        tick(16);
        expect(root.model).toBe(model);
        tick(16);
        expect(root.model).not.toBe(model);
        expect(root.group.get('amount')?.value).toBe(7);
        expect(applied).toHaveBeenCalledOnceWith(root.group);
        expect(root.loading).toBeTrue();
        tick(16);
        expect(root.loading).toBeFalse();
    }));

    it('cancels a pending Preview rebuild when another preset replaces it or the form closes', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, []);
        const model = root.model;
        const applied = spyOn(root.presetApplied, 'emit');
        for (const amount of [7, 9]) {
            root.presetDocument = { amount };
            root.ngOnChanges({ presetDocument: new SimpleChange(null, root.presetDocument, false) });
            tick(16);
        }
        tick(32);
        expect(root.model).not.toBe(model);
        expect(root.group.get('amount')?.value).toBe(9);
        expect(applied).toHaveBeenCalledTimes(1);
        root.presetDocument = { amount: 11 };
        root.ngOnChanges({ presetDocument: new SimpleChange(null, root.presetDocument, false) });
        root.ngOnDestroy();
        tick(64);
        expect(applied).toHaveBeenCalledTimes(1);
    }));

    it('clears pending section-loading counts when Preview is disabled', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, []);
        root.onPreviewLoadingChange(true);
        root.onPreviewLoadingChange(true);
        root.onPreviewLoadingChange(false);
        expect(root.previewLoadingCount).toBe(1);
        setRequired(root, null);
        expect(root.previewLoadingCount).toBe(0);
        root.onPreviewLoadingChange(true);
        expect(root.previewLoadingCount).toBe(0);
    }));

    it('uses translucent transform-only loading styles only in Preview', fakeAsync(() => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormRootComponent],
            providers: [UntypedFormBuilder],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(SchemaFormRootComponent);
        fixture.componentRef.setInput('schema', new Schema({ iri: '#calc&1.0.0', document: calcDocument }));
        fixture.componentRef.setInput('requiredFields', []);
        fixture.detectChanges();
        const overlay = fixture.nativeElement.querySelector('.preview-loading-overlay');
        expect(overlay).not.toBeNull();
        expect(getComputedStyle(overlay).opacity).toBe('0.5');
        expect(getComputedStyle(overlay.querySelector('.guardian-loading-image')).willChange).toBe('transform');
        tick(48);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
        fixture.componentRef.setInput('requiredFields', null);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.guardian-loading')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
        tick(0);
    }));

    it('rebuilds with the listed fields and keeps the entered values', fakeAsync(() => {
        const root = createRoot();
        root.group.get('amount')?.setValue(5);
        setRequired(root, ['rate']);
        expect(root.group.get('amount')?.value).toBe(5);
        expect(root.group.get('amount')?.errors).toBeNull();
        expect(root.group.get('rate')?.errors?.['required']).toBeTruthy();
    }));

    it('goes back to the schema rule when the list is cleared', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, ['rate']);
        root.group.get('rate')?.setValue(2);
        setRequired(root, null);
        expect(root.group.get('rate')?.value).toBe(2);
        expect(root.group.get('amount')?.errors?.['required']).toBeTruthy();
    }));

    it('keeps hidden fields optional in preview and restores ordinary requirements', fakeAsync(() => {
        const root = createRoot();
        root.schema.fields[1].hidden = true;
        setRequired(root, ['amount', 'rate']);
        root.group.get('amount')?.setValue(5);
        expect(root.group.get('rate')?.errors?.['required']).toBeUndefined();
        expect(root.model?.controls?.find(field => field.name === 'rate')?.required).toBeFalse();
        expect(root.group.valid).toBeTrue();
        setRequired(root, null);
        expect(root.group.get('rate')?.errors?.['required']).toBeTruthy();
    }));

    it('emits the new form group after the rebuild', fakeAsync(() => {
        const root = createRoot();
        const emitted: unknown[] = [];
        root.form.subscribe((group) => emitted.push(group));
        setRequired(root, ['amount']);
        expect(emitted.length).toBe(1);
        expect(emitted[0]).toBe(root.group);
    }));
    it('reports new loaded values after the rebuild, but not the first values or a change of requirements', fakeAsync(() => {
        const root = createRoot();
        const applied: unknown[] = [];
        const forms: unknown[] = [];
        root.form.subscribe((group) => forms.push(group));
        root.presetApplied.subscribe((group) => applied.push(group));
        root.presetDocument = { amount: 1 };
        root.ngOnChanges({ presetDocument: new SimpleChange(null, root.presetDocument, true) });
        tick(64);
        flush();
        expect(applied.length).toBe(0);
        setRequired(root, ['amount']);
        expect(applied.length).toBe(0);
        const loaded = { amount: 7 };
        root.presetDocument = loaded;
        root.ngOnChanges({ presetDocument: new SimpleChange({ amount: 1 }, loaded, false) });
        tick(64);
        flush();
        expect(applied).toEqual([root.group]);
        expect(forms[forms.length - 1]).toBe(root.group);
        expect(root.group.get('amount')?.value).toBe(7);
    }));

    it('scrolls only the selected form field and keeps entered values', fakeAsync(() => {
        const root = createRoot();
        root.group.get('amount')?.setValue(5);
        const container = document.createElement('div');
        const target = document.createElement('div');
        const input = document.createElement('input');
        target.setAttribute('preview-field-id', root.model!.controls![1].id);
        target.appendChild(input);
        container.appendChild(target);
        document.body.appendChild(container);
        Object.assign(root, { contentContainerRef: new ElementRef(container) });
        const scroll = spyOn(target, 'scrollIntoView');
        root.focusPreviewField('rate');
        expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
        expect(document.activeElement).toBe(input);
        expect(root.group.get('amount')?.value).toBe(5);
        tick(64);
        flush();
        container.remove();
    }));

    it('scrolls to a missing field that a nested section renders after the first look', fakeAsync(() => {
        const root = createRoot();
        const container = document.createElement('div');
        const target = document.createElement('div');
        const input = document.createElement('input');
        target.setAttribute('preview-field-id', root.model!.controls![1].id);
        target.appendChild(input);
        document.body.appendChild(container);
        Object.assign(root, { contentContainerRef: new ElementRef(container) });
        const scroll = spyOn(target, 'scrollIntoView');
        root.focusPreviewField('rate');
        expect(scroll).not.toHaveBeenCalled();
        tick(100);
        container.appendChild(target);
        tick(50);
        expect(scroll).toHaveBeenCalledOnceWith({ behavior: 'smooth', block: 'center' });
        expect(document.activeElement).toBe(input);
        tick(64);
        flush();
        container.remove();
    }));

    it('scrolls again when the missing field moved out of view after the first scroll', fakeAsync(() => {
        const root = createRoot();
        const container = document.createElement('div');
        const target = document.createElement('div');
        target.setAttribute('preview-field-id', root.model!.controls![1].id);
        container.appendChild(target);
        document.body.appendChild(container);
        Object.assign(root, { contentContainerRef: new ElementRef(container) });
        const scroll = spyOn(target, 'scrollIntoView');
        spyOn(target, 'getBoundingClientRect').and.returnValue(new DOMRect(0, window.innerHeight + 500, 10, 10));
        root.focusPreviewField('rate');
        expect(scroll).toHaveBeenCalledOnceWith({ behavior: 'smooth', block: 'center' });
        tick(300);
        expect(scroll).toHaveBeenCalledWith({ block: 'center' });
        tick(1500);
        expect(scroll).toHaveBeenCalledTimes(6);
        expect(Reflect.get(root, 'previewFocusTimer')).toBeNull();
        container.remove();
    }));

    it('stops looking for a missing field that never appears', fakeAsync(() => {
        const root = createRoot();
        const container = document.createElement('div');
        Object.assign(root, { contentContainerRef: new ElementRef(container) });
        root.focusPreviewField('rate');
        tick(2000);
        expect(Reflect.get(root, 'previewFocusTimer')).toBeNull();
    }));

    it('waits for Preview loading to release inert controls before focusing a missing field', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, ['rate']);
        const container = document.createElement('div');
        const target = document.createElement('div');
        const input = document.createElement('input');
        target.setAttribute('preview-field-id', root.model!.controls![1].id);
        target.appendChild(input);
        container.appendChild(target);
        document.body.appendChild(container);
        Object.assign(root, { contentContainerRef: new ElementRef(container) });
        const scroll = spyOn(target, 'scrollIntoView');
        root.onPreviewLoadingChange(true);
        root.focusPreviewField('rate');
        tick(50);
        expect(scroll).not.toHaveBeenCalled();
        expect(document.activeElement).not.toBe(input);
        root.onPreviewLoadingChange(false);
        tick(50);
        expect(scroll).toHaveBeenCalledOnceWith({ behavior: 'smooth', block: 'center' });
        expect(document.activeElement).toBe(input);
        tick(2000);
        container.remove();
    }));

    it('focuses the first missing field after rebuilding requirements', fakeAsync(() => {
        const root = createRoot();
        const focus = spyOn(root, 'focusPreviewField');
        root.previewMissingFields = ['rate','amount'];
        root.requiredFields = ['rate','amount'];
        root.ngOnChanges({
            requiredFields: new SimpleChange(null, root.requiredFields, false),
            previewMissingFields: new SimpleChange([], root.previewMissingFields, false)
        });
        tick(64);
        flush();
        expect(focus).toHaveBeenCalledOnceWith('rate');
    }));

    it('maps an indexed missing path to only that table cell and clears it with preview', fakeAsync(() => {
        const root = createRoot();
        const rowField: ISchemaDocument = {
            type: SchemaDataTypes.object,
            title: 'Area',
            properties: { PEt: numberField('PEt'), PBt: numberField('PBt') },
            required: ['PEt', 'PBt']
        };
        root.schema = new Schema({ iri: '#calc&1.0.0', document: {
            ...calcDocument,
            properties: { rows: { type: SchemaDataTypes.array, items: { $ref: '#row' } } },
            $defs: { '#row': { ...rowField, $id: '#row' } },
            required: ['rows']
        } });
        root.presetDocument = { rows: [{ PEt: 4, PBt: 1 }, { PBt: 2 }] };
        root.requiredFields = ['rows.PEt', 'rows.PBt'];
        root.previewMissingFields = ['rows.1.PEt'];
        const focus = spyOn(root, 'focusPreviewField');
        root.ngOnChanges({ schema: new SimpleChange(null, root.schema, false) });
        tick(64);
        flush();
        const rows = root.model!.controls![0].list!;
        const target = rows[1].model.controls.find((field: { name: string }) => field.name === 'PEt');
        expect(root.previewMissingFieldIds).toEqual([target.id]);
        expect(focus).toHaveBeenCalledWith('rows.1.PEt');
        expect(root.group.getRawValue().rows).toEqual([{ PEt: 4, PBt: 1 }, { PEt: null, PBt: 2 }]);
        root.previewMissingFields = [];
        root.ngOnChanges({ previewMissingFields: new SimpleChange(['rows.1.PEt'], [], false) });
        tick(64);
        flush();
        expect(root.previewMissingFieldIds).toEqual([]);
    }));

    const rowDocument: ISchemaDocument = {
        $id: '#row',
        type: SchemaDataTypes.object,
        title: 'Area',
        properties: { PEt: numberField('PEt'), PBt: numberField('PBt') },
        required: ['PEt', 'PBt']
    };

    const createRootWithOptionalParts = (): SchemaFormRootComponent => {
        const root = createRoot();
        root.schema = new Schema({ iri: '#calc&1.0.0', document: {
            ...calcDocument,
            properties: {
                ...calcDocument.properties,
                rows: { type: SchemaDataTypes.array, items: { $ref: '#row' } },
                details: { $ref: '#row' }
            },
            $defs: { '#row': rowDocument }
        } });
        root.ngOnChanges({ schema: new SimpleChange(null, root.schema, false) });
        tick(64);
        flush();
        root.group.get('amount')?.setValue(1);
        root.group.get('rate')?.setValue(2);
        return root;
    };

    it('creates no row or sub-section for parts that only preview requires, before and after preview is switched off', fakeAsync(() => {
        const root = createRootWithOptionalParts();
        setRequired(root, ['rows.PEt', 'details.PEt']);
        expect(root.group.getRawValue().rows).toEqual([]);
        expect(root.group.getRawValue().details).toBeUndefined();
        setRequired(root, null);
        expect(root.group.getRawValue().rows).toEqual([]);
        expect(root.group.getRawValue().details).toBeUndefined();
        expect(root.group.valid).toBeTrue();
    }));

    it('keeps rows with values, including zero, and their positions when preview is switched off', fakeAsync(() => {
        const root = createRootWithOptionalParts();
        root.presetDocument = { amount: 1, rate: 2, rows: [{ PEt: 0 }, {}, { PBt: 3 }] };
        root.ngOnChanges({ presetDocument: new SimpleChange(null, root.presetDocument, false) });
        tick(64);
        flush();
        setRequired(root, ['rows.PEt']);
        setRequired(root, null);
        expect(root.group.getRawValue().rows).toEqual([
            { PEt: 0, PBt: null }, { PEt: null, PBt: null }, { PEt: null, PBt: 3 }
        ]);
    }));

    it('keeps unsaved edits marked after the requirements change', fakeAsync(() => {
        const root = createRoot();
        root.group.get('amount')?.setValue(5);
        root.group.get('amount')?.markAsDirty();
        setRequired(root, ['rate']);
        expect(root.group.dirty).toBeTrue();
        setRequired(root, null);
        expect(root.group.dirty).toBeTrue();
        expect(root.group.get('amount')?.value).toBe(5);
    }));

    it('keeps the form and refreshes missing highlights when the same requirements arrive again', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, ['rate']);
        const group = root.group;
        root.requiredFields = ['rate'];
        root.previewMissingFields = ['rate'];
        root.ngOnChanges({
            requiredFields: new SimpleChange(['rate'], root.requiredFields, false),
            previewMissingFields: new SimpleChange([], root.previewMissingFields, false)
        });
        tick(2000);
        expect(root.group).toBe(group);
        expect(root.previewMissingFieldIds.length).toBe(1);
        expect(root.loading).toBeFalse();
        root.previewMissingFields = [];
        setRequired(root, ['amount']);
        expect(root.group).toBe(group);
        expect(root.group.get('amount')?.errors?.['required']).toBeTrue();
        expect(root.group.get('rate')?.errors).toBeNull();
    }));

    it('keeps an untouched form clean after the requirements change', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, ['rate']);
        expect(root.group.pristine).toBeTrue();
        setRequired(root, null);
        expect(root.group.pristine).toBeTrue();
    }));

});

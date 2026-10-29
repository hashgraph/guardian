import { ChangeDetectorRef, ElementRef, SimpleChange } from '@angular/core';
import { fakeAsync, flush } from '@angular/core/testing';
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
        const changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']);
        const root = new SchemaFormRootComponent(new UntypedFormBuilder(), changeDetector);
        root.schema = new Schema({ iri: '#calc&1.0.0', document: calcDocument });
        root.ngOnChanges({ schema: new SimpleChange(null, root.schema, true) });
        flush();
        return root;
    };

    const setRequired = (root: SchemaFormRootComponent, requiredFields: string[] | null): void => {
        const previous = root.requiredFields;
        root.requiredFields = requiredFields;
        root.ngOnChanges({ requiredFields: new SimpleChange(previous, requiredFields, false) });
        flush();
    };

    it('builds with the schema rule when no list is given', fakeAsync(() => {
        const root = createRoot();
        expect(root.group.get('amount')?.errors?.['required']).toBeTruthy();
        expect(root.group.get('rate')?.errors?.['required']).toBeTruthy();
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
        flush();
        expect(applied.length).toBe(0);
        setRequired(root, ['amount']);
        expect(applied.length).toBe(0);
        const loaded = { amount: 7 };
        root.presetDocument = loaded;
        root.ngOnChanges({ presetDocument: new SimpleChange({ amount: 1 }, loaded, false) });
        flush();
        expect(applied).toEqual([root.group]);
        expect(forms[forms.length - 1]).toBe(root.group);
        expect(root.group.get('amount')?.value).toBe(7);
    }));

    it('shows field titles, parent sections and the one-based row number', fakeAsync(() => {
        const root = createRoot();
        const fields = root.schema.fields;
        const bonus = Object.assign(fields[1], { name: 'bonus', title: 'Bonus' });
        root.fields = [Object.assign(fields[0], { name: 'rows', title: 'Fuel usage', fields: [bonus], isArray: true })];
        expect(root.previewFieldLocation('rows.1.bonus')).toBe('Calc › Fuel usage › row 2 › Bonus');
        expect(root.previewFieldLocation('rows.1.unknown')).toBe('Calc › Fuel usage › row 2 › unknown');
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
        flush();
        const rows = root.model!.controls![0].list!;
        const target = rows[1].model.controls.find((field: { name: string }) => field.name === 'PEt');
        expect(root.previewMissingFieldIds).toEqual([target.id]);
        expect(focus).toHaveBeenCalledWith('rows.1.PEt');
        expect(root.group.getRawValue().rows).toEqual([{ PEt: 4, PBt: 1 }, { PEt: null, PBt: 2 }]);
        root.previewMissingFields = [];
        root.ngOnChanges({ previewMissingFields: new SimpleChange(['rows.1.PEt'], [], false) });
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
        flush();
        root.group.get('amount')?.setValue(1);
        root.group.get('rate')?.setValue(2);
        return root;
    };

    it('removes the empty row and sub-section that only preview created when preview is switched off', fakeAsync(() => {
        const root = createRootWithOptionalParts();
        setRequired(root, ['rows.PEt', 'details.PEt']);
        expect(root.group.getRawValue().rows.length).toBe(1);
        expect(root.group.getRawValue().details).toBeDefined();
        setRequired(root, null);
        expect(root.group.getRawValue().rows).toEqual([]);
        expect(root.group.getRawValue().details).toBeUndefined();
        expect(root.group.valid).toBeTrue();
    }));

    it('keeps rows with values, including zero, and their positions when preview is switched off', fakeAsync(() => {
        const root = createRootWithOptionalParts();
        root.presetDocument = { amount: 1, rate: 2, rows: [{ PEt: 0 }, {}, { PBt: 3 }] };
        root.ngOnChanges({ presetDocument: new SimpleChange(null, root.presetDocument, false) });
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
        flush();
        expect(root.group).toBe(group);
        expect(root.previewMissingFieldIds.length).toBe(1);
        expect(root.loading).toBeFalse();
        setRequired(root, ['amount']);
        expect(root.group).not.toBe(group);
    }));

    it('keeps an untouched form clean after the requirements change', fakeAsync(() => {
        const root = createRoot();
        setRequired(root, ['rate']);
        expect(root.group.pristine).toBeTrue();
        setRequired(root, null);
        expect(root.group.pristine).toBeTrue();
    }));

});

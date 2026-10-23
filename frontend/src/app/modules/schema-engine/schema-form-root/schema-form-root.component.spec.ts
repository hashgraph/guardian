import { ChangeDetectorRef, SimpleChange } from '@angular/core';
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

    it('emits the new form group after the rebuild', fakeAsync(() => {
        const root = createRoot();
        const emitted: unknown[] = [];
        root.form.subscribe((group) => emitted.push(group));
        setRequired(root, ['amount']);
        expect(emitted.length).toBe(1);
        expect(emitted[0]).toBe(root.group);
    }));
});

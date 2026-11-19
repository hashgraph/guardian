import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { FormulaItemType, Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { IPFSService } from 'src/app/services/ipfs.service';
import { CsvService } from 'src/app/services/csv.service';
import { ArtifactService } from 'src/app/services/artifact.service';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { GzipService } from 'src/app/services/gzip.service';
import { TableFormulaButtonComponent } from '../../common/table-dialog/table-formula-button.component';
import { FormFormulas } from '../../formulas/models/form-formulas';
import { FormulasTree } from '../../formulas/models/formula-tree';
import { FieldForm } from '../schema-form-model/field-form';
import { TableFieldComponent } from '../table-field/table-field.component';
import { SchemaFormComponent } from './schema-form.component';

const SCHEMA = '#tables&1.0.0';
const columns = [{ key: 'co2', name: 'CO2' }];

function renderTable(isArray: boolean) {
    const open = vi.fn();
    TestBed.configureTestingModule({
        declarations: [SchemaFormComponent, TableFieldComponent],
        imports: [CommonModule, ReactiveFormsModule, TableFormulaButtonComponent],
        providers: [
            { provide: DialogService, useValue: { open } },
            { provide: IPFSService, useValue: {} },
            { provide: CsvService, useValue: {} },
            { provide: ArtifactService, useValue: {} },
            { provide: IndexedDbRegistryService, useValue: { registerStores: () => Promise.resolve() } },
            { provide: GzipService, useValue: {} },
        ],
        schemas: [NO_ERRORS_SCHEMA],
    });
    const schema = new Schema({ iri: SCHEMA, document: {
        $id: SCHEMA, type: SchemaDataTypes.object, properties: {
            results: {
                ...(isArray ? { type: SchemaDataTypes.array, items: { type: SchemaDataTypes.string } } : { type: SchemaDataTypes.string }),
                title: 'Results', description: 'Results',
                $comment: JSON.stringify({ customType: 'table', tableColumns: columns, isUpdatable: false })
            }
        }
    } });
    const model = new FieldForm(new UntypedFormGroup({}));
    model.setData({ schema, preset: isArray ? { results: [''] } : {} });
    model.build();
    const tree = new FormulasTree();
    tree.setFormulas([{ config: { formulas: [{ uuid: 'f', name: 'CO2 formula', description: '', type: FormulaItemType.Text,
        link: { type: 'schema', entityId: SCHEMA, item: 'results', columnKey: 'co2' }
    }] } }]);
    tree.update();
    const formulas = new FormFormulas(tree, SCHEMA);
    formulas.setData({});
    const fixture = TestBed.createComponent(SchemaFormComponent);
    fixture.componentRef.setInput('form-model', model);
    fixture.componentRef.setInput('showButtons', false);
    fixture.componentRef.setInput('isEditMode', true);
    fixture.componentRef.setInput('formulas', formulas);
    fixture.detectChanges();
    return { fixture, model, tree, formulas, open };
}

describe('SchemaFormComponent table formulas', () => {
    for (const isArray of [false, true]) {
        it(`dims a locked ${isArray ? 'repeated' : 'single'} table while leaving its Fx clickable`, () => {
            const { fixture, model, open } = renderTable(isArray);
            const table = fixture.debugElement.query(By.directive(TableFieldComponent));
            expect(table).not.toBeNull();
            expect(getComputedStyle(table.nativeElement).opacity).toBe('0.6');
            expect(table.componentInstance.readonly).toBe(true);
            const input: HTMLInputElement = table.nativeElement.querySelector('input[type="file"]');
            expect(input.disabled).toBe(true);
            const button: HTMLButtonElement = table.nativeElement.querySelector('app-table-formula-button button');
            expect(button.disabled).toBe(false);
            button.click();
            expect(open).toHaveBeenCalledOnce();
            model.controls![0].isUpdatable = true;
            fixture.detectChanges();
            expect(getComputedStyle(table.nativeElement).opacity).toBe('1');
            expect(table.componentInstance.readonly).toBe(false);
        });
    }

    it('keeps column formula lookups cached across request-form redraws', () => {
        const { fixture, tree, formulas } = renderTable(false);
        const get = vi.spyOn(tree, 'get');
        for (let index = 0; index < 3; index++) {
            fixture.detectChanges();
        }
        expect(get).not.toHaveBeenCalled();
        formulas.setData({});
        fixture.detectChanges();
        expect(get.mock.calls.filter(call => call[3]?.columnKey === 'co2')).toHaveLength(1);
    });
});

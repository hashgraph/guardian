import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableDialogComponent } from './table-dialog.component';

describe('TableDialogComponent', () => {
    const build = (data: any): TableDialogComponent => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [TableDialogComponent],
            providers: [
                { provide: DynamicDialogRef, useValue: { close: () => {} } },
                { provide: DynamicDialogConfig, useValue: { data } },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        });

        const component = TestBed.createComponent(TableDialogComponent).componentInstance;
        component.ngOnInit();
        return component;
    };

    const dataColumns = (component: TableDialogComponent) =>
        component.columnDefs.filter((def) => def.colId !== '__row__');

    const declaredDefs = [
        { field: 'year', colId: 'year', headerName: 'Year' },
        { field: 'co2_tonnes', colId: 'co2_tonnes', headerName: 'CO2 (tonnes)' },
    ];

    it('builds a blank sheet of 26 lettered columns when nothing is fixed', () => {
        const component = build({});

        expect(dataColumns(component).length).toBe(26);
        expect(dataColumns(component)[0].headerName).toBe('A');
        expect(dataColumns(component)[0].field).toBe('C1');
    });

    it('keeps exactly the declared columns in fixed mode', () => {
        const component = build({ columnDefs: declaredDefs, fixedColumns: true });

        expect(dataColumns(component).length).toBe(2);
        expect(dataColumns(component).map((def) => def.field)).toEqual(['year', 'co2_tonnes']);
        expect(dataColumns(component).map((def) => def.headerName)).toEqual(['Year', 'CO2 (tonnes)']);
    });

    it('generates blank rows keyed by the declared keys', () => {
        const component = build({ columnDefs: declaredDefs, fixedColumns: true });

        expect(component.rowData.length).toBeGreaterThan(0);
        expect(component.rowData[0]).toEqual({ year: '', co2_tonnes: '' });
    });

    it('does not grow the columns when a wide paste arrives in fixed mode', () => {
        const component = build({ columnDefs: declaredDefs, fixedColumns: true });

        component.onPasteStart({ data: [['1', '2', '3', '4', '5']], target: { rowIndex: 0 } });

        expect(dataColumns(component).length).toBe(2);
    });

    it('still grows the columns for a wide paste when not fixed', () => {
        const component = build({});
        const pastedRow = Array.from({ length: 27 }, (_, index) => String(index + 1));

        component.onPasteStart({ data: [pastedRow], target: { rowIndex: 0 } });

        expect(dataColumns(component).length).toBe(27);
        expect(dataColumns(component)[26].headerName).toBe('AA');
        expect(dataColumns(component)[26].field).toBe('C27');
    });

    it('ignores the fixed flag when no columns were handed in', () => {
        const component = build({ fixedColumns: true });

        expect(dataColumns(component).length).toBe(26);
    });
});

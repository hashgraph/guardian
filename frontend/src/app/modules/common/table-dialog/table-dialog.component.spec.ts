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
                { provide: DynamicDialogRef, useValue: { close: vi.fn() } },
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

    it('keeps one column definition array on every initialization path', () => {
        for (const data of [
            {},
            { columnDefs: declaredDefs },
            { columnDefs: declaredDefs, fixedColumns: true },
            { columnDefs: declaredDefs, fixedColumns: true, rowData: [{ year: '2025' }] },
            { columnDefs: declaredDefs, readOnly: true },
        ]) {
            const component = build(data);
            const columns = component.columnDefs;

            expect(component.columnDefs).toBe(columns);
            expect(columns[0].colId).toBe('__row__');
            expect(columns.length).toBeGreaterThan(1);
        }
    });

    for (const readOnly of [false, true]) {
        it(`keeps columns stable while scrolling and growing rows with readOnly=${readOnly}`, () => {
            const component = build({ columnDefs: declaredDefs, fixedColumns: true, readOnly,
                rowData: [{ year: '2025', co2_tonnes: '10' }] });
            const columns = component.columnDefs;
            const api = {
                getLastDisplayedRowIndex: () => component.rowData.length - 1,
                getDisplayedCenterColumns: () => [{ getColId: () => 'co2_tonnes' }],
                setGridOption: vi.fn(),
                sizeColumnsToFit: vi.fn(),
                setColumnWidths: vi.fn(),
            };
            Object.assign(component, { api });

            component.onBodyScroll({} as any);
            component.onBodyScroll({} as any);

            expect(component.columnDefs).toBe(columns);
            expect(dataColumns(component).map(def => def.field)).toEqual(['year', 'co2_tonnes']);
            expect(dataColumns(component).every(def => def.editable === !readOnly)).toBe(true);
            expect(component.rowData.length).toBe(201);
            expect(component.rowData[0]).toEqual({ year: '2025', co2_tonnes: '10' });
            expect(component.rowData[200]).toEqual({ year: '', co2_tonnes: '' });
            expect(api.setGridOption.mock.calls.map(call => call[0])).toEqual(['rowData', 'rowData']);
            expect(api.sizeColumnsToFit).not.toHaveBeenCalled();
            expect(api.setColumnWidths.mock.calls.every(call => call[0][0].key === '__row__')).toBe(true);
        });
    }

    it('updates the stored column array once when an old table grows on scroll', () => {
        const component = build({});
        const columns = component.columnDefs;
        const api = {
            getLastDisplayedRowIndex: () => 0,
            getDisplayedCenterColumns: () => [{ getColId: () => 'C26' }],
            setGridOption: vi.fn(),
            sizeColumnsToFit: vi.fn(),
        };
        Object.assign(component, { api });

        component.onBodyScroll({} as any);
        const grownColumns = component.columnDefs;
        component.onBodyScroll({} as any);

        expect(component.columnDefs).not.toBe(columns);
        expect(component.columnDefs).toBe(grownColumns);
        expect(component.columnDefs[0]).toBe(columns[0]);
        expect(dataColumns(component).length).toBe(36);
        expect(dataColumns(component)[35].field).toBe('C36');
        expect(component.rowData[0].C36).toBe('');
        expect(api.setGridOption).toHaveBeenCalledExactlyOnceWith('columnDefs', component.columnDefs);
    });

    it('saves edited cells and newly pasted rows without changing schema columns', () => {
        const component = build({ columnDefs: declaredDefs, fixedColumns: true,
            rowData: [{ year: '2025', co2_tonnes: '10' }] });
        const columns = component.columnDefs;
        const api = { setGridOption: vi.fn(), setColumnWidths: vi.fn(), stopEditing: vi.fn() };
        Object.assign(component, { api });

        component.onPasteStart({ data: [['2026', '20', 'extra']], target: { rowIndex: 1 } });
        component.rowData[1].year = '2026';
        component.rowData[1].co2_tonnes = '20';
        component.save();

        expect(component.columnDefs).toBe(columns);
        expect(api.stopEditing).toHaveBeenCalledOnce();
        expect(TestBed.inject(DynamicDialogRef).close).toHaveBeenCalledExactlyOnceWith({
            columnDefs: columns.slice(1),
            rowData: [{ year: '2025', co2_tonnes: '10' }, { year: '2026', co2_tonnes: '20' }],
        });
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

    it('still opens a blank sheet for an editable table that has columns but no rows', () => {
        const component = build({ columnDefs: declaredDefs });

        expect(dataColumns(component).length).toBe(26);
        expect(component.rowData.length).toBeGreaterThan(0);
    });

    it('keeps the handed-in columns of a read-only table with no rows', () => {
        const component = build({ columnDefs: declaredDefs, readOnly: true });

        expect(dataColumns(component).map((def) => def.field)).toEqual(['year', 'co2_tonnes']);
        expect(component.rowData).toEqual([]);
    });

    it('ignores the fixed flag when no columns were handed in', () => {
        const component = build({ fixedColumns: true });

        expect(dataColumns(component).length).toBe(26);
    });
    it('attaches a formula action to the ninth header while preserving read-only data and default sorting', () => {
        const action = { label: 'Show formulas for Net', open: vi.fn() };
        const columns = Array.from({ length: 10 }, (_, index) => ({ field: `column${index}`, headerName: `Column ${index}` }));
        const component = build({ columnDefs: columns, rowData: [{ column8: '12' }], readOnly: true,
            formulaActions: { column: (key: string) => key === 'column8' ? action : null } });
        const def = dataColumns(component)[8];
        expect(def.headerComponentParams.innerHeaderComponent).toBeDefined();
        expect(def.headerComponentParams.innerHeaderComponentParams.formulaActions.column('column8')).toBe(action);
        expect(def.editable).toBe(false);
        expect(def.sortable).toBeUndefined();
        expect(component.rowData[0].column8).toBe('12');
    });

});

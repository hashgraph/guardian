import { TestBed } from '@angular/core/testing';
import { AgGridModule } from 'ag-grid-angular';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableDialogComponent } from './table-dialog.component';
import { TableFormulaCellComponent } from './table-formula-cell.component';

describe('TableFormulaCellComponent', () => {
    it('uses the source row after sorting and keeps the displayed value', () => {
        const open = vi.fn();
        const cell = vi.fn((key, row) => row === 5 ? { label: 'Show cell formula', open } : null);
        const renderer = new TableFormulaCellComponent();
        renderer.agInit({ valueFormatted: '1,234', value: 1234, columnKey: 'co2', node: { rowIndex: 0, sourceRowIndex: 5 }, formulaActions: { cell } } as any);
        expect(renderer.value).toBe('1,234');
        renderer.action!.open(new Event('click'));
        expect(cell).toHaveBeenCalledWith('co2', 5);
        expect(open).toHaveBeenCalledOnce();
        renderer.refresh({ value: 0, columnKey: 'co2', node: { rowIndex: 5, sourceRowIndex: 0 }, formulaActions: { cell } } as any);
        expect(renderer.value).toBe(0);
        expect(renderer.action).toBeNull();
    });

    it('keeps Fx visible and clickable in a narrow Open Table cell with a long value', async () => {
        const open = vi.fn();
        TestBed.configureTestingModule({
            declarations: [TableDialogComponent],
            imports: [AgGridModule],
            providers: [
                { provide: DynamicDialogRef, useValue: { close: () => {} } },
                { provide: DynamicDialogConfig, useValue: { data: {
                    readOnly: true,
                    fixedColumns: true,
                    columnDefs: [{ field: 'year', headerName: 'Year' }, { field: 'co2', headerName: 'CO2' }],
                    rowData: [{ year: '2024', co2: '1234567890'.repeat(20) }],
                    formulaActions: {
                        column: () => null,
                        cell: (key: string, row: number) => key === 'co2' && row === 0 ? { label: 'Show cell formula', open } : null
                    }
                } } }
            ]
        });
        const fixture = TestBed.createComponent(TableDialogComponent);
        fixture.nativeElement.style.width = '320px';
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();

        const button = await vi.waitFor(() => {
            const found: HTMLButtonElement | null = fixture.nativeElement.querySelector('.table-fx');
            expect(found).not.toBeNull();
            return found!;
        }, { timeout: 5000 });
        await vi.waitFor(() => {
            const cell = button.closest('.ag-cell') as HTMLElement;
            expect(cell.getBoundingClientRect().width).toBeLessThan(200);
        }, { timeout: 5000 });

        const cell = button.closest('.ag-cell') as HTMLElement;
        const cellBox = cell.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();
        expect(buttonBox.width).toBe(22);
        expect(buttonBox.left).toBeGreaterThanOrEqual(cellBox.left);
        expect(buttonBox.right).toBeLessThanOrEqual(cellBox.right);

        const text = cell.querySelector('app-table-formula-cell span') as HTMLElement;
        expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);

        const hit = document.elementFromPoint(buttonBox.left + buttonBox.width / 2, buttonBox.top + buttonBox.height / 2);
        expect(button.contains(hit)).toBe(true);
        (hit as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(open).toHaveBeenCalledOnce();
        fixture.nativeElement.remove();
    });
});

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
});

import { CsvService } from '@services/csv.service';
import { TableViewerComponent } from './table-viewer.component';

describe('TableViewerComponent', () => {
    const createComponent = (): TableViewerComponent => new TableViewerComponent(
        null!,
        new CsvService(),
        null!,
        null!,
        null!,
        null!,
        null!
    );

    it('shows declared display names from an object value', () => {
        const component = createComponent();
        component.value = {
            type: 'table',
            cid: 'table-cid',
            columnKeys: ['year', 'amount'],
            columnNames: ['Year', 'Amount (t)']
        };

        expect(component.buildColumnHeader(0)).toBe('Year');
        expect(component.buildColumnHeader(1)).toBe('Amount (t)');
    });

    it('shows declared display names from a JSON string value', () => {
        const component = createComponent();
        component.value = JSON.stringify({
            type: 'table',
            cid: 'table-cid',
            columnKeys: ['year'],
            columnNames: ['Year']
        });

        expect(component.buildColumnHeader(0)).toBe('Year');
    });

    it('lays the preview grid out over the visible columns only', () => {
        const component = createComponent();
        component.previewColumnDefs = [
            { field: 'year' },
            { field: 'co2_tonnes' },
            { field: 'region' }
        ];

        expect(component.previewGridTemplate).toBe('48px repeat(3, minmax(80px, 1fr))');
    });

    it('falls back to eight tracks when there are no preview columns', () => {
        const component = createComponent();

        expect(component.previewGridTemplate).toBe('48px repeat(8, minmax(80px, 1fr))');
    });

    it('keeps spreadsheet letters when columnNames are absent', () => {
        const component = createComponent();
        component.value = {
            type: 'table',
            cid: 'table-cid',
            columnKeys: ['year', 'amount']
        };

        expect(component.buildColumnHeader(0)).toBe('A');
        expect(component.buildColumnHeader(26)).toBe('AA');
    });
});

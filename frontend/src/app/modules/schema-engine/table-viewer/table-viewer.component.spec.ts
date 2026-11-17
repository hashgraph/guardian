import { CsvService } from 'src/app/services/csv.service';
import { TableViewerComponent } from './table-viewer.component';

describe('TableViewerComponent inline csv', () => {
    const create = (value: unknown) => {
        const viewer = Object.create(TableViewerComponent.prototype) as any;
        viewer.value = value;
        viewer.isLoading = false;
        viewer.isDownloading = false;
        viewer.previewColumnDefs = [];
        viewer.previewRowData = [];
        viewer.PREVIEW_LIMIT = 10 * 1024 * 1024;
        viewer.PREVIEW_COLUMNS_LIMIT = 8;
        viewer.PREVIEW_ROWS_LIMIT = 4;
        viewer.delimiter = ',';
        viewer.csvService = new CsvService();
        viewer.dialog = {
            open: vi.fn().mockName("DialogService.open")
        };
        viewer.artifactService = {
            getFileBlob: vi.fn().mockName("ArtifactService.getFileBlob")
        };
        viewer.idb = {
            get: vi.fn().mockName("IndexedDbRegistryService.get"),
            put: vi.fn().mockName("IndexedDbRegistryService.put")
        };
        viewer.cdr = { markForCheck: () => undefined };
        viewer.zone = {
            run: vi.fn().mockName("NgZone.run")
        };
        viewer.zone.run.mockImplementation((fn: () => unknown) => fn());
        return viewer;
    };

    const inline = JSON.stringify({
        type: 'table',
        csv: 'Year,Area\r\n2024,10\r\n2025,20\r\n',
        columnKeys: ['year', 'area'],
        columnNames: ['Year', 'Area'],
    });

    it('has data when the table carries its csv and no file', () => {
        const viewer = create(inline);
        expect(viewer.fileId).toBeNull();
        expect(viewer.inlineCsv).toBe('Year,Area\r\n2024,10\r\n2025,20\r\n');
        expect(viewer.hasData).toBe(true);
    });

    it('opens the inline table without loading a file', async () => {
        const viewer = create(inline);
        await viewer.openDialog();
        expect(viewer.artifactService.getFileBlob).not.toHaveBeenCalled();
        expect(viewer.idb.get).not.toHaveBeenCalled();
        const config = vi.mocked(viewer.dialog.open).mock.lastCall![1];
        expect(config.data.rowData).toEqual([{ year: '2024', area: '10' }, { year: '2025', area: '20' }]);
        expect(config.data.columnDefs.map((column: any) => column.headerName)).toEqual(['Year', 'Area']);
        expect(viewer.isLoading).toBe(false);
    });

    it('fills the preview of an inline table at once, without the browser table store', () => {
        const viewer = create(inline);
        viewer.idb.registerStores = vi.fn();
        viewer.ngOnChanges();
        expect(viewer.previewHeaderKeysLimited).toEqual(['year', 'area']);
        expect(viewer.previewRowsLimited).toEqual([{ year: '2024', area: '10' }, { year: '2025', area: '20' }]);
        expect(viewer.isLoading).toBe(false);
        expect(viewer.idb.registerStores).not.toHaveBeenCalled();
        expect(viewer.artifactService.getFileBlob).not.toHaveBeenCalled();
    });

    it('keeps a stored table on its file even when csv is present', () => {
        const viewer = create({ type: 'table', fileId: '0123456789abcdef01234567', csv: 'a\r\n1\r\n' });
        expect(viewer.fileId).toBe('0123456789abcdef01234567');
        expect(viewer.inlineCsv).toBeNull();
    });

    it('has no data for an empty table value', () => {
        const viewer = create(JSON.stringify({ type: 'table' }));
        expect(viewer.inlineCsv).toBeNull();
        expect(viewer.hasData).toBe(false);
    });
});

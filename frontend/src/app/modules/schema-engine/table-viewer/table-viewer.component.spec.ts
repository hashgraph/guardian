import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CsvService } from 'src/app/services/csv.service';
import { TableDialogComponent } from '../../common/table-dialog/table-dialog.component';
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
        viewer.declaredColumns = [];
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
        expect(config.data.fixedColumns).toBe(false);
        expect(viewer.isLoading).toBe(false);
    });

    it('fixes schema columns in the document dialog without removing rows', async () => {
        const viewer = create(inline);
        viewer.declaredColumns = [{ key: 'year', name: 'Year' }, { key: 'area', name: 'Area' }];

        await viewer.openDialog();

        const config = vi.mocked(viewer.dialog.open).mock.lastCall![1];
        expect(config.data.fixedColumns).toBe(true);
        expect(config.data.readOnly).toBe(true);
        expect(config.data.columnDefs.map((column: any) => column.field)).toEqual(['year', 'area']);
        expect(config.data.rowData).toEqual([{ year: '2024', area: '10' }, { year: '2025', area: '20' }]);
    });

    describe('CSV download names', () => {
        afterEach(() => vi.restoreAllMocks());

        it('downloads inline CSV using the description instead of the title', async () => {
            const viewer = create(inline);
            viewer.title = 'Site data (input)';
            viewer.description = 'Import table-scroll-site-data.csv here.';
            const names: string[] = [];
            vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) {
                names.push(this.download);
            });

            viewer.downloadCsv();
            await Promise.resolve();
            await Promise.resolve();

            expect(names).toEqual(['Import table-scroll-site-data.csv here..csv']);
            expect(viewer.artifactService.getFileBlob).not.toHaveBeenCalled();
            expect(viewer.loadError).toBeUndefined();
            expect(viewer.isDownloading).toBe(false);
        });

        it('uses a timestamp when the description is missing even when a title exists', () => {
            const viewer = create(inline);
            viewer.title = 'Site data (input)';
            vi.spyOn(Date, 'now').mockReturnValue(1795624180459);

            expect(viewer.makeDownloadFileName()).toBe('table-1795624180459.csv');
            viewer.description = 'a/b:c';
            expect(viewer.makeDownloadFileName()).toBe('a_b_c.csv');
        });
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
    it('passes column actions to the full read-only table, including columns outside the preview', async () => {
        const viewer = create(inline);
        viewer.declaredColumns = [{ key: 'year', name: 'Year' }, { key: 'area', name: 'Area' }];
        const action = { label: 'Show formulas for Area', open: vi.fn() };
        viewer.formulaActions = { column: (key: string) => key === 'area' ? action : null };
        expect(viewer.columnFormula('area')).toBe(action);
        await viewer.openDialog();
        const config = vi.mocked(viewer.dialog.open).mock.lastCall![1];
        expect(config.data.formulaActions.column('area')).toBe(action);
        expect(config.data.readOnly).toBe(true);
        viewer.declaredColumns = [];
        expect(viewer.columnFormula('area')).toBeNull();
    });

    it('keeps the declared columns and their Fx in the full table of a result with no rows', async () => {
        const viewer = create(JSON.stringify({ type: 'table', csv: 'CO2', columnKeys: ['co2'], columnNames: ['CO2'] }));
        viewer.declaredColumns = [{ key: 'co2', name: 'CO2' }];
        const action = { label: 'Show formulas for CO2', open: vi.fn() };
        viewer.formulaActions = { column: (key: string) => key === 'co2' ? action : null };
        await viewer.openDialog();
        const config = vi.mocked(viewer.dialog.open).mock.lastCall![1];
        TestBed.configureTestingModule({
            declarations: [TableDialogComponent],
            providers: [
                { provide: DynamicDialogRef, useValue: { close: () => {} } },
                { provide: DynamicDialogConfig, useValue: config },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        });
        const dialog = TestBed.createComponent(TableDialogComponent).componentInstance;
        dialog.ngOnInit();
        const columns = dialog.columnDefs.filter((def) => def.colId !== '__row__');
        expect(columns.map((def) => def.field)).toEqual(['co2']);
        expect(columns[0].headerName).toBe('CO2');
        expect(columns[0].headerComponentParams.innerHeaderComponentParams.formulaActions.column('co2')).toBe(action);
        expect(dialog.rowData.length).toBe(100);
        expect(dialog.rowData.every(row => row.co2 === '')).toBe(true);
    });

});

import { of } from 'rxjs';
import { buildTableHelper } from '@guardian/interfaces';
import { CsvService } from 'src/app/services/csv.service';
import { hydrateDocumentTables, TABLE_TEST_MAX_ROWS } from './table-hydration';

describe('hydrateDocumentTables', () => {
    const CSV = 'Year,CO2 (tonnes),Region\n2023,42,Europe\n2024,45,Europe\n2025,48,Asia';

    let requested: string[];
    let deps: any;

    function makeDeps(csvText: string): any {
        requested = [];
        return {
            artifactService: {
                getFileBlob: (fileId: string) => {
                    requested.push(fileId);
                    return of(new Blob([csvText]));
                }
            },
            gzipService: {
                gunzipToText: (_blob: any) => Promise.resolve(csvText)
            },
            csvService: new CsvService(),
            idb: { get: (_db: string, _store: string, _key: string) => Promise.resolve(null) }
        };
    }

    function storedTable(fileId: string): string {
        return JSON.stringify({
            type: 'table',
            fileId,
            columnKeys: ['year', 'co2_tonnes', 'region'],
            columnNames: ['Year', 'CO2 (tonnes)', 'Region']
        });
    }

    beforeEach(() => {
        deps = makeDeps(CSV);
    });

    it('fills in the rows of a table that carries only a fileId', async () => {
        const document: any = { tableData: storedTable('file-1') };

        await hydrateDocumentTables(document, deps);

        expect(requested).toEqual(['file-1']);
        expect(buildTableHelper().col(document.tableData, 'co2_tonnes'))
            .toEqual(['42', '45', '48']);
    });

    it('reads the whole file from IndexedDB when the value holds only a preview', async () => {
        const preview = {
            type: 'table',
            columnKeys: ['year', 'co2_tonnes', 'region'],
            columnNames: ['Year', 'CO2 (tonnes)', 'Region'],
            rows: [{ year: '2023', co2_tonnes: '1', region: 'Europe' }],
            idbKey: 'draft-key',
            sizeBytes: 16421239
        };
        const document: any = { tableData: JSON.stringify(preview) };
        const idbDeps = {
            ...deps,
            idb: {
                get: (_db: string, _store: string, key: string) => {
                    expect(key).toEqual('draft-key');
                    return Promise.resolve({ id: key, blob: new Blob([CSV]) });
                }
            }
        };

        await hydrateDocumentTables(document, idbDeps);

        expect(requested).toEqual([]);
        expect(buildTableHelper().col(document.tableData, 'co2_tonnes'))
            .toEqual(['42', '45', '48']);
    });

    it('says so instead of summing a preview when the large file is gone from the page', async () => {
        const preview = {
            type: 'table',
            columnKeys: ['year', 'co2_tonnes', 'region'],
            columnNames: ['Year', 'CO2 (tonnes)', 'Region'],
            rows: [{ year: '2023', co2_tonnes: '1', region: 'Europe' }],
            idbKey: 'gone-key',
            sizeBytes: 16421239
        };
        const value = JSON.stringify(preview);
        const document: any = { tableData: value };

        let message = '';
        try {
            await hydrateDocumentTables(document, deps);
        } catch (error) {
            message = String(error);
        }

        expect(message).toContain('too large to keep in the page');
        expect(document.tableData).toBe(value);
    });

    it('does not fetch a table that already carries its rows, even with a draft key', async () => {
        const inline = {
            type: 'table',
            columnKeys: ['year', 'co2_tonnes', 'region'],
            columnNames: ['Year', 'CO2 (tonnes)', 'Region'],
            idbKey: 'small-key',
            sizeBytes: 70,
            rows: [{ year: '2023', co2_tonnes: '42', region: 'Europe' }]
        };
        const document: any = { tableData: JSON.stringify(inline) };

        await hydrateDocumentTables(document, deps);

        expect(requested).toEqual([]);
        expect(buildTableHelper().col(document.tableData, 'co2_tonnes')).toEqual(['42']);
    });

    it('reaches a table inside a sub-schema and inside an array', async () => {
        const document: any = {
            siteTables: { siteName: 'Site A', siteDeclared: storedTable('file-2') },
            more: [{ siteDeclared: storedTable('file-3') }]
        };

        await hydrateDocumentTables(document, deps);

        expect(requested).toEqual(['file-2', 'file-3']);
        expect(buildTableHelper().col(document.siteTables.siteDeclared, 'co2_tonnes'))
            .toEqual(['42', '45', '48']);
        expect(buildTableHelper().col(document.more[0].siteDeclared, 'co2_tonnes'))
            .toEqual(['42', '45', '48']);
    });

    it('re-keys a legacy table the browser stored with C1, C2, C3 and the header as data', async () => {
        const uploaded = {
            type: 'table',
            columnKeys: ['C1', 'C2', 'C3'],
            rows: [
                { C1: 'Year', C2: 'CO2 (tonnes)', C3: 'Region' },
                { C1: '2023', C2: '42', C3: 'Europe' },
                { C1: '2024', C2: '45', C3: 'Europe' },
                { C1: '2025', C2: '48', C3: 'Asia' }
            ]
        };
        const document: any = { tableLegacy: JSON.stringify(uploaded) };

        await hydrateDocumentTables(document, deps);

        expect(requested).toEqual([]);
        expect(buildTableHelper().col(document.tableLegacy, 'CO2 (tonnes)'))
            .toEqual(['42', '45', '48']);
    });

    it('reads a legacy table fetched by fileId under its file header, as the server does', async () => {
        const document: any = {
            tableLegacy: JSON.stringify({ type: 'table', fileId: 'file-legacy' })
        };

        await hydrateDocumentTables(document, deps);

        expect(requested).toEqual(['file-legacy']);
        expect(buildTableHelper().col(document.tableLegacy, 'CO2 (tonnes)'))
            .toEqual(['42', '45', '48']);
    });

    it('refuses a file with more rows than testing allows, and changes nothing', async () => {
        const lines = ['Year,CO2 (tonnes),Region'];
        for (let i = 0; i <= TABLE_TEST_MAX_ROWS; i++) {
            lines.push(`2023,1,Europe`);
        }
        const value = storedTable('file-big');
        const document: any = { tableData: value };

        let message = '';
        try {
            await hydrateDocumentTables(document, makeDeps(lines.join('\n')));
        } catch (error) {
            message = String(error);
        }

        expect(message).toContain('testing is limited to');
        expect(document.tableData).toBe(value);
    });
});

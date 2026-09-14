import { of } from 'rxjs';
import { UntypedFormBuilder } from '@angular/forms';
import { buildTableHelper } from '@guardian/interfaces';
import { CsvService } from 'src/app/services/csv.service';
import { TestCodeDialog } from './test-code-dialog.component';

describe('TestCodeDialog', () => {
    const CSV = 'Year,CO2 (tonnes),Region\n2023,42,Europe\n2024,45,Europe\n2025,48,Asia';

    let sent: any;

    function build(jsonValue: string, csvText: string = CSV): TestCodeDialog {
        sent = null;

        const block: any = {
            tag: 'custom_logic_table',
            blockType: 'customLogicBlock',
            properties: { expression: '' },
            moduleVariables: { schemas: [] },
            rootParent: { isPolicy: false, policyId: 'policy-1' },
            getJSON: () => ({ blockType: 'customLogicBlock' })
        };

        const dialog = new TestCodeDialog(
            { close: () => { } } as any,
            { header: 'Code', data: { block, folder: null, readonly: false, policyId: 'policy-1' } } as any,
            new UntypedFormBuilder(),
            {} as any,
            {
                runBlock: (policyId: string, payload: any) => {
                    sent = payload;
                    return of({ input: null, output: null, logs: [], errors: [] });
                }
            } as any,
            { getFileBlob: (_id: string) => of(new Blob([csvText])) } as any,
            { gunzipToText: (_blob: any) => Promise.resolve(csvText) } as any,
            new CsvService(),
            {
                get: (_db: string, _store: string, key: string) =>
                    Promise.resolve({ id: key, blob: new Blob([csvText]) })
            } as any
        );

        dialog.dataType = 'json';
        dialog.jsonValue = jsonValue;

        return dialog;
    }

    it('sends every row of a declared table, not the ten-row preview', async () => {
        const lines = ['Year,CO2 (tonnes),Region'];
        for (let year = 2001; year <= 2011; year += 1) {
            lines.push(`${year},1,Europe`);
        }
        const preview = {
            type: 'table',
            columnKeys: ['year', 'co2_tonnes', 'region'],
            columnNames: ['Year', 'CO2 (tonnes)', 'Region'],
            rows: [{ year: '2001', co2_tonnes: '1', region: 'Europe' }],
            idbKey: 'draft-key',
            sizeBytes: 180
        };
        const dialog = build(JSON.stringify({ tableData: preview }), lines.join('\n'));

        await dialog.onTest();

        expect(buildTableHelper().col(sent.data.document.tableData, 'co2_tonnes').length)
            .toEqual(11);
    });

    it('keys a legacy table by the file header, as the server reads it', async () => {
        const preview = {
            type: 'table',
            columnKeys: ['C1', 'C2', 'C3'],
            rows: [
                { C1: 'Year', C2: 'CO2 (tonnes)', C3: 'Region' },
                { C1: '2023', C2: '42', C3: 'Europe' }
            ],
            idbKey: 'legacy-key',
            sizeBytes: 68
        };
        const dialog = build(JSON.stringify({ tableLegacy: preview }));

        await dialog.onTest();

        expect(buildTableHelper().col(sent.data.document.tableLegacy, 'CO2 (tonnes)'))
            .toEqual(['42', '45', '48']);
    });

    it('leaves the form value untouched when it fills in the tables', async () => {
        const preview = {
            type: 'table',
            columnKeys: ['C1', 'C2', 'C3'],
            rows: [{ C1: 'Year', C2: 'CO2 (tonnes)', C3: 'Region' }],
            idbKey: 'legacy-key',
            sizeBytes: 68
        };
        const jsonValue = JSON.stringify({ tableLegacy: preview });
        const dialog = build(jsonValue);

        await dialog.onTest();

        expect(dialog.jsonValue).toEqual(jsonValue);
    });

    it('shows the reason in the Errors tab instead of running a table it could not read', async () => {
        const lines = ['Year,CO2 (tonnes),Region'];
        for (let index = 0; index < 30000; index += 1) {
            lines.push('2023,1,Europe');
        }
        const preview = {
            type: 'table',
            columnKeys: ['year', 'co2_tonnes', 'region'],
            columnNames: ['Year', 'CO2 (tonnes)', 'Region'],
            rows: [{ year: '2023', co2_tonnes: '1', region: 'Europe' }],
            idbKey: 'huge-key',
            sizeBytes: 900000
        };
        const dialog = build(JSON.stringify({ tableData: preview }), lines.join('\n'));

        await dialog.onTest();

        expect(sent).toBeNull();
        expect(dialog.step).toEqual('result');
        expect(dialog.resultStep).toEqual('errors');
        expect(dialog.result.errors).toContain('limited to');
    });
});

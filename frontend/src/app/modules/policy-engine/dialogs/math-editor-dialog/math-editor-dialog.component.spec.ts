import { MathEditorDialogComponent } from './math-editor-dialog.component';

describe('MathEditorDialogComponent input documents', () => {
    function makeDialog(): any {
        const dialog: any = Object.create(MathEditorDialogComponent.prototype);
        dialog.inputDocumentValue = {
            schema: '#schema',
            document: {
                inputValue: 21,
                tableData: JSON.stringify({
                    type: 'table',
                    columnKeys: ['year', 'co2_tonnes'],
                    columnNames: ['Year', 'CO2 (tonnes)'],
                    rows: [{ year: '2023', co2_tonnes: '42' }],
                    idbKey: 'draft-key'
                })
            }
        };
        dialog.inputRelationshipsValue = [];
        return dialog;
    }

    it('hands the test run a copy, so filling in the tables cannot damage the form value', () => {
        const dialog = makeDialog();
        const original = dialog.inputDocumentValue.document.tableData;

        const documents = dialog.getValue();
        const current = documents.getCurrent();
        current.tableData = { type: 'table', columnKeys: ['year'], rows: [] };

        expect(dialog.inputDocumentValue.document.tableData).toBe(original);
        expect(typeof dialog.inputDocumentValue.document.tableData).toBe('string');
    });

    it('keeps the relationships out of the same trap', () => {
        const dialog = makeDialog();
        dialog.inputRelationshipsValue = [
            { schema: '#other', document: { tableData: '{"type":"table"}' } }
        ];

        const documents = dialog.getValue();
        const related = documents.getDocument('#other');
        related.tableData = { type: 'table', rows: [] };

        expect(dialog.inputRelationshipsValue[0].document.tableData).toEqual('{"type":"table"}');
    });
});

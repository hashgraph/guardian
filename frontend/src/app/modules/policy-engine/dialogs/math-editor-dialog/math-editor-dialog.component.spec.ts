import { MathEditorDialogComponent } from './math-editor-dialog.component';
import { DocumentMap } from './math-model/document-map';

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

describe('MathEditorDialogComponent Table column fields', () => {
    function makeDialog(): any {
        return Object.create(MathEditorDialogComponent.prototype);
    }

    function schema(tableColumns?: { name: string; key: string }[]): any {
        return {
            getDeepFields: () => [{
                path: 'siteTable',
                arrayLvl: 0,
                type: 'string',
                field: {
                    name: 'siteTable',
                    description: 'Site table',
                    type: 'string',
                    customType: 'table',
                    isArray: false,
                    tableColumns
                },
                fields: []
            }]
        };
    }

    it('adds declared columns to the picker tree and field map', () => {
        const dialog = makeDialog();
        const fields = dialog.getSchemaFields(schema([
            { name: 'Year', key: 'year' },
            { name: 'Area (ha)', key: 'area_ha' }
        ]));
        const map = dialog.createFieldMap(fields, new Map());

        expect(fields[0].fields.map((field: any) => field.path)).toEqual([
            'siteTable.year',
            'siteTable.area_ha'
        ]);
        expect(fields[0].fields.map((field: any) => field.field.description)).toEqual([
            'Year',
            'Area (ha)'
        ]);
        expect(map.get('siteTable.area_ha').type).toBe('string[]');
    });

    it('leaves a Table without declared columns as a leaf', () => {
        const dialog = makeDialog();
        const fields = dialog.getSchemaFields(schema(undefined));

        expect(fields[0].fields).toEqual([]);
    });

    it('includes declared columns in path suggestions without changing the Table path', () => {
        const dialog = makeDialog();
        const fields = dialog.getSchemaFields(schema([
            { name: 'Area (ha)', key: 'area_ha' }
        ]));
        dialog.inputSchemaFieldMap = dialog.createFieldMap(fields, new Map());
        dialog.outputSchemaFieldMap = new Map();
        dialog.schemaFieldMap = new Map();
        dialog.pathSuggestions = [];
        dialog.activePathItem = null;
        const item: any = { field: 'area', schema: null };

        dialog._computePathSuggestions(item, 'input');

        expect(dialog.pathSuggestions).toEqual(['siteTable.area_ha']);
        expect(dialog.inputSchemaFieldMap.get('siteTable').type).toBe('string');
    });

    it('does not leave the Table marker on a column child', () => {
        const dialog = makeDialog();
        const fields = dialog.getSchemaFields(schema([
            { name: 'Area (ha)', key: 'area_ha' }
        ]));

        expect(fields[0].field.customType).toBe('table');
        expect(fields[0].fields[0].field.customType).toBe('');
    });

    it('keeps Table columns out of an Output path bound to a schema', () => {
        const dialog = makeDialog();
        const outputSchema = schema([{ name: 'Area (ha)', key: 'area_ha' }]);
        dialog.schemaFieldMap = new Map([
            ['#schema', dialog.createFieldMap(dialog.getSchemaFields(outputSchema), new Map())]
        ]);
        dialog.outputSchemaFieldMap = dialog.createFieldMap(outputSchema.getDeepFields(), new Map());
        dialog.inputSchemaFieldMap = new Map();
        dialog.fieldWarnings = new Map();
        dialog.pathSuggestions = [];
        dialog.activePathItem = null;
        const item: any = { id: 'out-1', field: '', schema: '#schema', update: () => undefined };

        dialog.onPathChange(item, 'siteTable.area_ha', 'output');

        expect(dialog.pathSuggestions).toEqual([]);
        expect(dialog.fieldWarnings.get('out-1')).toBeTrue();

        dialog.onPathChange(item, 'siteTable', 'output');

        expect(dialog.pathSuggestions).toEqual(['siteTable']);
        expect(dialog.fieldWarnings.get('out-1')).toBeFalse();
    });

    it('does not add input-only Table columns to the output picker', () => {
        const dialog = makeDialog();
        dialog.schemaNames = new Map();

        const view = dialog.createSchemaView(schema([
            { name: 'Area (ha)', key: 'area_ha' }
        ]), false);

        expect(view.items[0].children.length).toBe(0);
    });
});

describe('MathEditorDialogComponent Table test results', () => {
    function makeDialog(context: any): any {
        const dialog: any = Object.create(MathEditorDialogComponent.prototype);
        const documents = new DocumentMap();
        documents.addDocument({ schema: '#schema', document: { inputValue: 21 } });
        dialog.getValue = () => documents;
        dialog.artifactService = {};
        dialog.gzipService = {};
        dialog.csvService = {};
        dialog.idb = {};
        dialog.engine = {
            createContext: () => context,
            variables: { getItems: () => [], pages: [] },
            formulas: { getItems: () => [], pages: [] },
            outputs: { getItems: () => [], pages: [] },
            getItems: () => []
        };
        dialog.inputSchema = { iri: '#schema' };
        dialog.outputSchema = { iri: '#schema' };
        dialog.code = {
            setContext: () => undefined,
            build: () => () => ({ done: true })
        };
        dialog.onStep = () => undefined;
        return dialog;
    }

    it('shows Table conversion warnings in the existing Errors result', async () => {
        const context = {
            setDocument: () => undefined,
            getContext: () => ({ scope: {} }),
            getWarnings: () => ['Table column "Area" replaced 2 nonnumeric cells with 0.']
        };
        const dialog = makeDialog(context);

        await dialog.onTest();

        expect(dialog.result.error).toBe(
            'Table column "Area" replaced 2 nonnumeric cells with 0.'
        );
        expect(dialog.result.output).toContain('"done": true');
    });

    it('shows a shared Table row-limit error instead of hiding it as invalid config', async () => {
        const context = {
            setDocument: () => {
                throw new Error(
                    'Table column "Area" has 10001 rows; General formulas are limited to 10000'
                );
            }
        };
        const dialog = makeDialog(context);

        await dialog.onTest();

        expect(dialog.result.error).toContain('10001 rows');
        expect(dialog.result.error).toContain('limited to 10000');
        expect(dialog.resultStep).toBe('errors');
    });
});

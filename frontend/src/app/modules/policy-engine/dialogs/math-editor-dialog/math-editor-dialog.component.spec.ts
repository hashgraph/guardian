import { MathEditorDialogComponent } from './math-editor-dialog.component';
import { DocumentMap } from './math-model/document-map';
import { FieldLink } from './math-model/field-link';

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

describe('MathEditorDialogComponent Table outputs', () => {
    function node(path: string, tableColumns?: { name: string; key: string }[], arrayLvl: number = 0): any {
        return {
            path,
            arrayLvl,
            type: 'string',
            field: {
                name: path,
                description: path,
                type: 'string',
                customType: 'table',
                isArray: arrayLvl > 0,
                tableColumns
            },
            fields: []
        };
    }

    function makeDialog(): any {
        const dialog: any = Object.create(MathEditorDialogComponent.prototype);
        dialog.outputSchemaFieldMap = new Map<string, any>([
            ['results', node('results', [{ name: 'Year', key: 'year' }, { name: 'CO2', key: 'co2' }])],
            ['legacy', node('legacy', undefined)],
            ['nested.results', node('nested.results', [{ name: 'Year', key: 'year' }], 1)],
            ['total', { path: 'total', arrayLvl: 0, type: 'number', field: { name: 'total', type: 'number' }, fields: [] }]
        ]);
        dialog.inputSchemaFieldMap = new Map();
        dialog.schemaFieldMap = new Map();
        dialog.fieldWarnings = new Map();
        dialog.pathSuggestions = [];
        dialog.activePathItem = null;
        dialog.maxTableRows = 1000;
        dialog.tableRowsToAdd = {};
        return dialog;
    }

    function output(field: string = ''): FieldLink {
        const link = new FieldLink('', field);
        link.update();
        return link;
    }

    it('offers the grid only for a Table field with declared columns outside an array', () => {
        const dialog = makeDialog();
        expect(dialog.getTableColumns(output('results'))).toEqual([
            { name: 'Year', key: 'year' },
            { name: 'CO2', key: 'co2' }
        ]);
        expect(dialog.getTableColumns(output('legacy'))).toEqual([]);
        expect(dialog.getTableColumns(output('nested.results'))).toEqual([]);
        expect(dialog.getTableColumns(output('total'))).toEqual([]);
    });

    it('turns an output into a grid with one empty row when a declared Table is chosen', () => {
        const dialog = makeDialog();
        const item = output();

        dialog.onPathChange(item, 'results', 'output');

        expect(item.isTable).toBeTrue();
        expect(item.rows).toEqual([{ year: '', co2: '' }]);
    });

    it('turns the grid back into a single name when another field is chosen', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');

        dialog.selectPathSuggestion(item, 'total', 'output');

        expect(item.isTable).toBeFalse();
        expect(item.rows).toBeNull();
    });

    it('keeps an old Table without declared columns as a single name', () => {
        const dialog = makeDialog();
        const item = output();

        dialog.onPathChange(item, 'legacy', 'output');

        expect(item.isTable).toBeFalse();
    });

    it('adds rows one at a time or by count and stops at 1000', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');

        dialog.addTableRows(item, 1);
        expect(item.rows!.length).toBe(2);

        dialog.addTableRows(item, 5);
        expect(item.rows!.length).toBe(7);

        dialog.addTableRows(item, 5000);
        expect(item.rows!.length).toBe(1000);

        dialog.addTableRows(item, 1);
        expect(item.rows!.length).toBe(1000);
    });

    it('ignores a count that is not a positive number', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');

        dialog.addTableRows(item, -3);
        dialog.addTableRows(item, NaN);

        expect(item.rows!.length).toBe(1);
    });

    it('deletes one row', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        item.rows = [{ year: 'a', co2: '' }, { year: 'b', co2: '' }];

        dialog.deleteTableRow(item, 0);

        expect(item.rows).toEqual([{ year: 'b', co2: '' }]);
    });

    it('drops cells of removed columns and adds cells of new ones', () => {
        const dialog = makeDialog();

        const rows = dialog.syncTableRows([{ year: 'y', old: 'o' }], dialog.getTableColumns(output('results')));

        expect(rows).toEqual([{ year: 'y', co2: '' }]);
    });
});

import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ArtifactService } from 'src/app/services/artifact.service';
import { CsvService } from 'src/app/services/csv.service';
import { GzipService } from 'src/app/services/gzip.service';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { MathEditorDialogComponent } from './math-editor-dialog.component';
import { DocumentMap } from './math-model/document-map';
import { FieldLink } from './math-model/field-link';
import { MathItemType } from './math-model/math-item.type';

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
        const dialog: any = Object.create(MathEditorDialogComponent.prototype);
        dialog.tableRowsDraft = {};
        dialog.tableColumnsDraft = {};
        dialog.tableColumnsMode = {};
        return dialog;
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

    it('shows a Table field as table and keeps the type of its columns', () => {
        const dialog = makeDialog();
        const fields = dialog.getSchemaFields(schema([
            { name: 'Area (ha)', key: 'area_ha' }
        ]));
        dialog.inputSchemaFieldMap = dialog.createFieldMap(fields, new Map());
        dialog.outputSchemaFieldMap = dialog.createFieldMap(schema([
            { name: 'Area (ha)', key: 'area_ha' }
        ]).getDeepFields(), new Map());

        expect(dialog.getFieldType('input', null, 'siteTable')).toBe('table');
        expect(dialog.getFieldType('output', null, 'siteTable')).toBe('table');
        expect(dialog.getFieldType('input', null, 'siteTable.area_ha')).toBe('string[]');
        expect(dialog.getFieldType('input', null, 'missing')).toBe('');
    });

    it('shows a Table without declared columns as table', () => {
        const dialog = makeDialog();
        dialog.outputSchemaFieldMap = dialog.createFieldMap(schema(undefined).getDeepFields(), new Map());

        expect(dialog.getFieldType('output', null, 'siteTable')).toBe('table');
    });

    it('shows a repeated Table as table[] and leaves other fields as they are', () => {
        const dialog = makeDialog();
        dialog.outputSchemaFieldMap = new Map<string, any>([
            ['tables', {
                path: 'tables',
                arrayLvl: 1,
                type: 'string[]',
                field: { name: 'tables', type: 'string', customType: 'table', isArray: true },
                fields: []
            }],
            ['note', {
                path: 'note',
                arrayLvl: 0,
                type: 'string',
                field: { name: 'note', type: 'string', isArray: false },
                fields: []
            }],
            ['amounts', {
                path: 'amounts',
                arrayLvl: 1,
                type: 'number[]',
                field: { name: 'amounts', type: 'number', isArray: true },
                fields: []
            }]
        ]);

        expect(dialog.getFieldType('output', null, 'tables')).toBe('table[]');
        expect(dialog.getFieldType('output', null, 'note')).toBe('string');
        expect(dialog.getFieldType('output', null, 'amounts')).toBe('number[]');
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
            ['deep.results', node('deep.results', [{ name: 'Year', key: 'year' }], 2)],
            ['group', { path: 'group', arrayLvl: 0, type: 'object', field: { name: 'group', type: '#Group', isRef: true }, fields: [] }],
            ['group.results', node('group.results', [{ name: 'Year', key: 'year' }])],
            ['total', { path: 'total', arrayLvl: 0, type: 'number', field: { name: 'total', type: 'number' }, fields: [] }]
        ]);
        dialog.inputSchemaFieldMap = new Map();
        dialog.schemaFieldMap = new Map();
        dialog.fieldWarnings = new Map();
        dialog.pathSuggestions = [];
        dialog.activePathItem = null;
        dialog.maxTableRows = 1000;
        dialog.maxTableRowsPerAdd = 20;
        dialog.tableRowsToAdd = {};
        dialog.tableRowsDraft = {};
        dialog.tableColumnsDraft = {};
        dialog.tableColumnsMode = {};
        dialog.readonly = false;
        return dialog;
    }

    function output(field: string = ''): FieldLink {
        const link = new FieldLink('', field);
        link.update();
        return link;
    }

    it('offers the grid for a declared Table outside an array or one repeated level down', () => {
        const dialog = makeDialog();
        expect(dialog.getTableColumns(output('results'))).toEqual([
            { name: 'Year', key: 'year' },
            { name: 'CO2', key: 'co2' }
        ]);
        expect(dialog.getTableColumns(output('nested.results'))).toEqual([{ name: 'Year', key: 'year' }]);
        expect(dialog.getTableColumns(output('legacy'))).toEqual([]);
        expect(dialog.getTableColumns(output('deep.results'))).toEqual([]);
        expect(dialog.getTableColumns(output('total'))).toEqual([]);
        expect(dialog.isTableListField(output('nested.results'))).toBeTrue();
        expect(dialog.isTableListField(output('results'))).toBeFalse();
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

    it('keeps grid rows while a typed path is temporarily unknown', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        item.rows![0].year = 'y';

        dialog.onPathChange(item, 'resul', 'output');
        expect(item.rows).toEqual([{ year: 'y', co2: '' }]);

        dialog.onPathChange(item, 'results', 'output');
        expect(item.rows).toEqual([{ year: 'y', co2: '' }]);
    });

    it('keeps grid rows when a typed path passes through a known non-table field', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'group.results', 'output');
        item.rows![0].year = 'y';

        dialog.onPathChange(item, 'group', 'output');
        expect(item.isTable).toBeFalse();

        dialog.onPathChange(item, 'group.results', 'output');
        expect(item.rows).toEqual([{ year: 'y' }]);
    });

    it('brings the grid back when the Table is chosen again after an ordinary field', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        item.rows![0].co2 = 'c';

        dialog.selectPathSuggestion(item, 'total', 'output');
        expect(item.rows).toBeNull();

        dialog.selectPathSuggestion(item, 'results', 'output');
        expect(item.rows).toEqual([{ year: '', co2: 'c' }]);
    });

    it('forgets the kept grid when the output is deleted', () => {
        const dialog = makeDialog();
        dialog.engine = { deleteOutput: () => undefined };
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        item.rows![0].co2 = 'c';
        dialog.onPathChange(item, 'total', 'output');

        dialog.deleteOutput(item);

        expect(dialog.tableRowsDraft[item.id]).toBeUndefined();
    });

    it('keeps an old Table without declared columns as a single name', () => {
        const dialog = makeDialog();
        const item = output();

        dialog.onPathChange(item, 'legacy', 'output');

        expect(item.isTable).toBeFalse();
    });

    it('adds 1 to 20 rows per click and stops at 1000', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');

        dialog.addTableRows(item, 1);
        expect(item.rows!.length).toBe(2);

        dialog.addTableRows(item, 20);
        expect(item.rows!.length).toBe(22);

        dialog.addTableRows(item, 21);
        dialog.addTableRows(item, 2000);
        expect(item.rows!.length).toBe(22);

        item.rows = Array.from({ length: 995 }, () => ({ year: '', co2: '' }));
        dialog.addTableRows(item, 10);
        expect(item.rows.length).toBe(995);

        dialog.addTableRows(item, 5);
        expect(item.rows.length).toBe(1000);

        dialog.addTableRows(item, 1);
        expect(item.rows.length).toBe(1000);
    });

    it('ignores a count that is not a whole number from 1 to 20', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');

        dialog.addTableRows(item, -3);
        dialog.addTableRows(item, 0);
        dialog.addTableRows(item, 2.5);
        dialog.addTableRows(item, NaN);
        dialog.addTableRows(item, null);

        expect(item.rows!.length).toBe(1);
    });

    it('explains why Add Rows is disabled', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');

        expect(dialog.getAddTableRowsError(item, 1)).toBe('');
        expect(dialog.getAddTableRowsError(item, 20)).toBe('');
        expect(dialog.getAddTableRowsError(item, 0)).toBe('Add at least 1 row');
        expect(dialog.getAddTableRowsError(item, 21)).toBe('You can add at most 20 rows at a time');
        expect(dialog.getAddTableRowsError(item, null)).toBe('Enter a whole number from 1 to 20');
        expect(dialog.getAddTableRowsError(item, 2.5)).toBe('Enter a whole number from 1 to 20');

        item.rows = Array.from({ length: 995 }, () => ({ year: '', co2: '' }));
        expect(dialog.getAddTableRowsError(item, 10)).toBe('Only 5 more rows fit under the limit of 1000');

        item.rows = Array.from({ length: 1000 }, () => ({ year: '', co2: '' }));
        expect(dialog.getAddTableRowsError(item, 1)).toBe('The limit of 1000 rows is reached');
    });

    it('starts the row count at 1 and keeps what the author types for each table', () => {
        const dialog = makeDialog();
        const item = output();

        expect(dialog.getTableRowsToAdd(item, null)).toBe(1);
        expect(dialog.getTableRowsToAdd(item, 1)).toBe(1);

        dialog.setTableRowsToAdd(item, 1, 7);
        dialog.setTableRowsToAdd(item, null, null);

        expect(dialog.getTableRowsToAdd(item, 1)).toBe(7);
        expect(dialog.getTableRowsToAdd(item, 0)).toBe(1);
        expect(dialog.getTableRowsToAdd(item, null)).toBeNull();
    });

    it('deletes one row', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        item.rows = [{ year: 'a', co2: '' }, { year: 'b', co2: '' }];

        dialog.deleteTableRow(item, 0);

        expect(item.rows).toEqual([{ year: 'b', co2: '' }]);
    });

    it('turns a repeated Table output into a list with one table of one empty row', () => {
        const dialog = makeDialog();
        const item = output();

        dialog.onPathChange(item, 'nested.results', 'output');

        expect(item.isTableList).toBeTrue();
        expect(item.rows).toBeNull();
        expect(item.tables).toEqual([[{ year: '' }]]);
    });

    it('adds and deletes tables of a list', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'nested.results', 'output');

        dialog.addTable(item);
        item.tables![1][0].year = 'b';
        dialog.deleteTable(item, 0);

        expect(item.tables).toEqual([[{ year: 'b' }]]);
    });

    it('adds and deletes rows in one table and counts the limit across all tables', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'nested.results', 'output');
        dialog.addTable(item);

        item.tables![1] = Array.from({ length: 979 }, () => ({ year: '' }));
        dialog.addTableRows(item, 20, 1);
        expect(item.tables![0].length).toBe(1);
        expect(item.tables![1].length).toBe(999);
        expect(dialog.getTableRowCount(item)).toBe(1000);

        dialog.addTable(item);
        expect(item.tables![2]).toEqual([]);

        dialog.deleteTableRow(item, 0, 1);
        expect(item.tables![1].length).toBe(998);
    });

    it('moves the grid between a single Table and a repeated Table', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        item.rows![0].year = 'y';

        dialog.selectPathSuggestion(item, 'nested.results', 'output');
        expect(item.tables).toEqual([[{ year: 'y' }]]);
        expect(item.rows).toBeNull();

        dialog.selectPathSuggestion(item, 'results', 'output');
        expect(item.rows).toEqual([{ year: 'y', co2: '' }]);
        expect(item.tables).toBeNull();
    });

    it('keeps every table of a list while the path passes through a single Table', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'nested.results', 'output');
        dialog.addTable(item);
        item.tables![0][0].year = 'a';
        item.tables![1][0].year = 'b';

        dialog.selectPathSuggestion(item, 'results', 'output');
        expect(item.rows).toEqual([{ year: 'a', co2: '' }]);
        expect(item.tables).toBeNull();
        item.rows![0].year = 'c';

        dialog.selectPathSuggestion(item, 'nested.results', 'output');
        expect(item.tables).toEqual([[{ year: 'c' }], [{ year: 'b' }]]);
    });

    it('keeps every table of a list through a single Table and then a known non-table field', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'nested.results', 'output');
        dialog.addTable(item);
        item.tables![1][0].year = 'b';

        dialog.selectPathSuggestion(item, 'results', 'output');
        dialog.onPathChange(item, 'total', 'output');
        expect(item.isTable).toBeFalse();

        dialog.onPathChange(item, 'nested.results', 'output');
        expect(item.tables).toEqual([[{ year: '' }], [{ year: 'b' }]]);
    });

    it('keeps every table of a list while the path passes through a known non-table field', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'nested.results', 'output');
        dialog.addTable(item);
        item.tables![1][0].year = 'b';

        dialog.onPathChange(item, 'total', 'output');
        expect(item.isTable).toBeFalse();

        dialog.onPathChange(item, 'nested.results', 'output');
        expect(item.tables).toEqual([[{ year: '' }], [{ year: 'b' }]]);
    });

    it('forgets the row counts of every table when the output is deleted', () => {
        const dialog = makeDialog();
        dialog.engine = { deleteOutput: () => undefined };
        const item = output();
        dialog.tableRowsToAdd[item.id] = 2;
        dialog.tableRowsToAdd[`${item.id}:1`] = 3;
        dialog.tableRowsToAdd.other = 4;

        dialog.deleteOutput(item);

        expect(dialog.tableRowsToAdd).toEqual({ other: 4 });
    });

    it('drops cells of removed columns and adds cells of new ones', () => {
        const dialog = makeDialog();

        const rows = dialog.syncTableRows([{ year: 'y', old: 'o' }], dialog.getTableColumns(output('results')));

        expect(rows).toEqual([{ year: 'y', co2: '' }]);
    });

    it('offers the columns mode for a declared Table, single or one repeated level down', () => {
        const dialog = makeDialog();

        expect(dialog.canUseTableColumns(output('results'))).toBeTrue();
        expect(dialog.canUseTableColumns(output('group.results'))).toBeTrue();
        expect(dialog.canUseTableColumns(output('nested.results'))).toBeTrue();
        expect(dialog.canUseTableColumns(output('deep.results'))).toBeFalse();
        expect(dialog.canUseTableColumns(output('legacy'))).toBeFalse();
        expect(dialog.canUseTableColumns(output('total'))).toBeFalse();
    });

    it('switches a single Table between cells and columns and keeps what was typed in both', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        item.rows![0].year = 'y';

        dialog.setTableColumnsMode(item, true);
        expect(item.columns).toEqual({ year: '', co2: '' });
        expect(item.rows).toBeNull();
        expect(item.isTable).toBeTrue();
        item.columns!.year = 'years';

        dialog.setTableColumnsMode(item, false);
        expect(item.columns).toBeNull();
        expect(item.rows).toEqual([{ year: 'y', co2: '' }]);

        dialog.setTableColumnsMode(item, true);
        expect(item.columns).toEqual({ year: 'years', co2: '' });
        expect(item.rows).toBeNull();
    });

    it('does not switch modes in a read-only dialog', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        dialog.readonly = true;

        dialog.setTableColumnsMode(item, true);

        expect(item.columns).toBeNull();
        expect(item.rows).toEqual([{ year: '', co2: '' }]);
    });

    it('keeps the columns while the path passes through an unknown path and a known non-table field', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        dialog.setTableColumnsMode(item, true);
        item.columns!.year = 'years';

        dialog.onPathChange(item, 'resul', 'output');
        expect(item.columns).toEqual({ year: 'years', co2: '' });

        dialog.onPathChange(item, 'total', 'output');
        expect(item.isTable).toBeFalse();
        expect(item.columns).toBeNull();

        dialog.onPathChange(item, 'results', 'output');
        expect(item.columns).toEqual({ year: 'years', co2: '' });
        expect(item.rows).toBeNull();
    });

    it('keeps the columns mode on a repeated Table and marks the output as a list', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        item.rows![0].year = 'y';
        dialog.setTableColumnsMode(item, true);
        item.columns!.year = 'years';

        dialog.selectPathSuggestion(item, 'nested.results', 'output');
        expect(item.columns).toEqual({ year: 'years' });
        expect(item.tableList).toBeTrue();
        expect(item.isTableList).toBeTrue();
        expect(item.tables).toBeNull();

        dialog.selectPathSuggestion(item, 'results', 'output');
        expect(item.columns).toEqual({ year: 'years', co2: '' });
        expect(item.tableList).toBeFalse();
        expect(item.tables).toBeNull();

        dialog.setTableColumnsMode(item, false);
        expect(item.rows).toEqual([{ year: 'y', co2: '' }]);
    });

    it('switches a repeated Table between cells and columns and keeps every table', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'nested.results', 'output');
        dialog.addTable(item);
        item.tables![1][0].year = 'b';

        dialog.setTableColumnsMode(item, true);
        expect(item.columns).toEqual({ year: '' });
        expect(item.tableList).toBeTrue();
        expect(item.tables).toBeNull();

        dialog.setTableColumnsMode(item, false);
        expect(item.columns).toBeNull();
        expect(item.tableList).toBeFalse();
        expect(item.tables).toEqual([[{ year: '' }], [{ year: 'b' }]]);
    });

    it('moves the columns to the columns of another single Table', () => {
        const dialog = makeDialog();
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        dialog.setTableColumnsMode(item, true);
        item.columns!.year = 'years';
        item.columns!.co2 = 'c';

        dialog.selectPathSuggestion(item, 'group.results', 'output');

        expect(item.columns).toEqual({ year: 'years' });
    });

    it('opens a saved column output in columns mode, aligned to the declared columns', () => {
        const dialog = makeDialog();
        const item = FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field: 'results',
            schema: '#out',
            columns: { year: 'years', old: 'x' }
        })!;

        dialog.openTableColumns(item);
        expect(item.columns).toEqual({ year: 'years', co2: '' });
        expect(dialog.tableColumnsMode[item.id]).toBeTrue();

        dialog.onPathChange(item, 'total', 'output');
        dialog.onPathChange(item, 'results', 'output');
        expect(item.columns).toEqual({ year: 'years', co2: '' });
    });

    it('leaves a saved grid output as it is when it opens', () => {
        const dialog = makeDialog();
        const item = output('results');
        item.rows = [{ year: 'y', co2: '' }];

        dialog.openTableColumns(item);

        expect(dialog.tableColumnsMode[item.id]).toBeUndefined();
        expect(item.rows).toEqual([{ year: 'y', co2: '' }]);
    });

    it('forgets the columns and the mode when the output is deleted', () => {
        const dialog = makeDialog();
        dialog.engine = { deleteOutput: () => undefined };
        const item = output();
        dialog.onPathChange(item, 'results', 'output');
        dialog.setTableColumnsMode(item, true);
        dialog.onPathChange(item, 'total', 'output');

        dialog.deleteOutput(item);

        expect(dialog.tableColumnsDraft).toEqual({});
        expect(dialog.tableColumnsMode).toEqual({});
    });
});

describe('MathEditorDialogComponent Table output test results', () => {
    function makeDialog(
        outputs: FieldLink[],
        scope: any,
        advanced: (result: any) => any = (result) => result
    ): any {
        const dialog: any = Object.create(MathEditorDialogComponent.prototype);
        const documents = new DocumentMap();
        documents.addDocument({ schema: '#schema', document: { inputValue: 21 } });
        dialog.getValue = () => documents;
        dialog.artifactService = {};
        dialog.gzipService = {};
        dialog.csvService = {};
        dialog.idb = {};
        dialog.engine = {
            createContext: () => ({
                setDocument: () => undefined,
                getContext: () => ({ scope }),
                getWarnings: () => []
            }),
            variables: { getItems: () => [], pages: [] },
            formulas: { getItems: () => [], pages: [] },
            outputs: { getItems: () => outputs, pages: [] },
            getItems: () => outputs
        };
        dialog.inputSchema = { iri: '#in' };
        dialog.outputSchema = {
            iri: '#out',
            fields: [
                { name: 'results', isRef: false, isArray: false, fields: [] },
                { name: 'total', isRef: false, isArray: false, fields: [] },
                { name: 'series', isRef: false, isArray: true, fields: [] },
                {
                    name: 'sites',
                    isRef: true,
                    isArray: true,
                    fields: [{ name: 'results', isRef: false, isArray: false, fields: [] }]
                }
            ]
        };
        let codeContext: any = null;
        dialog.code = {
            setContext: (context: any) => { codeContext = context; },
            build: () => () => advanced(codeContext.result)
        };
        dialog.onStep = () => undefined;
        return dialog;
    }

    function tableOutput(rows: Record<string, string>[]): FieldLink {
        const link = FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field: 'results',
            schema: '#out',
            rows
        })!;
        link.update();
        return link;
    }

    it('fills the grid with the calculated values', async () => {
        const output = tableOutput([{ year: 'y', co2: 'c' }, { year: 'y2', co2: '' }]);
        const dialog = makeDialog([output], { y: 2020, c: 42, y2: 2021 });

        await dialog.onTest();

        expect(dialog.getTableValues(output)).toEqual([
            { year: 2020, co2: 42 },
            { year: 2021, co2: '' }
        ]);
    });

    it('hands the Advanced code the same table value the server writes', async () => {
        const output = tableOutput([{ year: 'y', co2: 'c' }]);
        const dialog = makeDialog([output], { y: 2020, c: 42 });

        await dialog.onTest();

        expect(JSON.parse(dialog.result.output)).toEqual({
            results: { type: 'table', rows: [{ year: 2020, co2: 42 }] }
        });
    });

    it('shows the value Advanced code put in place of the table instead of the grid', async () => {
        const output = tableOutput([{ year: 'y', co2: 'c' }]);
        const dialog = makeDialog([output], { y: 2020, c: 42 }, () => ({ results: 'set by code' }));

        await dialog.onTest();

        expect(dialog.getTableValues(output)).toBeNull();
        expect(output.value).toBe('set by code');
    });

    it('shows the rows as Advanced code left them', async () => {
        const output = tableOutput([{ year: 'y', co2: 'c' }]);
        const dialog = makeDialog([output], { y: 2020, c: 42 }, (result) => {
            result.results.rows.push({ year: 2021, co2: 7 });
            return result;
        });

        await dialog.onTest();

        expect(dialog.getTableValues(output)).toEqual([
            { year: 2020, co2: 42 },
            { year: 2021, co2: 7 }
        ]);
    });

    it('shows an all-empty grid row, which the issued table will not contain', async () => {
        const output = tableOutput([{ year: 'y', co2: '' }, { year: '', co2: '' }]);
        const dialog = makeDialog([output], { y: 2020 });

        await dialog.onTest();

        expect(dialog.getTableValues(output)).toEqual([
            { year: 2020, co2: '' },
            { year: '', co2: '' }
        ]);
    });

    it('keeps the error text when the table cannot be written to its path', async () => {
        const output = tableOutput([{ year: 'y' }]);
        output.field = 'missing.results';
        output.update();
        const dialog = makeDialog([output], { y: 2020 });

        await dialog.onTest();

        expect(output.value).toBe('Error: Invalid path');
        expect(dialog.getTableValues(output)).toBeNull();
    });

    it('keeps the single value view for an ordinary output', async () => {
        const output = new FieldLink('t', 'total');
        output.update();
        const dialog = makeDialog([output], { t: 3 });

        await dialog.onTest();

        expect(output.value).toBe(3);
        expect(dialog.getTableValues(output)).toBeNull();
    });

    function tableListOutput(field: string, tables: Record<string, string>[][]): FieldLink {
        const link = FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field,
            schema: '#out',
            tables
        })!;
        link.update();
        return link;
    }

    it('fills one grid per table of a Table field with multiple answers', async () => {
        const output = tableListOutput('series', [[{ year: 'y' }], [{ year: 'y2' }]]);
        const dialog = makeDialog([output], { y: 2020, y2: 2021 });

        await dialog.onTest();

        expect(dialog.getTableListValues(output)).toEqual([[{ year: 2020 }], [{ year: 2021 }]]);
        expect(dialog.getTableValues(output)).toBeNull();
        expect(JSON.parse(dialog.result.output)).toEqual({
            series: [
                { type: 'table', rows: [{ year: 2020 }] },
                { type: 'table', rows: [{ year: 2021 }] }
            ]
        });
    });

    it('writes table N into entry N of a repeated sub-schema', async () => {
        const output = tableListOutput('sites.results', [[{ year: 'y' }], [{ year: 'y2' }]]);
        const dialog = makeDialog([output], { y: 2020, y2: 2021 });

        await dialog.onTest();

        expect(JSON.parse(dialog.result.output)).toEqual({
            sites: [
                { results: { type: 'table', rows: [{ year: 2020 }] } },
                { results: { type: 'table', rows: [{ year: 2021 }] } }
            ]
        });
        expect(dialog.getTableListValues(output)).toEqual([[{ year: 2020 }], [{ year: 2021 }]]);
    });

    it('shows the value Advanced code put in place of a table list instead of the grids', async () => {
        const output = tableListOutput('series', [[{ year: 'y' }]]);
        const dialog = makeDialog([output], { y: 2020 }, () => ({ series: 'set by code' }));

        await dialog.onTest();

        expect(dialog.getTableListValues(output)).toBeNull();
        expect(output.value).toBe('set by code');
    });

    function columnOutput(columns: Record<string, string>): FieldLink {
        const link = FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field: 'results',
            schema: '#out',
            columns
        })!;
        link.update();
        return link;
    }

    it('fills a column table with one row per list element', async () => {
        const output = columnOutput({ year: 'y', co2: 'c', site: 's' });
        const dialog = makeDialog([output], { y: [2020, 2021], c: [42], s: 'S1' });

        await dialog.onTest();

        expect(dialog.getTableValues(output)).toEqual([
            { year: 2020, co2: 42, site: 'S1' },
            { year: 2021, co2: '', site: 'S1' }
        ]);
        expect(JSON.parse(dialog.result.output)).toEqual({
            results: {
                type: 'table',
                rows: [
                    { year: 2020, co2: 42, site: 'S1' },
                    { year: 2021, co2: '', site: 'S1' }
                ]
            }
        });
    });

    it('shows only the first 20 rows of a long result table and keeps all rows in the output', async () => {
        const years = Array.from({ length: 25 }, (_, index) => 2000 + index);
        const output = columnOutput({ year: 'y' });
        const dialog = makeDialog([output], { y: years });
        dialog.maxTestTableRows = 20;

        await dialog.onTest();

        const values = dialog.getTableValues(output);
        expect(values.length).toBe(25);
        expect(dialog.getTestTableRows(values).length).toBe(20);
        expect(dialog.getTestTableRows(values)[19]).toEqual({ year: 2019 });
        expect(JSON.parse(dialog.result.output).results.rows.length).toBe(25);
    });

    it('shows a short result table in full', () => {
        const dialog: any = Object.create(MathEditorDialogComponent.prototype);
        dialog.maxTestTableRows = 20;
        const values = [{ year: 2020 }, { year: 2021 }];

        expect(dialog.getTestTableRows(values)).toBe(values);
    });

    it('fills one table per element of the outer list in a repeated column table', async () => {
        const output = FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field: 'series',
            schema: '#out',
            columns: { year: 'y', co2: 'c' },
            tableList: true
        })!;
        output.update();
        const dialog = makeDialog([output], { y: [[2020, 2021], [2022]], c: [1, 2] });

        await dialog.onTest();

        expect(dialog.getTableListValues(output)).toEqual([
            [{ year: 2020, co2: 1 }, { year: 2021, co2: 1 }],
            [{ year: 2022, co2: 2 }]
        ]);
        expect(JSON.parse(dialog.result.output)).toEqual({
            series: [
                { type: 'table', rows: [{ year: 2020, co2: 1 }, { year: 2021, co2: 1 }] },
                { type: 'table', rows: [{ year: 2022, co2: 2 }] }
            ]
        });
    });

    it('shows the row limit error of a column table as its value', async () => {
        const output = columnOutput({ year: 'y' });
        const dialog = makeDialog([output], { y: new Array(10001).fill(1) });

        await dialog.onTest();

        expect(output.value).toBe('Error: Too many rows: 10001. The limit is 10000');
        expect(dialog.getTableValues(output)).toBeNull();
    });
});

describe('MathEditorDialogComponent rendered Testing table', () => {
    async function render(rows: Record<string, number>[]): Promise<ComponentFixture<MathEditorDialogComponent>> {
        spyOn(MathEditorDialogComponent.prototype, 'ngOnInit').and.stub();
        spyOn(MathEditorDialogComponent.prototype, 'ngAfterContentInit').and.stub();
        await TestBed.configureTestingModule({
            declarations: [MathEditorDialogComponent],
            imports: [CommonModule],
            providers: [
                { provide: DynamicDialogRef, useValue: {} },
                { provide: DialogService, useValue: {} },
                { provide: DynamicDialogConfig, useValue: { data: {} } },
                { provide: ArtifactService, useValue: {} },
                { provide: GzipService, useValue: {} },
                { provide: CsvService, useValue: {} },
                { provide: IndexedDbRegistryService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        const fixture = TestBed.createComponent(MathEditorDialogComponent);
        const dialog: any = fixture.componentInstance;
        const output = FieldLink.from({
            type: MathItemType.LINK,
            name: '',
            description: '',
            field: 'results',
            schema: '#out',
            rows: [{ year: 'y' }]
        })!;
        output.value = { type: 'table', rows };
        dialog.loading = false;
        dialog.inputSchema = {};
        dialog.step = 'step_5';
        dialog.resultStep = 'output';
        dialog.result = {
            variables: [],
            formulas: [],
            outputs: [output],
            input: '',
            output: '',
            error: ''
        };
        dialog.outputSchemaFieldMap = new Map([['results', {
            arrayLvl: 0,
            field: {
                description: 'Results',
                customType: 'table',
                tableColumns: [{ name: 'Year', key: 'year' }]
            }
        }]]);
        fixture.detectChanges();
        return fixture;
    }

    it('renders the first 20 rows and the full count for a long result table', async () => {
        const rows = Array.from({ length: 25 }, (_, index) => ({ year: 2000 + index }));
        const fixture = await render(rows);
        const tableOutput: HTMLElement = fixture.nativeElement.querySelector('.table-output');

        expect(tableOutput.querySelector('.form-label')?.textContent?.trim()).toBe(
            'Rows (25), showing the first 20. All rows are in Code → Output'
        );
        const renderedRows = tableOutput.querySelectorAll('tbody tr');
        expect(renderedRows.length).toBe(20);
        expect(renderedRows[19].textContent).toContain('2019');
    });
});

describe('MathEditorDialogComponent issues', () => {
    function makeDialog(): any {
        const dialog: any = Object.create(MathEditorDialogComponent.prototype);
        dialog.fieldWarnings = new Map();
        dialog.mathIssues = [];
        dialog.issueGroups = [];
        dialog.issuesVisible = false;
        dialog.validationChecked = false;
        dialog.engine = {
            variables: { pages: [] },
            formulas: { pages: [] },
            outputs: { pages: [] }
        };
        return dialog;
    }

    it('collects path warnings as clickable issues', () => {
        const dialog = makeDialog();
        const variable: any = {
            id: 'v-1',
            empty: false,
            invalid: false,
            field: 'missing.path',
            variableNameText: 'x'
        };
        dialog.engine.variables.pages = [{ id: 'tab-1', items: [variable] }];
        dialog.fieldWarnings.set('v-1', true);

        dialog.updateIssues();

        expect(dialog.mathIssues).toEqual([{
            id: 'variables-v-1',
            group: 'inputs',
            step: 'step_1',
            pageId: 'tab-1',
            title: 'Path not found in schema',
            message: 'missing.path'
        }]);
        expect(dialog.issueGroups[0].issues).toEqual(dialog.mathIssues);
    });

    it('navigates to the issue row', () => {
        const dialog = makeDialog();
        const calls: any[] = [];
        dialog.onStep = (...args: any[]) => calls.push(args);

        dialog.goToIssue({
            id: 'outputs-o-1',
            group: 'outputs',
            step: 'step_3',
            pageId: 'tab-3',
            title: 'Path not found in schema',
            message: 'result.path'
        });

        expect(dialog.issuesVisible).toBeFalse();
        expect(calls).toEqual([[
            'step_3',
            'tab-3',
            '.rows-container[data-issue-id="outputs-o-1"]'
        ]]);
    });
});

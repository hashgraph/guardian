/**
 * Unit tests for inline sub-schema and enum handling in JsonToXlsx / XlsxResult.
 */
import { assert } from 'chai';
const { JsonToXlsx } = await import('../../../dist/xlsx/json-to-xlsx.js');
const { XlsxToJson } = await import('../../../dist/xlsx/xlsx-to-json.js');
const { XlsxResult } = await import('../../../dist/xlsx/models/xlsx-result.js');
const { XlsxEnum }   = await import('../../../dist/xlsx/models/xlsx-enum.js');
const { Workbook, Hyperlink } = await import('../../../dist/xlsx/models/workbook.js');
const { XlsxSchema } = await import('../../../dist/xlsx/models/xlsx-schema.js');
const { Table }      = await import('../../../dist/xlsx/models/table.js');

// Private static helpers are accessible via bracket notation in compiled JS.
const collectInlineRefs = (fields, set) => JsonToXlsx['collectInlineRefs'](fields, set);
const collectEnums = (...args) => JsonToXlsx['collectEnums'](...args);

/** Minimal Worksheet stub — only `name` is needed by XlsxEnum constructor. */
const mockWs = (name = 'Enums') => ({ name });

/** Minimal SchemaField plain-object stub. */
function makeField(overrides = {}) {
    return {
        name: 'fieldA',
        description: 'Field A',
        isRef: false,
        isArray: false,
        required: false,
        type: null,
        customType: null,
        fields: null,
        enum: null,
        remoteLink: null,
        path: 'schema_iri:fieldA',
        ...overrides,
    };
}

/** Minimal Schema plain-object stub. */
const makeSchema = (overrides = {}) =>
    ({ name: 'MySchema', iri: '#schema', fields: [], ...overrides });

// ---------------------------------------------------------------------------
describe('JsonToXlsx.collectInlineRefs', function () {

    it('returns an empty set when no fields reference sub-schemas', function () {
        const set = new Set();
        collectInlineRefs([makeField()], set);
        assert.equal(set.size, 0);
    });

    it('adds the IRI of a direct inline sub-schema field', function () {
        const set = new Set();
        collectInlineRefs([makeField({ isRef: true, customType: 'subSchema', type: '#sub1' })], set);
        assert.isTrue(set.has('#sub1'));
    });

    it('does NOT add the IRI for a plain cross-schema ref (no customType subSchema)', function () {
        const set = new Set();
        collectInlineRefs([makeField({ isRef: true, customType: null, type: '#sub1' })], set);
        assert.equal(set.size, 0);
    });

    it('does NOT add when type is null even if customType is subSchema', function () {
        const set = new Set();
        collectInlineRefs([makeField({ isRef: true, customType: 'subSchema', type: null })], set);
        assert.equal(set.size, 0);
    });

    it('collects IRIs from deeply nested fields', function () {
        const set = new Set();
        const target = makeField({ isRef: true, customType: 'subSchema', type: '#target' });
        const mid  = makeField({ isRef: true, fields: [target] });
        const root = makeField({ isRef: true, fields: [mid]  });
        collectInlineRefs([root], set);
        assert.isTrue(set.has('#target'));
    });

    it('collects multiple unique inline sub-schema IRIs', function () {
        const set = new Set();
        collectInlineRefs([
            makeField({ name: 'a', isRef: true, customType: 'subSchema', type: '#sub1' }),
            makeField({ name: 'b', isRef: true, customType: 'subSchema', type: '#sub2' }),
        ], set);
        assert.isTrue(set.has('#sub1'));
        assert.isTrue(set.has('#sub2'));
    });

});

// ---------------------------------------------------------------------------
describe('JsonToXlsx.collectEnums', function () {
    let enums, enumsCache, seenMap, ws, schema;

    beforeEach(function () {
        enums = [];
        enumsCache = new Map();
        seenMap = new Map();
        ws = mockWs();
        schema = makeSchema();
    });

    it('collects a field with inline enum values', function () {
        const field = makeField({ enum: ['A', 'B', 'C'], path: '#s:f' });
        collectEnums([field], schema, enums, enumsCache, ws, seenMap);
        assert.equal(enums.length, 1);
        assert.isTrue(enumsCache.has('#s:f'));
        assert.deepEqual(enums[0].data, ['A', 'B', 'C']);
    });

    it('collects a field with a remoteLink (IPFS enum)', function () {
        const field = makeField({ remoteLink: 'ipfs://Qm123', path: '#s:f' });
        collectEnums([field], schema, enums, enumsCache, ws, seenMap);
        assert.equal(enums.length, 1);
        assert.isTrue(enumsCache.has('#s:f'));
    });

    it('recurses into inline sub-schema fields and collects the nested enum', function () {
        const innerField = makeField({ name: 'inner', description: 'Color', enum: ['Red'], path: '#sub:inner' });
        const parentField = makeField({ name: 'sub', isRef: true, type: '#sub', fields: [innerField] });
        const subSchemaNames = new Map([['#sub', 'SubSchemaName']]);
        collectEnums([parentField], schema, enums, enumsCache, ws, seenMap, subSchemaNames);
        assert.equal(enums.length, 1);
        assert.equal(enums[0].enumName, 'Color');
        assert.isTrue(enumsCache.has('#sub:inner'));
    });
});

// ---------------------------------------------------------------------------
describe('XlsxResult enum lookup', function () {
    let result;

    beforeEach(function () { result = new XlsxResult(); });

    function addNamedEnum(enumName, worksheetName = 'Enums') {
        const e = new XlsxEnum(mockWs(worksheetName));
        e.setEnumName(enumName);
        result.addEnum(e);
        return e;
    }

    function addLegacyEnum(worksheetName) {
        const e = new XlsxEnum(mockWs(worksheetName));
        result.addEnum(e);
        return e;
    }

    // --- new path: getEnumByName (shared enum tab keyed by Enum name) -------
    describe('getEnumByName — shared-tab path', function () {
        it('finds an enum by its unique name', function () {
            const e = addNamedEnum('Status');
            assert.strictEqual(result.getEnumByName('Status'), e);
        });

        it('returns null when the name does not match', function () {
            addNamedEnum('Status');
            assert.isNull(result.getEnumByName('Color'));
        });

        it('returns the correct entry when multiple named enums exist', function () {
            const e1 = addNamedEnum('Status');
            const e2 = addNamedEnum('Category');
            assert.strictEqual(result.getEnumByName('Status'),   e1);
            assert.strictEqual(result.getEnumByName('Category'), e2);
        });
    });

    // --- old path: getEnum (per-tab legacy worksheet lookup) ----------------
    describe('getEnum — legacy per-tab path', function () {
        it('finds an enum by its worksheet name', function () {
            const e = addLegacyEnum('MySchema_Status_Enum');
            assert.strictEqual(result.getEnum('MySchema_Status_Enum'), e);
        });

        it('returns null when worksheet name does not match', function () {
            addLegacyEnum('MySchema_Status_Enum');
            assert.isNull(result.getEnum('OtherTab'));
        });
    });
});

// ---------------------------------------------------------------------------
// Helper: create a real Workbook worksheet populated with an old-format enum tab.
// Layout:  row 1 = "Schema name" / schemaName
//          row 2 = "Field name"  / fieldName
//          row 3 = "Loaded to IPFS" / ipfsFlag
//          row 4+ = enum values in col A
function buildEnumWorksheet(wb, sheetName, schemaName, fieldName, ipfsFlag, values) {
    const ws = wb.createWorksheet(sheetName);
    ws.setValue('Schema name',    1, 1);
    ws.setValue(schemaName,       2, 1);
    ws.setValue('Field name',     1, 2);
    ws.setValue(fieldName,        2, 2);
    ws.setValue('Loaded to IPFS', 1, 3);
    ws.setValue(ipfsFlag,         2, 3);
    values.forEach((v, i) => ws.setValue(v, 1, 4 + i));
    return ws;
}

// ---------------------------------------------------------------------------
describe('XlsxToJson.readEnumSheet — old per-tab enum format', function () {
    const readEnumSheet = (...args) => XlsxToJson['readEnumSheet'](...args);

    it('collects all values from data rows into the enum', async function () {
        const wb = new Workbook();
        const ws = buildEnumWorksheet(wb, 'MyEnum', 'S', 'F', 'No', ['OptionA', 'OptionB', 'OptionC']);
        const result = new XlsxResult();
        const e = await readEnumSheet(ws, result);
        assert.deepEqual(e.data, ['OptionA', 'OptionB', 'OptionC']);
    });

    it('deduplicates values and records a warning for each duplicate', async function () {
        const wb = new Workbook();
        const ws = buildEnumWorksheet(wb, 'MyEnum', 'S', 'F', 'No', ['X', 'Y', 'X']);
        const result = new XlsxResult();
        const e = await readEnumSheet(ws, result);
        assert.deepEqual(e.data, ['X', 'Y']);   // duplicate 'X' dropped
        const errors = result['_errors'];
        assert.isTrue(errors.some(err => err.type === 'warning' && err.text === 'Duplicate value.'));
    });

    it('returns an empty data array when there are no value rows', async function () {
        const wb = new Workbook();
        const ws = buildEnumWorksheet(wb, 'MyEnum', 'S', 'F', 'No', []);
        const result = new XlsxResult();
        const e = await readEnumSheet(ws, result);
        assert.deepEqual(e.data, []);
    });
});

// ---------------------------------------------------------------------------
describe('XlsxResult.updateSchemas — old cross-schema ref link resolution', function () {

    function registerSchema(result, worksheetName, iri) {
        const wb = new Workbook();
        const ws = wb.createWorksheet(worksheetName);
        const xlsxSchema = new XlsxSchema(ws);
        xlsxSchema.schema.iri = iri;
        xlsxSchema.schema.fields = [];
        xlsxSchema.schema.conditions = [];
        result.addSchema(ws, xlsxSchema);
        return xlsxSchema;
    }

    it('resolves a hyperlink-based ref to the target schema IRI (old tab format)', function () {
        const result = new XlsxResult();
        registerSchema(result, 'TargetSheet', '#TargetIRI');

        // Source schema with a ref field linked via hyperlink to TargetSheet
        const linkId = result.addLink('TargetName', new Hyperlink('TargetSheet', 'A1'));
        const refField = { name: 'sub', isRef: true, type: linkId, order: 5 };
        const sourceXlsxSchema = registerSchema(result, 'SourceSheet', '#SourceIRI');
        sourceXlsxSchema.schema.fields = [refField];

        result.updateSchemas();

        assert.equal(refField.type, '#TargetIRI');
    });

    it('resolves a name-only link to the target schema IRI (inline sub-schema path)', function () {
        const result = new XlsxResult();
        registerSchema(result, 'TargetSheet', '#TargetIRI');

        // addLink with null hyperlink — name-only lookup, used by the inline sub-schema parser
        const linkId = result.addLink('TargetSheet', null);
        const refField = { name: 'sub', isRef: true, type: linkId, order: 5 };
        const sourceXlsxSchema = registerSchema(result, 'SourceSheet', '#SourceIRI');
        sourceXlsxSchema.schema.fields = [refField];

        result.updateSchemas();

        assert.equal(refField.type, '#TargetIRI');
    });

    it('sets field.type to null and records an error when the target schema is not found', function () {
        const result = new XlsxResult();
        // No target schema registered

        const linkId = result.addLink('MissingSchema', new Hyperlink('NoSuchSheet', 'A1'));
        const refField = { name: 'sub', isRef: true, type: linkId, order: 5 };
        const sourceXlsxSchema = registerSchema(result, 'SourceSheet', '#SourceIRI');
        sourceXlsxSchema.schema.fields = [refField];

        result.updateSchemas();

        assert.isNull(refField.type);
        const errors = result['_errors'];
        assert.isTrue(errors.some(e => e.text.includes('MissingSchema')));
    });
});

// ---------------------------------------------------------------------------
describe('JsonToXlsx.writeField — old vs new sub-schema rendering', function () {
    // Build a real worksheet + initialised Table so writeField can write to it.
    function buildSheetAndTable() {
        const wb  = new Workbook();
        const ws  = wb.createWorksheet('SchemaSheet');
        const table = new Table({ r: 1, c: 1 });
        table.setDefault(false);
        return { ws, table };
    }

    // First data row is one past the last schema header row.
    const DATA_ROW = 5;

    it('old format: writes a hyperlink to the referenced sheet when IRI is in schemaCache', function () {
        const { ws, table } = buildSheetAndTable();
        const field = makeField({ isRef: true, type: '#TargetIRI', path: '#src:sub' });
        const schemaCache = new Map([['#TargetIRI', 'TargetSheet']]);

        JsonToXlsx.writeField(ws, table, field, schemaCache, new Map(), new Map(), DATA_ROW);

        const link = ws.getCell(table.getCol('Field Type'), DATA_ROW).getLink();
        assert.isNotNull(link);
        assert.equal(link.worksheet, 'TargetSheet');
    });

    it('new format: writes "Sub-Schema" text when IRI is not in schemaCache', function () {
        const { ws, table } = buildSheetAndTable();
        const field = makeField({ isRef: true, customType: 'subSchema', type: '#InlineIRI', path: '#src:sub' });

        JsonToXlsx.writeField(ws, table, field, new Map(), new Map(), new Map(), DATA_ROW);

        const cellValue = ws.getValue(table.getCol('Field Type'), DATA_ROW);
        assert.equal(cellValue, 'Sub-Schema');
    });

    it('new format: writes sub-schema display name into Parameter column', function () {
        const { ws, table } = buildSheetAndTable();
        const field = makeField({ isRef: true, customType: 'subSchema', type: '#InlineIRI', path: '#src:sub' });
        const subSchemaNames = new Map([['#InlineIRI', 'MySubSchema']]);

        JsonToXlsx.writeField(ws, table, field, new Map(), new Map(), new Map(), DATA_ROW, subSchemaNames);

        const paramValue = ws.getValue(table.getCol('Parameter'), DATA_ROW);
        assert.equal(paramValue, 'MySubSchema');
    });
});

// ---------------------------------------------------------------------------
// Shared "Enums" tab (new format): header-name-based columns, rename, duplicates.
//
// `cols` maps the three headers to arbitrary column indices so column order /
// reordering can be exercised. Each enum block: the first row carries the name +
// IPFS flag (+ first value); following rows carry only the next value.
function buildSharedEnumWorksheet(wb, cols, enums, headers = {}) {
    const ws = wb.createWorksheet('Enums');
    ws.setValue(headers.name  ?? 'Enum Name',      cols.name,  1);
    ws.setValue(headers.ipfs  ?? 'Loaded to IPFS', cols.ipfs,  1);
    ws.setValue(headers.value ?? 'Value',          cols.value, 1);
    let row = 2;
    for (const e of enums) {
        const values = (e.values && e.values.length) ? e.values : [null];
        values.forEach((v, i) => {
            if (i === 0) {
                ws.setValue(e.name, cols.name, row);
                ws.setValue(e.ipfs ? 'Yes' : 'No', cols.ipfs, row);
            }
            if (v != null) { ws.setValue(v, cols.value, row); }
            row++;
        });
    }
    return ws;
}

describe('XlsxToJson — shared "Enums" tab', function () {
    const isSharedEnumSheet = (ws) => XlsxToJson['isSharedEnumSheet'](ws);
    const validateSharedEnumHeaders = (ws, result) => XlsxToJson['validateSharedEnumHeaders'](ws, result);
    const readSharedEnumSheet = (ws, result) => XlsxToJson['readSharedEnumSheet'](ws, result, true);

    it('detects the sheet and reads enums', async function () {
        const wb = new Workbook();
        const ws = buildSharedEnumWorksheet(wb, { name: 1, ipfs: 2, value: 3 }, [
            { name: 'Status', ipfs: false, values: ['A', 'B'] },
            { name: 'Color',  ipfs: false, values: ['Red', 'Green'] },
        ]);
        assert.isTrue(isSharedEnumSheet(ws));
        const result = new XlsxResult();
        const enums = await readSharedEnumSheet(ws, result);
        assert.equal(enums.length, 2);
        assert.deepEqual(enums.map(e => e.enumName), ['Status', 'Color']);
        assert.deepEqual(enums[0].data, ['A', 'B']);
        assert.deepEqual(enums[1].data, ['Red', 'Green']);
    });

    it('reports the missing header(s) via validateSharedEnumHeaders', function () {
        const wb = new Workbook();
        // omit the "Value" header by giving it a wrong label
        const ws = buildSharedEnumWorksheet(wb, { name: 1, ipfs: 2, value: 3 },
            [{ name: 'Status', ipfs: false, values: ['A'] }],
            { value: 'Values' });
        assert.isFalse(isSharedEnumSheet(ws));
        const result = new XlsxResult();
        validateSharedEnumHeaders(ws, result);
        const errors = result['_errors'];
        assert.isTrue(errors.some(e => e.type === 'error' && e.text.includes('"Value"')));
    });

    it('keeps the first definition and warns on a duplicate enum name', async function () {
        const wb = new Workbook();
        const ws = buildSharedEnumWorksheet(wb, { name: 1, ipfs: 2, value: 3 }, [
            { name: 'Status', ipfs: false, values: ['A', 'B'] },
            { name: 'Status', ipfs: false, values: ['X'] },
        ]);
        const result = new XlsxResult();
        const enums = await readSharedEnumSheet(ws, result);
        assert.equal(enums.length, 1);
        assert.deepEqual(enums[0].data, ['A', 'B']); // first definition wins
        const errors = result['_errors'];
        assert.isTrue(errors.some(e => e.type === 'warning' && /Duplicate enum name "Status"/.test(e.text)));
    });
});

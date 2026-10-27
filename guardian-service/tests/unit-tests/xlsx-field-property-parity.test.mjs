// Checks that the property registry matches the real XLSX columns and round trips.
import assert from 'node:assert/strict';
import { IwaVersion, SchemaEntity, SCHEMA_FIELD_PROPERTIES } from '@guardian/interfaces';
import { JsonToXlsx } from '../../dist/xlsx/json-to-xlsx.js';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';
import { XlsxResult } from '../../dist/xlsx/models/xlsx-result.js';
import { Workbook } from '../../dist/xlsx/models/workbook.js';
import { Dictionary } from '../../dist/xlsx/models/dictionary.js';
import { Table } from '../../dist/xlsx/models/table.js';

const readSchemaSheet = (...args) => XlsxToJson['readSchemaSheet'](...args);

describe('SchemaField property registry', () => {
    const entries = Object.entries(SCHEMA_FIELD_PROPERTIES);
    const headers = new Set(Object.values(Dictionary));

    it('requires a reason for every property missing from XLSX or the editor', () => {
        for (const [key, spec] of entries) {
            if (spec.xlsx === null || spec.editor === null) {
                assert.ok(spec.exempt, `"${key}" is missing from XLSX or the editor but has no "exempt" reason`);
            }
        }
    });

    it('only points at XLSX headers that exist', () => {
        for (const [key, spec] of entries) {
            if (spec.xlsx !== null) {
                assert.ok(headers.has(spec.xlsx), `"${key}" maps to unknown XLSX header "${spec.xlsx}"`);
            }
        }
    });

    it('only points at XLSX field columns that the table lays out', () => {
        const table = new Table({ c: 1, r: 1 });
        table.setDefault(false);
        for (const [key, spec] of entries) {
            if (spec.xlsx !== null && !['Sub-Schema'].includes(spec.xlsx)) {
                assert.ok(table.hasCol(spec.xlsx), `"${key}" maps to "${spec.xlsx}", which is not a field column`);
            }
        }
    });
});

function field(name, extra = {}) {
    return {
        name,
        title: name,
        description: name,
        required: false,
        isArray: false,
        readOnly: false,
        hidden: false,
        isUpdatable: false,
        type: 'string',
        format: undefined,
        pattern: undefined,
        unit: undefined,
        unitSystem: undefined,
        customType: undefined,
        property: undefined,
        isRef: false,
        order: 1,
        path: `#Parity:${name}`,
        ...extra,
    };
}

async function roundTrip(entity, fields) {
    const workbook = new Workbook();
    const worksheet = workbook.createWorksheet('Parity');
    const schema = { name: 'Parity', description: 'd', entity, iwaVersion: IwaVersion.V1, fields, conditions: [] };
    JsonToXlsx.writeSchema(worksheet, schema, null, new Map(), new Map(), new Map());
    const buffer = await workbook.write();
    const readWorkbook = new Workbook();
    await readWorkbook.read(buffer);
    const xlsxResult = new XlsxResult();
    const result = await readSchemaSheet(readWorkbook.getWorksheet('Parity'), xlsxResult, new Map());
    return { result, errors: xlsxResult.toJson().errors };
}

describe('Updatable and Private survive an XLSX round trip', () => {
    it('keeps isUpdatable', async () => {
        const { result, errors } = await roundTrip(SchemaEntity.VC, [
            field('a', { isUpdatable: true, order: 1 }),
            field('b', { isUpdatable: false, order: 2 }),
        ]);
        assert.deepEqual(errors, []);
        assert.equal(result.fields.find(f => f.name === 'a').isUpdatable, true);
        assert.equal(result.fields.find(f => f.name === 'b').isUpdatable, false);
    });

    it('keeps isPrivate on Encrypted VC schemas', async () => {
        const { result, errors } = await roundTrip(SchemaEntity.EVC, [
            field('a', { isPrivate: true, order: 1 }),
            field('b', { isPrivate: false, order: 2 }),
        ]);
        assert.deepEqual(errors, []);
        assert.equal(result.fields.find(f => f.name === 'a').isPrivate, true);
        assert.equal(result.fields.find(f => f.name === 'b').isPrivate, false);
    });

    it('ignores Private on a non-encrypted schema and warns', async () => {
        const workbook = new Workbook();
        const worksheet = workbook.createWorksheet('Parity');
        const schema = {
            name: 'Parity', description: 'd', entity: SchemaEntity.EVC, iwaVersion: IwaVersion.V1,
            fields: [field('a', { isPrivate: true })], conditions: []
        };
        JsonToXlsx.writeSchema(worksheet, schema, null, new Map(), new Map(), new Map());
        // Switch the exported schema type to a plain VC.
        const range = worksheet.getRange();
        for (let row = range.s.r; row < range.e.r; row++) {
            if (worksheet.getValue(range.s.c, row) === Dictionary.SCHEMA_TYPE) {
                worksheet.setValue('Verifiable Credentials', range.s.c + 1, row);
            }
        }
        const buffer = await workbook.write();
        const readWorkbook = new Workbook();
        await readWorkbook.read(buffer);
        const xlsxResult = new XlsxResult();
        const result = await readSchemaSheet(readWorkbook.getWorksheet('Parity'), xlsxResult, new Map());
        assert.equal(result.fields.find(f => f.name === 'a').isPrivate, undefined);
        assert.ok(xlsxResult.toJson().errors.some(e => e.type === 'warning' && /Private Field/.test(e.text)));
    });
});

describe('Legacy header labels', () => {
    it('resolve to the current label, and current labels resolve to themselves', async () => {
        const { LEGACY_FIELD_HEADERS, resolveFieldHeader } = await import('../../dist/xlsx/models/dictionary.js');
        for (const [legacy, current] of LEGACY_FIELD_HEADERS) {
            assert.equal(resolveFieldHeader(legacy), current);
            assert.equal(resolveFieldHeader(current), current);
        }
        assert.equal(resolveFieldHeader('Not a header'), null);
    });

    it('never collide with a current label', async () => {
        const { LEGACY_FIELD_HEADERS } = await import('../../dist/xlsx/models/dictionary.js');
        const current = new Set(Object.values(Dictionary));
        for (const legacy of LEGACY_FIELD_HEADERS.keys()) {
            assert.ok(!current.has(legacy), `legacy label "${legacy}" is also a current label`);
        }
    });

    it('import a sheet that still uses the old Field Type and Question headers', async () => {
        const workbook = new Workbook();
        const worksheet = workbook.createWorksheet('Parity');
        const schema = {
            name: 'Parity', description: 'd', entity: SchemaEntity.VC, iwaVersion: IwaVersion.V1,
            fields: [field('a', { isUpdatable: true })], conditions: []
        };
        JsonToXlsx.writeSchema(worksheet, schema, null, new Map(), new Map(), new Map());
        const range = worksheet.getRange();
        for (let row = range.s.r; row < range.e.r; row++) {
            for (let col = range.s.c; col < range.e.c; col++) {
                const value = worksheet.getValue(col, row);
                if (value === Dictionary.FIELD_TYPE) { worksheet.setValue('Field Type', col, row); }
                if (value === Dictionary.QUESTION && col > range.s.c + 1) { worksheet.setValue('Question', col, row); }
            }
        }
        const buffer = await workbook.write();
        const readWorkbook = new Workbook();
        await readWorkbook.read(buffer);
        const xlsxResult = new XlsxResult();
        const result = await readSchemaSheet(readWorkbook.getWorksheet('Parity'), xlsxResult, new Map());
        assert.deepEqual(xlsxResult.toJson().errors, []);
        const imported = result.fields.find(f => f.name === 'a');
        assert.equal(imported.type, 'string');
        assert.equal(imported.description, 'a');
        assert.equal(imported.isUpdatable, true);
    });
});

describe('Updatable and Private follow the editor rules on import', () => {
    it('ignores Updatable on a Help Text field and warns', async () => {
        const { result, errors } = await roundTrip(SchemaEntity.VC, [
            field('h', { type: 'null', isUpdatable: true }),
            field('s', { isUpdatable: true, order: 2 }),
        ]);
        assert.equal(result.fields.find(f => f.name === 'h').isUpdatable, false);
        assert.equal(result.fields.find(f => f.name === 's').isUpdatable, true);
        assert.ok(errors.some(e => e.type === 'warning' && /Updatable Field/.test(e.text)));
    });

    it('ignores Private on fields inside a sub-schema and warns', async () => {
        const child = field('child', { isPrivate: true, order: 1, path: '#Parity:child' });
        const sub = field('sub', {
            type: '#InlineParitySub', customType: 'subSchema', isRef: true,
            fields: [child], conditions: [], isPrivate: true, order: 1
        });
        const { result, errors } = await roundTrip(SchemaEntity.EVC, [sub]);
        const top = result.fields.find(f => f.name === 'sub');
        assert.equal(top.isPrivate, true);
        assert.equal(top.fields[0].isPrivate, undefined);
        assert.ok(errors.some(e => e.type === 'warning' && /Private Field/.test(e.text)));
    });
});

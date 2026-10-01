// Round-trips IWA Version/Property through writeSchema/readSchemaSheet directly,
// skipping the Schema document/$defs machinery that full generate()/parse() needs.
import assert from 'node:assert/strict';
import { IwaVersion, SchemaEntity } from '@guardian/interfaces';
import { JsonToXlsx } from '../../dist/xlsx/json-to-xlsx.js';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';
import { XlsxResult } from '../../dist/xlsx/models/xlsx-result.js';
import { Workbook } from '../../dist/xlsx/models/workbook.js';
import { Dictionary } from '../../dist/xlsx/models/dictionary.js';

const readSchemaSheet = (...args) => XlsxToJson['readSchemaSheet'](...args);

function propertyField(name, description, property, order) {
    return {
        name,
        title: name,
        description,
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
        property,
        isRef: false,
        order,
        path: `#IwaRoundTrip:${name}`,
    };
}

function subSchemaField(name, description, property, order, fields) {
    return {
        name,
        title: name,
        description,
        required: false,
        isArray: false,
        readOnly: false,
        hidden: false,
        isUpdatable: false,
        type: '#InlineIwaSub',
        format: undefined,
        pattern: undefined,
        unit: undefined,
        unitSystem: undefined,
        customType: 'subSchema',
        property,
        isRef: true,
        order,
        fields,
        conditions: [],
        path: `#IwaRoundTrip:${name}`,
    };
}

function fieldSet() {
    return [
        propertyField('field_1', 'Country', 'ActivityImpactModule.country', 1),
        subSchemaField('field_2', 'Impact Module', 'ActivityImpactModule.projectModules', 2, [
            propertyField('nested_1', 'Nested value', 'ActivityImpactModule.nestedValue', 1)
        ])
    ];
}

function schemaStub(fields, iwaVersion) {
    return {
        name: 'IwaRoundTrip',
        description: 'IWA property round trip',
        entity: SchemaEntity.VC,
        iwaVersion,
        fields,
        conditions: [],
    };
}

async function roundTrip(iwaVersion) {
    const workbook = new Workbook();
    const worksheet = workbook.createWorksheet('IwaRoundTrip');
    JsonToXlsx.writeSchema(worksheet, schemaStub(fieldSet(), iwaVersion), null, new Map(), new Map(), new Map());
    const buffer = await workbook.write();

    const readWorkbook = new Workbook();
    await readWorkbook.read(buffer);
    const readWorksheet = readWorkbook.getWorksheet('IwaRoundTrip');
    const xlsxResult = new XlsxResult();
    const schema = await readSchemaSheet(readWorksheet, xlsxResult, new Map());
    return { xlsxResult, schema };
}

describe('IWA properties survive a schema-sheet round trip', () => {
    for (const version of [IwaVersion.V1, IwaVersion.V3]) {
        describe(`iwaVersion ${version}`, () => {
            let trip;

            before(async () => {
                trip = await roundTrip(version);
            });

            it('reports no import errors', () => {
                assert.deepEqual(trip.xlsxResult.toJson().errors, []);
            });

            it('restores the schema-level IWA Version', () => {
                assert.equal(trip.schema.iwaVersion, version);
            });

            it('keeps the top-level field property', () => {
                assert.equal(trip.schema.fields[0].property, 'ActivityImpactModule.country');
            });

            it("keeps the Sub-Schema field's own property, not the sub-schema name", () => {
                const subField = trip.schema.fields[1];
                assert.equal(subField.isRef, true);
                assert.equal(subField.property, 'ActivityImpactModule.projectModules');
            });

            it('keeps the nested (sub-schema) field property', () => {
                const subField = trip.schema.fields[1];
                assert.ok(Array.isArray(subField.fields) && subField.fields.length === 1);
                assert.equal(subField.fields[0].property, 'ActivityImpactModule.nestedValue');
            });
        });
    }

    it('falls back to V1 when the IWA Version row is blank (old workbook)', async () => {
        const workbook = new Workbook();
        const worksheet = workbook.createWorksheet('IwaRoundTrip');
        JsonToXlsx.writeSchema(worksheet, schemaStub([propertyField('f', 'F', null, 1)], IwaVersion.V3), null, new Map(), new Map(), new Map());
        // Simulate a workbook exported before the IWA Version row existed.
        const range = worksheet.getRange();
        for (let row = range.s.r; row < range.e.r; row++) {
            if (worksheet.getValue(range.s.c, row) === Dictionary.IWA_VERSION) {
                worksheet.setValue('', range.s.c, row);
                worksheet.setValue('', range.s.c + 1, row);
            }
        }
        const buffer = await workbook.write();

        const readWorkbook = new Workbook();
        await readWorkbook.read(buffer);
        const readWorksheet = readWorkbook.getWorksheet('IwaRoundTrip');
        const xlsxResult = new XlsxResult();
        const schema = await readSchemaSheet(readWorksheet, xlsxResult, new Map());

        assert.equal(schema.iwaVersion, IwaVersion.V1);
        assert.deepEqual(xlsxResult.toJson().errors, []);
    });

    it('warns but keeps the value for an unrecognized IWA Version', async () => {
        const workbook = new Workbook();
        const worksheet = workbook.createWorksheet('IwaRoundTrip');
        JsonToXlsx.writeSchema(worksheet, schemaStub([propertyField('f', 'F', null, 1)], IwaVersion.V3), null, new Map(), new Map(), new Map());
        const range = worksheet.getRange();
        for (let row = range.s.r; row < range.e.r; row++) {
            if (worksheet.getValue(range.s.c, row) === Dictionary.IWA_VERSION) {
                worksheet.setValue('V9000', range.s.c + 1, row);
            }
        }
        const buffer = await workbook.write();

        const readWorkbook = new Workbook();
        await readWorkbook.read(buffer);
        const readWorksheet = readWorkbook.getWorksheet('IwaRoundTrip');
        const xlsxResult = new XlsxResult();
        const schema = await readSchemaSheet(readWorksheet, xlsxResult, new Map());

        assert.equal(schema.iwaVersion, IwaVersion.V1);
        const errors = xlsxResult.toJson().errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].type, 'warning');
        assert.match(errors[0].text, /Unrecognized IWA Version/);
    });
});

describe('XlsxToJson.checkFieldProperties (no database)', () => {
    const checkFieldProperties = (...args) => XlsxToJson['checkFieldProperties'](...args);

    it('adds a warning for a property path not in the known set, but keeps the value', () => {
        const worksheet = { name: 'IwaRoundTrip' };
        const fields = [propertyField('f1', 'F1', 'Unknown.path', 1)];
        const xlsxResult = new XlsxResult();

        checkFieldProperties(worksheet, fields, new Set(['ActivityImpactModule.country']), IwaVersion.V3, xlsxResult);

        assert.equal(fields[0].property, 'Unknown.path');
        const errors = xlsxResult.toJson().errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].type, 'warning');
        assert.match(errors[0].text, /Unknown IWA property/);
    });

    it('does not warn for a known property path', () => {
        const worksheet = { name: 'IwaRoundTrip' };
        const fields = [propertyField('f1', 'F1', 'ActivityImpactModule.country', 1)];
        const xlsxResult = new XlsxResult();

        checkFieldProperties(worksheet, fields, new Set(['ActivityImpactModule.country']), IwaVersion.V3, xlsxResult);

        assert.deepEqual(xlsxResult.toJson().errors, []);
    });

    it('recurses into nested (sub-schema) fields', () => {
        const worksheet = { name: 'IwaRoundTrip' };
        const nested = propertyField('n1', 'N1', 'Unknown.nested', 1);
        const fields = [subSchemaField('s1', 'Sub', null, 1, [nested])];
        const xlsxResult = new XlsxResult();

        checkFieldProperties(worksheet, fields, new Set(), IwaVersion.V1, xlsxResult);

        const errors = xlsxResult.toJson().errors;
        assert.equal(errors.length, 1);
        assert.match(errors[0].text, /Unknown.nested/);
    });
});

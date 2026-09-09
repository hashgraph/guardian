import assert from 'node:assert/strict';
import {
    Schema,
    SchemaCategory,
    SchemaEntity,
    SchemaHelper,
    SchemaStatus
} from '@guardian/interfaces';
import { JsonToXlsx } from '../../dist/xlsx/json-to-xlsx.js';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';

function geoField(name, description, customType, order, dependency, example) {
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
        customType,
        property: null,
        isRef: false,
        order,
        examples: example ? [example] : null,
        dependency
    };
}

function chain() {
    return [
        geoField('field_1', 'Continent', 'continent', 1, null, 'NA'),
        geoField('field_2', 'Country', 'country', 2, { on: 'field_1', kind: 'geo' }, 'US'),
        geoField('field_3', 'State', 'state', 3, { on: 'field_2', kind: 'geo' }, 'US-CA')
    ];
}

function buildSchema(fields) {
    const schema = new Schema();
    schema.name = 'GeoRoundTrip';
    schema.description = 'Geographic round trip';
    schema.category = SchemaCategory.POLICY;
    schema.entity = SchemaEntity.VC;
    schema.status = SchemaStatus.DRAFT;
    schema.update(fields, []);
    SchemaHelper.updateIRI(schema);
    schema.updateDocument();
    return { ...schema, document: schema.document };
}

async function roundTrip(fields) {
    const buffer = await JsonToXlsx.generate([buildSchema(fields)], [], []);
    const result = await XlsxToJson.parse(Buffer.from(buffer));
    return {
        result,
        fields: result.xlsxSchemas[0].fields.filter((field) => field.customType)
    };
}

describe('Geographic fields survive a full xlsx round trip', () => {
    let first;

    before(async () => {
        first = await roundTrip(chain());
    });

    it('reports no import errors', () => {
        assert.deepEqual(first.result.toJson().errors, []);
    });

    it('keeps all three geographic types', () => {
        assert.equal(first.fields.length, 3);
        assert.deepEqual(
            first.fields.map((field) => field.customType),
            ['continent', 'country', 'state']
        );
        for (const field of first.fields) {
            assert.equal(field.type, 'string');
            assert.equal(field.isRef, false);
        }
    });

    it('keeps the parent links, resolved to field keys', () => {
        assert.equal(first.fields[0].dependency, null);
        assert.deepEqual(first.fields[1].dependency, {
            on: first.fields[0].name,
            kind: 'geo'
        });
        assert.deepEqual(first.fields[2].dependency, {
            on: first.fields[1].name,
            kind: 'geo'
        });
    });

    it('keeps every preset as the stored code', () => {
        assert.deepEqual(first.fields[0].examples, ['NA']);
        assert.deepEqual(first.fields[1].examples, ['US']);
        assert.deepEqual(first.fields[2].examples, ['US-CA']);
    });

    it('is stable on a second trip', async () => {
        const second = await roundTrip(first.fields);

        assert.deepEqual(second.result.toJson().errors, []);
        assert.deepEqual(
            second.fields.map((field) => [field.name, field.customType, field.examples]),
            first.fields.map((field) => [field.name, field.customType, field.examples])
        );
        assert.deepEqual(second.fields[2].dependency, first.fields[2].dependency);
    });

    it('reports a broken link with its row after a trip', async () => {
        const fields = chain();
        fields[2].dependency = { on: 'field_99', kind: 'geo' };
        const { result, fields: parsed } = await roundTrip(fields);

        const errors = result.toJson().errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].text, 'Field "field_99" not found.');
        assert.ok(errors[0].cell);
        assert.equal(parsed[2].dependency, null);
    });
});

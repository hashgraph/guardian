import assert from 'node:assert/strict';
import { SchemaToJson, JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';

const ctx = () => new ErrorContext().setPath(['schema', 'fields']);

const tableField = (overrides = {}) => ({
    name: 'emissions',
    title: 'Emissions',
    description: 'Emissions table',
    type: 'string',
    customType: 'table',
    isRef: false,
    isArray: false,
    required: false,
    readOnly: false,
    ...overrides,
});

describe('SchemaToJson.fieldToJson — table columns', () => {
    it('writes the declared columns into the field json', () => {
        const columns = [
            { name: 'Year', key: 'year' },
            { name: 'CO2 (tonnes)', key: 'co2_tonnes' },
        ];

        const json = SchemaToJson.fieldToJson(tableField({ tableColumns: columns }), 0);

        assert.deepEqual(json.tableColumns, columns);
    });

    it('keeps the declared order', () => {
        const columns = [
            { name: 'Zulu', key: 'z' },
            { name: 'Alpha', key: 'a' },
            { name: 'Mike', key: 'm' },
        ];

        const json = SchemaToJson.fieldToJson(tableField({ tableColumns: columns }), 0);

        assert.deepEqual(json.tableColumns.map((column) => column.key), ['z', 'a', 'm']);
    });

    it('leaves the property out when the field declared none', () => {
        const json = SchemaToJson.fieldToJson(tableField(), 0);

        assert.equal(json.tableColumns, undefined);
    });

    it('does not write an empty array', () => {
        const json = SchemaToJson.fieldToJson(tableField({ tableColumns: [] }), 0);

        assert.equal(json.tableColumns, undefined);
    });

    it('leaves a non-table field without the property', () => {
        const json = SchemaToJson.fieldToJson({
            name: 'note',
            title: 'Note',
            description: 'A note',
            type: 'string',
            isRef: false,
            isArray: false,
            required: false,
            readOnly: false,
        }, 0);

        assert.equal(json.tableColumns, undefined);
    });
});

describe('JsonToSchema.fromTableColumns', () => {
    it('reads the columns back with the same names, keys and order', () => {
        const columns = [
            { name: 'Year', key: 'year' },
            { name: 'CO2 (tonnes)', key: 'co2_tonnes' },
        ];

        assert.deepEqual(JsonToSchema.fromTableColumns({ tableColumns: columns }, ctx()), columns);
    });

    it('returns undefined when the property is absent', () => {
        assert.equal(JsonToSchema.fromTableColumns({}, ctx()), undefined);
    });

    it('returns undefined when the value is not an array', () => {
        assert.equal(JsonToSchema.fromTableColumns({ tableColumns: 'nonsense' }, ctx()), undefined);
        assert.equal(JsonToSchema.fromTableColumns({ tableColumns: 5 }, ctx()), undefined);
        assert.equal(JsonToSchema.fromTableColumns({ tableColumns: null }, ctx()), undefined);
    });

    it('returns an empty list for an empty array', () => {
        assert.deepEqual(JsonToSchema.fromTableColumns({ tableColumns: [] }, ctx()), []);
    });

    it('keeps only name and key, dropping anything else on an entry', () => {
        const result = JsonToSchema.fromTableColumns(
            { tableColumns: [{ name: 'Year', key: 'year', extra: 'ignored' }] },
            ctx()
        );

        assert.deepEqual(result, [{ name: 'Year', key: 'year' }]);
    });

    it('rejects an entry with a missing key through the json error mechanism', () => {
        assert.throws(
            () => JsonToSchema.fromTableColumns({ tableColumns: [{ name: 'Year' }] }, ctx()),
            /required/i
        );
    });

    it('rejects an entry with a missing name', () => {
        assert.throws(
            () => JsonToSchema.fromTableColumns({ tableColumns: [{ key: 'year' }] }, ctx()),
            /required/i
        );
    });

    it('names the offending column in the error path', () => {
        assert.throws(
            () => JsonToSchema.fromTableColumns(
                { tableColumns: [{ name: 'Year', key: 'year' }, { name: 'Second' }] },
                ctx()
            ),
            /\[1\]/
        );
    });
});

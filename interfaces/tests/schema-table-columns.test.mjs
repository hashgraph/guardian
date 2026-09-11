import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const URL = 'ctx:#u-1&1.0.0';

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

const roundTrip = (field) => {
    const property = SchemaHelper.buildField(field, field.name, URL);
    return {
        property,
        parsed: SchemaHelper.parseField(field.name, property, !!field.required, URL),
    };
};

describe('tableColumns survives the buildField / parseField round trip', () => {
    it('keeps the same names and keys in the same order', () => {
        const columns = [
            { name: 'Year', key: 'year' },
            { name: 'CO2 (tonnes)', key: 'co2_tonnes' },
        ];

        const { parsed } = roundTrip(tableField({ tableColumns: columns }));

        assert.deepEqual(parsed.tableColumns, columns);
    });

    it('writes the columns inside $comment and not as a property keyword', () => {
        const { property } = roundTrip(tableField({
            tableColumns: [{ name: 'Year', key: 'year' }],
        }));

        assert.equal(property.tableColumns, undefined);
        assert.deepEqual(
            JSON.parse(property.$comment).tableColumns,
            [{ name: 'Year', key: 'year' }]
        );
    });

    it('leaves tableColumns absent when the field never declared any', () => {
        const { property, parsed } = roundTrip(tableField());

        assert.equal(JSON.parse(property.$comment).tableColumns, undefined);
        assert.equal(parsed.tableColumns, undefined);
    });

    it('does not write an empty array into the comment', () => {
        const { property, parsed } = roundTrip(tableField({ tableColumns: [] }));

        assert.equal(JSON.parse(property.$comment).tableColumns, undefined);
        assert.equal(parsed.tableColumns, undefined);
    });

    it('preserves the declared order rather than sorting it', () => {
        const columns = [
            { name: 'Zulu', key: 'z' },
            { name: 'Alpha', key: 'a' },
            { name: 'Mike', key: 'm' },
        ];

        const { parsed } = roundTrip(tableField({ tableColumns: columns }));

        assert.deepEqual(parsed.tableColumns.map((column) => column.key), ['z', 'a', 'm']);
    });

    it('does not throw on an entry with a missing key', () => {
        const { parsed } = roundTrip(tableField({
            tableColumns: [{ name: 'Year' }],
        }));

        assert.deepEqual(parsed.tableColumns, [{ name: 'Year' }]);
    });

    it('leaves a non-table field untouched', () => {
        const { parsed } = roundTrip({
            name: 'note',
            title: 'Note',
            description: 'A note',
            type: 'string',
            isRef: false,
            isArray: false,
            required: false,
            readOnly: false,
        });

        assert.equal(parsed.tableColumns, undefined);
    });
});

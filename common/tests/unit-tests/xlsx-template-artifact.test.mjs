import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';

const TEMPLATE = fileURLToPath(
    new URL('../../../guardian-service/artifacts/template.xlsx', import.meta.url)
);

function findByCustomType(fields, customType) {
    return fields.find((field) => field.customType === customType);
}

describe('Schema template artifact', () => {
    let result;
    let fields;

    before(async () => {
        result = await XlsxToJson.parse(await readFile(TEMPLATE));
        fields = result.xlsxSchemas.flatMap((schema) => schema.fields);
    });

    it('parses with no errors', () => {
        assert.deepEqual(result.toJson().errors, []);
    });

    it('shows a Table field with its declared columns', () => {
        const field = findByCustomType(fields, 'table');
        assert.ok(field, 'the template has no Table example');
        assert.deepEqual(field.tableColumns, [
            { name: 'Year', key: 'year' },
            { name: 'Amount', key: 'amount' }
        ]);
    });

    it('shows a Rich Text field', () => {
        assert.ok(
            findByCustomType(fields, 'richText'),
            'the template has no Rich Text example'
        );
    });

    it('shows the geographic chain, linked parent to child', () => {
        const continent = findByCustomType(fields, 'continent');
        const country = findByCustomType(fields, 'country');
        const state = findByCustomType(fields, 'state');

        assert.ok(continent, 'the template has no Continent example');
        assert.ok(country, 'the template has no Country example');
        assert.ok(state, 'the template has no State/Province example');

        assert.deepEqual(country.dependency, { on: continent.name, kind: 'geo' });
        assert.deepEqual(state.dependency, { on: country.name, kind: 'geo' });
    });

    it('keeps the Prefix and Postfix units, which live in the cell format', () => {
        const units = fields.map((field) => field.unit).filter(Boolean);
        assert.ok(units.includes('$'), 'the Prefix unit was lost');
        assert.ok(units.includes('kg'), 'the Postfix unit was lost');
    });

    it('keeps two levels of sub-schema nesting, which live in the row grouping', () => {
        const nested = fields.filter(
            (field) => field.isRef && Array.isArray(field.fields) && field.fields.length
        );
        assert.ok(nested.length, 'no nested sub-schema fields — the row grouping was lost');

        const twoLevels = nested.some((field) =>
            field.fields.some(
                (child) =>
                    child.isRef && Array.isArray(child.fields) && child.fields.length
            )
        );
        assert.ok(twoLevels, 'the second level of sub-schema nesting was lost');
    });
});

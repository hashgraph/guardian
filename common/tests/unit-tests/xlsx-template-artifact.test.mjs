import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';
import { Workbook } from '../../dist/xlsx/models/workbook.js';

const TEMPLATE = fileURLToPath(
    new URL('../../../guardian-service/artifacts/template.xlsx', import.meta.url)
);

function findByCustomType(fields, customType) {
    return fields.find((field) => field.customType === customType);
}

describe('Schema template artifact', () => {
    let result;
    let fields;
    let workbook;

    before(async () => {
        const template = await readFile(TEMPLATE);
        result = await XlsxToJson.parse(template);
        fields = result.xlsxSchemas.flatMap((schema) => schema.fields);
        workbook = new Workbook();
        await workbook.read(template);
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

    it('documents that Enum fields reference Enum Name through Parameter', () => {
        const readme = workbook.getWorksheet('README');
        assert.equal(
            readme.getValue(2, 20),
            'Type-dependent: enum name (Enum), unit symbol (Prefix/Postfix), regex (Pattern), math expression (Auto-Calculate), JSON font object (Help Text), JSON column array (Table), parent field key (Country, State/Province). Blank for all other types.'
        );
        assert.equal(
            readme.getValue(3, 49),
            'Enum name, e.g. "Enum field 1"'
        );
        assert.equal(
            readme.getValue(2, 49),
            'Dropdown list — values defined in the Enums tab. The field\'s Parameter must exactly match the "Enum Name" column — case-sensitive.'
        );
        assert.equal(
            readme.getValue(2, 61),
            'The field\'s Parameter value must exactly match the "Enum Name" column in the Enums tab (case-sensitive).'
        );
        assert.equal(
            readme.getValue(2, 62),
            'In the Enums tab, the three columns are: Enum Name | Loaded to IPFS | Value'
        );
        assert.equal(
            readme.getValue(2, 63),
            'For the first value of each group: fill in Enum Name and Loaded to IPFS. Leave those two columns blank on subsequent value rows for the same group.'
        );
        assert.equal(
            readme.getValue(2, 89),
            'Enum matching is case-sensitive: a field\'s Parameter value must match the "Enum Name" column in the Enums tab exactly.'
        );
    });

    it('keeps the Enums tab to the three columns the parser reads', () => {
        const enums = workbook.getWorksheet('Enums');
        assert.equal(enums.getValue(1, 1), 'Enum Name');
        assert.equal(enums.getValue(2, 1), 'Loaded to IPFS');
        assert.equal(enums.getValue(3, 1), 'Value');
        assert.ok(
            !enums.getValue(4, 1),
            'a fourth Enums column is back — the parser reads three headers only'
        );
    });

    it('still resolves both example enums after the column was dropped', () => {
        const options = fields
            .filter((field) => Array.isArray(field.enum) && field.enum.length)
            .map((field) => field.enum);
        assert.equal(options.length, 2, 'the template no longer has two Enum examples');
        assert.deepEqual(
            options.map((list) => [...list].sort()).sort((a, b) => a.length - b.length),
            [
                ['Option 1', 'Option 2'],
                ['Option 1', 'Option 2', 'Option 3']
            ]
        );
    });

    it('labels the example fields the way a form would', () => {
        const descriptions = fields.map((field) => field.description);
        assert.ok(descriptions.includes('Enter a number'), 'the Number example still repeats its type name');
        assert.ok(descriptions.includes('Upload an image'), 'the Image example still repeats its type name');
        assert.equal(findByCustomType(fields, 'continent').description, 'Choose a continent');
        assert.equal(findByCustomType(fields, 'table').description, 'Upload a table');
        assert.equal(findByCustomType(fields, 'richText').description, 'Enter formatted text');
    });
});

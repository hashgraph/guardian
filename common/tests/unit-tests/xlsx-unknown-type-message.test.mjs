import assert from 'node:assert/strict';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';
import { XlsxResult } from '../../dist/xlsx/models/xlsx-result.js';
import { Table } from '../../dist/xlsx/models/table.js';
import { Dictionary } from '../../dist/xlsx/models/dictionary.js';
import { Workbook } from '../../dist/xlsx/models/workbook.js';
import { FieldTypes } from '../../dist/xlsx/models/dictionary.js';

const ROW = 5;

function readRowWithEmptyType() {
    const workbook = new Workbook();
    const worksheet = workbook.createWorksheet('Schema');
    const table = new Table({ c: 1, r: 1 });
    table.setDefault(false);

    worksheet.setValue('some_key', table.getCol(Dictionary.KEY), ROW);
    worksheet.setValue('A description', table.getCol(Dictionary.QUESTION), ROW);

    const result = new XlsxResult();
    XlsxToJson.readField(worksheet, table, ROW, result);
    return result.toJson().errors;
}

describe('XlsxToJson unknown field type message', () => {
    it('reports an error when the Field Type cell is empty', () => {
        const errors = readRowWithEmptyType();
        assert.equal(errors.length, 1);
        assert.equal(errors[0].type, 'error');
    });

    it('lists Rich Text among the supported types', () => {
        const [error] = readRowWithEmptyType();
        assert.ok(
            error.message.includes('Rich Text'),
            `Rich Text missing from: ${error.message}`
        );
    });

    it('lists every selectable field type the Excel dictionary carries', () => {
        const [error] = readRowWithEmptyType();
        const missing = FieldTypes.default
            .filter((type) => !type.hidden)
            .map((type) => type.name)
            .filter((name) => !error.message.includes(name));
        assert.deepEqual(missing, [], `types missing from the message: ${missing.join(', ')}`);
    });
});

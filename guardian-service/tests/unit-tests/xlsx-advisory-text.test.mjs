import assert from 'node:assert/strict';
import { SchemaEntity, IwaVersion } from '@guardian/interfaces';
import { JsonToXlsx } from '../../dist/xlsx/json-to-xlsx.js';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';
import { XlsxResult } from '../../dist/xlsx/models/xlsx-result.js';
import { Workbook } from '../../dist/xlsx/models/workbook.js';
import { Table } from '../../dist/xlsx/models/table.js';
import { Dictionary } from '../../dist/xlsx/models/dictionary.js';

function exportSheet(text, extra = {}) {
    const workbook = new Workbook();
    const worksheet = workbook.createWorksheet('Advisory');
    const schema = { name: 'Advisory', description: 'Example', entity: SchemaEntity.VC, iwaVersion: IwaVersion.V1, conditions: [], fields: [{
        name: 'project', title: 'Project', description: 'Project', type: 'string', required: false, isArray: false, isRef: false,
        order: 1, ...extra, advisoryText: text,
    }] };
    JsonToXlsx.writeSchema(worksheet, schema, null, new Map(), new Map(), new Map());
    const table = new Table({ c: 1, r: 1 });
    table.setDefault(false);
    return { workbook, worksheet, table };
}

async function read(workbook) {
    const imported = new Workbook();
    await imported.read(await workbook.write());
    const result = new XlsxResult();
    const schema = await XlsxToJson.readSchemaSheet(imported.getWorksheet('Advisory'), result, new Map());
    assert.deepEqual(result.toJson().errors, []);
    return schema.fields.find(f => f.name === 'project');
}

describe('Advisory Text workbook column', () => {
    it('exports the last column and keeps multiline plain text through import', async () => {
        const text = 'Use Project Hub\n<b>Plain text</b>';
        const { workbook, worksheet, table } = exportSheet(text);
        assert.equal(table.getCol(Dictionary.ADVISORY_TEXT), table.getCol(Dictionary.REPEATABLE_LINKS) + 1);
        assert.equal(worksheet.getValue(table.getCol(Dictionary.ADVISORY_TEXT), 7), text);
        assert.equal((await read(workbook)).advisoryText, text);
    });

    for (const text of ['', '  \t\n ']) {
        it(`ignores empty imported cells ${JSON.stringify(text)}`, async () => {
            const { workbook, worksheet, table } = exportSheet('Hint');
            worksheet.setValue(text, table.getCol(Dictionary.ADVISORY_TEXT), 7);
            assert.equal((await read(workbook)).advisoryText, undefined);
        });
    }

    it('accepts an older workbook without the optional header', async () => {
        const { workbook, worksheet, table } = exportSheet('Hint');
        worksheet.setValue('', table.getCol(Dictionary.ADVISORY_TEXT), 6);
        worksheet.setValue('', table.getCol(Dictionary.ADVISORY_TEXT), 7);
        assert.equal((await read(workbook)).advisoryText, undefined);
    });

    it('trims nonempty imported guidance', async () => {
        const { workbook, worksheet, table } = exportSheet('Hint');
        worksheet.setValue('  Guidance  ', table.getCol(Dictionary.ADVISORY_TEXT), 7);
        assert.equal((await read(workbook)).advisoryText, 'Guidance');
    });
    const excluded = [
        { label: 'Help Text', field: { type: 'null' } },
        { label: 'Sub-Schema', field: { type: '#InlineAdvisoryChild', customType: 'subSchema', isRef: true, conditions: [],
            fields: [{ name: 'inner', title: 'Inner', description: 'Inner', type: 'string', required: false, isArray: false, isRef: false }] } },
        { label: 'Auto-Calculate visibility', field: { type: 'number', autocalculate: true, expression: '1 + 1' } },
        { label: 'legacy Auto-Calculate type', field: { type: 'number', expression: '1 + 1' }, legacy: true },
    ];
    for (const { label, field, legacy } of excluded) {
        it(`ignores guidance on a ${label} row`, async () => {
            const { workbook, worksheet, table } = exportSheet('Hidden guidance', field);
            if (legacy) {
                worksheet.setValue('Auto-Calculate', table.getCol(Dictionary.FIELD_TYPE), 7);
                worksheet.setValue('1 + 1', table.getCol(Dictionary.PARAMETER), 7);
            }
            const imported = await read(workbook);
            assert.ok(imported, 'the excluded field still imports');
            assert.equal(Object.hasOwn(imported, 'advisoryText'), false);
            assert.equal(imported.advisoryText, undefined);
        });
    }

    it('retains guidance on a supported GeoJSON reference', async () => {
        const { workbook } = exportSheet('Visible guidance', { isRef: true, customType: 'geo', type: '#GeoJSON' });
        assert.equal((await read(workbook)).advisoryText, 'Visible guidance');
    });

    it('retains guidance on a hidden input that is not auto-calculated', async () => {
        const { workbook } = exportSheet('Visible when enabled', { hidden: true });
        assert.equal((await read(workbook)).advisoryText, 'Visible when enabled');
    });

});

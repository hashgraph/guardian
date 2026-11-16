import assert from 'node:assert/strict';
import { IwaVersion, SchemaEntity } from '@guardian/interfaces';
import { SchemaHelper } from '../../../interfaces/dist/helpers/schema-helper.js';
import { JsonToXlsx } from '../../dist/xlsx/json-to-xlsx.js';
import { XlsxToJson } from '../../dist/xlsx/xlsx-to-json.js';
import { XlsxResult } from '../../dist/xlsx/models/xlsx-result.js';
import { Workbook } from '../../dist/xlsx/models/workbook.js';
import { Dictionary } from '../../dist/xlsx/models/dictionary.js';
import { Table } from '../../dist/xlsx/models/table.js';

const readSchemaSheet = (...args) => XlsxToJson['readSchemaSheet'](...args);

const table = new Table({ c: 1, r: 1 });
table.setDefault(false);
const KEY = table.getCol(Dictionary.KEY);
const VISIBILITY = table.getCol(Dictionary.VISIBILITY);

function field(name, extra = {}) {
    return {
        name, title: name, description: name, required: false, isArray: false, isRef: false,
        readOnly: false, hidden: false, isUpdatable: false, type: 'string', format: undefined,
        pattern: undefined, unit: undefined, unitSystem: undefined, customType: undefined,
        property: undefined, order: 1, ...extra
    };
}

const trigger = () => field('kind');
const detail = () => field('detail', { required: true });
const list = (isArray) => field('list', {
    isRef: true, isArray, type: '#item', customType: 'subSchema', fields: [detail()], conditions: []
});

function makeSchema(isArray) {
    const kind = trigger();
    return {
        name: 'Targets', description: 'd', entity: SchemaEntity.NONE, iwaVersion: IwaVersion.V1,
        arrayDependencies: [],
        fields: [kind, list(isArray)],
        conditions: [{
            ifCondition: { field: kind, fieldValue: 'full' },
            thenFields: [],
            elseFields: [],
            thenTargets: [{ field: detail(), fieldPath: ['list', 'detail'] }],
        }],
        document: {}
    };
}

function write(schema) {
    const workbook = new Workbook();
    const worksheet = workbook.createWorksheet('Targets');
    JsonToXlsx.writeSchema(worksheet, schema, null, new Map(), new Map(), new Map());
    return { workbook, worksheet };
}

function rowsOf(worksheet) {
    const rows = new Map();
    const parents = [];
    const range = worksheet.getRange();
    for (let row = 7; row < range.e.r; row++) {
        const key = worksheet.getValue(KEY, row);
        if (!key) {
            continue;
        }
        const level = worksheet.getRow(row).getOutline() || 0;
        parents.length = level;
        parents[level] = key;
        rows.set(parents.slice(0, level + 1).join('.'), row);
    }
    return rows;
}

async function read(workbook) {
    const buffer = await workbook.write();
    const readWorkbook = new Workbook();
    await readWorkbook.read(buffer);
    const xlsxResult = new XlsxResult();
    const result = await readSchemaSheet(readWorkbook.getWorksheet('Targets'), xlsxResult, new Map());
    return { result, errors: xlsxResult.toJson().errors };
}

describe('Cross-schema targets inside a repeatable sub-schema in the Excel schema sheet', () => {
    for (const isArray of [false, true]) {
        const label = isArray ? 'repeatable' : 'single';

        it(`writes the condition on the child row of a ${label} sub-schema`, () => {
            const { worksheet } = write(makeSchema(isArray));
            const rows = rowsOf(worksheet);
            const formula = worksheet.getCell(VISIBILITY, rows.get('list.detail')).getFormulae();
            assert.match(formula, /^EXACT\(.+,"full"\)$/);
        });

        it(`reads the ${label} target back with its full path`, async () => {
            const { workbook } = write(makeSchema(isArray));
            const { result, errors } = await read(workbook);
            assert.deepEqual(errors, []);
            const [condition] = result.schema.conditions;
            assert.deepEqual(condition.thenTargets.map((target) => target.fieldPath), [['list', 'detail']]);
        });
    }

    it('compiles an imported repeatable target under items and a single one without', async () => {
        const compile = async (isArray) => {
            const { workbook } = write(makeSchema(isArray));
            const { result } = await read(workbook);
            const { fields, conditions } = result.schema;
            return SchemaHelper.buildDocument(
                { uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' },
                fields,
                conditions
            ).allOf[0].then.properties.list;
        };

        assert.deepEqual(await compile(true), { items: { required: ['detail'] } });
        assert.deepEqual(await compile(false), { required: ['detail'] });
    });
});

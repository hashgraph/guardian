import assert from 'node:assert/strict';
import { IwaVersion, SchemaEntity } from '@guardian/interfaces';
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
const LINKS = table.getCol(Dictionary.REPEATABLE_LINKS);

function field(name, extra = {}) {
    return {
        name, title: name, description: name, required: false, isArray: false, isRef: false,
        readOnly: false, hidden: false, isUpdatable: false, type: 'string', format: undefined,
        pattern: undefined, unit: undefined, unitSystem: undefined, customType: undefined,
        property: undefined, order: 1, ...extra
    };
}

function sub(name, type, fields, isArray = true) {
    return field(name, { isRef: true, isArray, type, customType: 'subSchema', fields, conditions: [] });
}

const locations = () => sub('locations', '#location', [field('name'), field('area')]);
const instances = () => sub('instances', '#instance', [field('locationName'), field('approach')]);

const rootLinks = [
    { on: ['locations'], field: ['instances'], kind: 'array', title: ['name'],
        valueMappings: [{ source: ['name'], target: ['locationName'] }] },
    { on: ['instances'], field: ['reports'], kind: 'array' }
];
const sectionLinks = [{ on: ['locations'], field: ['instances'], kind: 'array', title: ['name'] }];

function makeSchema(arrayDependencies = rootLinks, sectionDependencies = sectionLinks) {
    return {
        name: 'Links', description: 'd', entity: SchemaEntity.NONE, iwaVersion: IwaVersion.V1, conditions: [],
        arrayDependencies,
        fields: [
            locations(),
            instances(),
            sub('reports', '#report', [field('label')]),
            sub('section', '#section', [locations(), instances()], false)
        ],
        document: {
            $defs: { '#section': { $comment: JSON.stringify({ arrayDependencies: sectionDependencies }) } }
        }
    };
}

function write(schema = makeSchema()) {
    const workbook = new Workbook();
    const worksheet = workbook.createWorksheet('Links');
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

const cell = (worksheet, row) => worksheet.getCell(LINKS, row);
const ref = (row) => `A${row}`;
const isEmpty = (worksheet, row) => !cell(worksheet, row).isFormulae() && !cell(worksheet, row).isValue();

async function read(workbook) {
    const buffer = await workbook.write();
    const readWorkbook = new Workbook();
    await readWorkbook.read(buffer);
    const xlsxResult = new XlsxResult();
    const result = await readSchemaSheet(readWorkbook.getWorksheet('Links'), xlsxResult, new Map());
    return { result, errors: xlsxResult.toJson().errors };
}

describe('Repeatable links in the Excel schema sheet', () => {
    it('keeps Repeatable Links immediately before Advisory Text', () => {
        const columns = Array.from(table.fieldHeaders).map(header => header.column);
        assert.equal(KEY, 1);
        assert.equal(LINKS + 1, Math.max(...columns));
        assert.equal(table.getCol(Dictionary.ADVISORY_TEXT), LINKS + 1);
        assert.equal(table.getCol(Dictionary.IWA_PROPERTY), LINKS - 1);
    });

    it('writes each link on the receiving row as a reference to the giving Key cell', () => {
        const { worksheet } = write();
        const rows = rowsOf(worksheet);
        assert.equal(cell(worksheet, rows.get('instances')).getFormulae(),
            `${ref(rows.get('locations'))}&" | "&${ref(rows.get('locations.name'))}`);
        assert.equal(cell(worksheet, rows.get('instances.locationName')).getFormulae(), ref(rows.get('locations.name')));
        assert.equal(cell(worksheet, rows.get('reports')).getFormulae(), ref(rows.get('instances')));
        assert.equal(cell(worksheet, rows.get('section.instances')).getFormulae(),
            `${ref(rows.get('section.locations'))}&" | "&${ref(rows.get('section.locations.name'))}`);
        for (const path of ['locations', 'locations.name', 'locations.area', 'instances.approach', 'reports.label', 'section']) {
            assert.ok(isEmpty(worksheet, rows.get(path)), path);
        }
    });

    it('reads every link of the sheet back as a link of the sheet schema, nested ones with full paths', async () => {
        const { workbook } = write();
        const { result, errors } = await read(workbook);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.schema.arrayDependencies, [
            ...rootLinks,
            { on: ['section', 'locations'], field: ['section', 'instances'], kind: 'array', title: ['name'] }
        ]);
    });

    it('writes identical parent and nested copies once on a worksheet', async () => {
        const parentLink = { on: ['section', 'locations'], field: ['section', 'instances'], kind: 'array', title: ['name'] };
        const { workbook } = write(makeSchema([parentLink]));
        const { result, errors } = await read(workbook);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.schema.arrayDependencies, [parentLink]);
    });

    it('imports a sheet without the column with no links and no error', async () => {
        const { workbook, worksheet } = write(makeSchema([], []));
        worksheet.setValue(null, LINKS, 6);
        const { result, errors } = await read(workbook);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.schema.arrayDependencies, []);
    });

    it('skips a link whose giving field is not on the sheet and writes the others', () => {
        const { worksheet } = write(makeSchema([
            { on: ['missing'], field: ['instances'], kind: 'array' },
            { on: ['instances'], field: ['reports'], kind: 'array' }
        ], []));
        const rows = rowsOf(worksheet);
        assert.ok(isEmpty(worksheet, rows.get('instances')));
        assert.equal(cell(worksheet, rows.get('reports')).getFormulae(), ref(rows.get('instances')));
    });

    it('skips a link whose display name field is not on the sheet', () => {
        const { worksheet } = write(makeSchema([
            { on: ['locations'], field: ['instances'], kind: 'array', title: ['missing'],
                valueMappings: [{ source: ['name'], target: ['locationName'] }] }
        ], []));
        const rows = rowsOf(worksheet);
        assert.ok(isEmpty(worksheet, rows.get('instances')));
        assert.ok(isEmpty(worksheet, rows.get('instances.locationName')));
    });

    it('skips only a copied value whose source field is not on the sheet', async () => {
        const { workbook, worksheet } = write(makeSchema([
            { on: ['locations'], field: ['instances'], kind: 'array', title: ['name'], valueMappings: [
                { source: ['missing'], target: ['locationName'] },
                { source: ['area'], target: ['approach'] }
            ] }
        ], []));
        const rows = rowsOf(worksheet);
        assert.equal(cell(worksheet, rows.get('instances')).getFormulae(),
            `${ref(rows.get('locations'))}&" | "&${ref(rows.get('locations.name'))}`);
        assert.ok(isEmpty(worksheet, rows.get('instances.locationName')));
        assert.equal(cell(worksheet, rows.get('instances.approach')).getFormulae(), ref(rows.get('locations.area')));
        const { result, errors } = await read(workbook);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.schema.arrayDependencies, [{ on: ['locations'], field: ['instances'], kind: 'array',
            title: ['name'], valueMappings: [{ source: ['area'], target: ['approach'] }] }]);
    });

    it('skips a link whose receiving field is not on the sheet', () => {
        const { worksheet } = write(makeSchema([{ on: ['locations'], field: ['missing'], kind: 'array' }], []));
        const rows = rowsOf(worksheet);
        for (const row of rows.values()) {
            assert.ok(isEmpty(worksheet, row));
        }
    });

    const invalid = [
        ['an unreadable formula', (rows) => ['instances', 'SUM(A1)'], /cannot be read/],
        ['a reference to an empty row', (rows) => ['instances', 'A999'], /row with no field/],
        ['a source that is not repeatable', (rows) => ['instances', `A${rows.get('locations.name')}`], /not a repeatable field/],
        ['a display name outside the source', (rows) => ['instances', `A${rows.get('locations')}&" | "&A${rows.get('reports.label')}`], /display name/],
        ['a copied value outside a linked entry', (rows) => ['locations.area', `A${rows.get('locations.name')}`], /inside a linked entry/],
        ['a copied value from outside the source', (rows) => ['instances.approach', `A${rows.get('reports.label')}`], /copied value/]
    ];
    for (const [name, edit, reason] of invalid) {
        it(`reports ${name} on its row and imports the rest`, async () => {
            const { workbook, worksheet } = write(makeSchema(rootLinks, []));
            const rows = rowsOf(worksheet);
            const [path, formula] = edit(rows);
            cell(worksheet, rows.get(path)).setFormulae(formula);
            const { result, errors } = await read(workbook);
            assert.equal(errors.length, 1);
            assert.equal(errors[0].type, 'error');
            assert.equal(errors[0].row, rows.get(path));
            assert.match(errors[0].text, /^Invalid repeatable link on field/);
            assert.match(errors[0].message, new RegExp(`^Row ${rows.get(path)}: `));
            assert.match(errors[0].message, reason);
            assert.ok(result.schema.arrayDependencies.some(link => link.field.join('.') === 'reports'));
        });
    }

    it('reports every link of a cycle and drops them', async () => {
        const { workbook, worksheet } = write(makeSchema(rootLinks, []));
        const rows = rowsOf(worksheet);
        cell(worksheet, rows.get('locations')).setFormulae(`A${rows.get('reports')}`);
        const { result, errors } = await read(workbook);
        assert.equal(errors.length, 3);
        assert.ok(errors.every(error => /cycle/.test(error.message)));
        assert.deepEqual(result.schema.arrayDependencies, []);
    });
});

describe('resolved worksheet relationship conflicts', () => {
    async function imported(parentLink, childLink) {
        const workbook = new Workbook();
        const parent = makeSchema([parentLink, ...rootLinks], [childLink]);
        parent.fields.find(field => field.name === 'section').customType = '';
        const child = makeSchema([childLink], []);
        child.name = 'Section';
        child.fields = child.fields.filter(field => field.name !== 'section');
        const schemas = new Map([['#section', 'Section'], ['#location', 'Location'],
            ['#instance', 'Instance'], ['#report', 'Report']]);
        for (const name of ['locations', 'instances', 'reports']) {
            const entry = child.fields.find(field => field.name === name);
            const entrySchema = { ...child, name: schemas.get(entry.type), fields: entry.fields,
                arrayDependencies: [] };
            JsonToXlsx.writeSchema(workbook.createWorksheet(entrySchema.name), entrySchema, null, schemas, new Map());
            entry.customType = '';
            parent.fields.find(field => field.name === name).customType = '';
            const nested = parent.fields.find(field => field.name === 'section').fields
                .find(field => field.name === name);
            if (nested) { nested.customType = ''; }
        }
        const parentSheet = workbook.createWorksheet('Links');
        JsonToXlsx.writeSchema(parentSheet, parent, null, schemas, new Map());
        if (!parentLink.valueMappings?.length) {
            const rows = rowsOf(parentSheet);
            cell(parentSheet, rows.get('section.instances.locationName')).setValue(null);
        }
        JsonToXlsx.writeSchema(workbook.createWorksheet('Section'), child, null, schemas, new Map());
        const result = await XlsxToJson.parse(await workbook.write(), { preview: true });
        result.updateSchemas();
        return result;
    }

    it('drops both competing declarations and their mappings with cell diagnostics', async () => {
        const child = { on: ['locations'], field: ['instances'], kind: 'array', title: ['name'],
            valueMappings: [{ source: ['name'], target: ['locationName'] }] };
        const parent = { on: ['section', 'locations'], field: ['section', 'instances'], kind: 'array' };
        const result = await imported(parent, child);
        const errors = result.toJson().errors.filter(error => /Conflicting repeatable/.test(error.text));
        assert.equal(errors.length, 2);
        assert.ok(errors.every(error => error.cell && /Both.*skipped/.test(error.message)));
        const root = result.schemas.find(schema => schema.name === 'Links');
        const section = result.schemas.find(schema => schema.name === 'Section');
        assert.deepEqual(root.arrayDependencies, rootLinks);
        assert.deepEqual(section.arrayDependencies, []);
        result.updateSchemas();
        assert.deepEqual(root.arrayDependencies, rootLinks);
        assert.deepEqual(section.arrayDependencies, []);
    });

    it('retains identical copies on both schemas', async () => {
        const child = { on: ['locations'], field: ['instances'], kind: 'array', title: ['name'] };
        const parent = { ...child, on: ['section', 'locations'], field: ['section', 'instances'] };
        const result = await imported(parent, child);
        assert.equal(result.toJson().errors.filter(error => /Conflicting repeatable/.test(error.text)).length, 0);
        assert.deepEqual(result.schemas.find(schema => schema.name === 'Links').arrayDependencies, [...rootLinks, parent]);
        assert.deepEqual(result.schemas.find(schema => schema.name === 'Section').arrayDependencies, [child]);
    });
});

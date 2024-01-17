import { Workbook, Worksheet } from './models/workbook';
import { Dictionary, FieldTypes } from './models/dictionary';
import { xlsxToBoolean, xlsxToFont, xlsxToUnit } from './models/value-converters';
import { Table } from './models/header-utils';
import * as mathjs from 'mathjs';
import { XlsxSchemaConditions } from './models/schema-condition';
import { Schema, SchemaField, SchemaHelper } from '@guardian/interfaces';

export class XlsxToJson {
    public static async parse(buffer: Buffer): Promise<Schema[]> {
        const workbook = new Workbook();
        await workbook.read(buffer)
        console.log('read');

        const schemas: Schema[] = [];
        const map = new Map<string, string>();
        const worksheets = workbook.getWorksheets();
        for (const worksheet of worksheets) {
            const schema = await XlsxToJson.parseSheet(worksheet);
            schemas.push(schema);
            map.set(worksheet.name, schema.iri);
            map.set(schema.name, schema.iri);
        }
        for (const schema of schemas) {
            for (const field of schema.fields) {
                if (field.isRef) {
                    field.type = map.get(field.type);
                }
            }
            schema.updateRefs(schemas);
        }
        return schemas;
    }

    public static async parseSheet(worksheet: Worksheet): Promise<Schema> {
        const schema: Schema = new Schema();
        schema.name = worksheet.name;
        const range = worksheet.getRange();
        const table = new Table(range.s);

        let col = range.s.c;
        let row = range.s.r;
        let title: any;

        title = worksheet.getValue<string>(col, row);
        if (table.isDescription(title)) {
            schema.name = title;
            row++;
        }

        title = worksheet.getValue<string>(col, row);
        if (table.isDescription(title)) {
            schema.description = title;
            row++;
        }

        for (let c = range.s.c; c < range.e.c; c++) {
            const value = worksheet.getValue<string>(c, row);
            if (table.isHeader(value)) {
                table.setCol(value, c);
            }
        }
        if (!table.check()) {
            throw Error('Invalid headers');
        }

        table.setEnd(range.e.c, row);

        row = table.end.r + 1;
        const fields: SchemaField[] = [];
        const fieldCache = new Map<string, SchemaField>();
        for (; row < range.e.r; row++) {
            const field: SchemaField = XlsxToJson.readField(
                worksheet,
                table,
                fieldCache,
                row
            );
            fields.push(field);
            fieldCache.set(field.name, field);
        }

        row = table.end.r + 1;
        const conditionCache: XlsxSchemaConditions[] = [];
        for (; row < range.e.r; row++) {
            const condition = XlsxToJson.readCondition(
                worksheet,
                table,
                fieldCache,
                conditionCache,
                row
            );
            if (condition) {
                conditionCache.push(condition);
            }
        }

        const conditions = conditionCache.map(c => c.toJson())
        schema.update(fields, conditions);
        SchemaHelper.updateIRI(schema);
        return schema;
    }

    public static checkFieldType(type: any): boolean {
        //Sub-Schema
        if (!type || type === Dictionary.SUB_SCHEMA) {
            return true;
        }
        //Field Schema
        if (type) {
            return false;
        }
        throw Error(`unknown type ${type}`);
    }

    public static readField(
        worksheet: Worksheet,
        table: Table,
        fieldCache: Map<string, SchemaField>,
        row: number
    ): SchemaField {
        const name = worksheet.getPath(table.getCol(Dictionary.ANSWER), row);
        const path = worksheet.getFullPath(table.getCol(Dictionary.ANSWER), row);
        const type = worksheet.getValue<string>(table.getCol(Dictionary.SCHEMA_TYPE), row);
        const description = worksheet.getValue<string>(table.getCol(Dictionary.QUESTION), row);
        const required = xlsxToBoolean(worksheet.getValue<string>(table.getCol(Dictionary.REQUIRED_FIELD), row));
        const isArray = xlsxToBoolean(worksheet.getValue<string>(table.getCol(Dictionary.ALLOW_MULTIPLE_ANSWERS), row));
        const param = worksheet.getValue<string>(table.getCol(Dictionary.PARAMETER), row);

        const field: SchemaField = {
            name,
            description,
            required,
            isArray,
            readOnly: false,
            hidden: false,
            type: null,
            format: null,
            pattern: null,
            unit: null,
            unitSystem: null,
            customType: null,
            property: null,
            isRef: null
        };
        const fieldType = FieldTypes.findByName(type);
        if (fieldType) {
            field.type = fieldType?.type;
            field.format = fieldType?.format;
            field.pattern = fieldType?.pattern;
            field.unit = fieldType?.unit;
            field.unitSystem = fieldType?.unitSystem;
            field.customType = fieldType?.customType;
            field.hidden = fieldType?.hidden;
            field.isRef = fieldType.isRef;
        } else {
            field.type = type;
            field.isRef = true;
        }

        if (fieldType.name === 'Prefix') {
            const format = worksheet
                .getCell(table.getCol(Dictionary.ANSWER), row)
                .getFormat();
            field.unit = xlsxToUnit(format);
        }
        if (fieldType.name === 'Postfix') {
            const format = worksheet
                .getCell(table.getCol(Dictionary.ANSWER), row)
                .getFormat();
            field.unit = xlsxToUnit(format);
        }
        if (fieldType.name === 'Enum') {
            field.enum = worksheet
                .getCell(table.getCol(Dictionary.ANSWER), row)
                .getList()
        }
        if (fieldType.name === 'Help Text') {
            const format = worksheet
                .getCell(table.getCol(Dictionary.QUESTION), row)
                .getFont();
            const font = xlsxToFont(format);
            field.font = font;
            field.textBold = font.bold;
            field.textColor = font.color;
            field.textSize = font.size;
        }

        if (param) {
            if (fieldType.name === 'Prefix') {
                field.unit = param;
            }
            if (fieldType.name === 'Postfix') {
                field.unit = param;
            }
            if (fieldType.name === 'Enum') {
                field.enum = param.split(/\r?\n/);
            }
            if (fieldType.name === 'Help Text') {
                const font = xlsxToFont(param);
                field.font = font;
                field.textBold = font.bold;
                field.textColor = font.color;
                field.textSize = font.size;
            }
        }

        //Formulae
        if (!field.isRef) {
            const answer = worksheet.getValue<string>(table.getCol(Dictionary.ANSWER), row);
            if (type === Dictionary.AUTO_CALCULATE) {
                // field.value = sheet.getFormulae(header.get(Dictionary.ANSWER), row);
            } else if (answer) {
                field.examples = [answer];
            }
        }

        return field;
    }

    public static readCondition(
        worksheet: Worksheet,
        table: Table,
        fieldCache: Map<string, SchemaField>,
        conditionCache: XlsxSchemaConditions[],
        row: number
    ): XlsxSchemaConditions | undefined {
        const name = worksheet.getPath(table.getCol(Dictionary.ANSWER), row);

        //visibility
        if (worksheet.outColumnRange(table.getCol(Dictionary.VISIBILITY))) {
            return;
        }
        const cell = worksheet.getCell(table.getCol(Dictionary.VISIBILITY), row);
        let result: any;
        if (cell.isFormulae()) {
            const formulae = cell.getFormulae();
            result = XlsxToJson.parseCondition(formulae);
        } else if (cell.isValue()) {
            result = XlsxToJson.parseCondition(xlsxToBoolean(cell.getValue<string>()));
        }

        if (!result) {
            return;
        }

        const field = fieldCache.get(name);
        if (result.type === 'const') {
            field.hidden = field.hidden || !result.value;
        } else {
            let condition = conditionCache.find(c => c.equal(result.field, result.value))
            if (!condition) {
                const target = fieldCache.get(result.field);
                condition = new XlsxSchemaConditions(target, result.value);
            }
            condition.addField(field, result.invert);
            return condition;
        }
    }

    private static parseCondition(formulae: string | boolean): {
        type: 'const' | 'formulae',
        value?: any,
        field?: string,
        invert?: boolean,
    } {
        try {
            //'TRUE'
            //'FALSE'
            if (formulae === 'TRUE' || formulae === true) {
                return { type: 'const', value: true }
            }
            if (formulae === 'FALSE' || formulae === false) {
                return { type: 'const', value: false }
            }
            //'EXACT(G11,10)'
            //'NOT(EXACT(G11,10))'
            //'EXACT(G11,"10")'
            //'NOT(EXACT(G11,"10"))'
            const parsFn = (tree: mathjs.MathNode, invert: boolean) => {
                if (tree.type === 'FunctionNode') {
                    if (tree.fn.name === 'EXACT' && tree.args.length === 2) {
                        if (
                            tree.args[0].type === 'SymbolNode' &&
                            tree.args[1].type === 'ConstantNode'
                        ) {
                            return {
                                field: tree.args[0].name,
                                value: tree.args[1].value,
                                invert
                            };
                        }
                        if (
                            tree.args[0].type === 'ConstantNode' &&
                            tree.args[1].type === 'SymbolNode'
                        ) {
                            return {
                                field: tree.args[0].value,
                                value: tree.args[1].name,
                                invert
                            };
                        }
                    }
                    if (tree.fn.name === 'NOT' && tree.args.length === 1) {
                        return parsFn(tree.args[0], true);
                    }
                }
                return null;
            }
            const tree = mathjs.parse(formulae);
            const node = parsFn(tree, false);
            return {
                type: 'formulae',
                field: node.field,
                value: node.value,
                invert: node.invert,
            }
        } catch (error) {
            throw Error(`Invalid condition ${formulae}`);
        }
    }
}

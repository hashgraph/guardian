import { Workbook, Worksheet } from './models/workbook';
import { Dictionary, FieldTypes, IFieldTypes } from './models/dictionary';
import { xlsxToArray, xlsxToBoolean, xlsxToEntity, xlsxToFont, xlsxToUnit } from './models/value-converters';
import { Table } from './models/header-utils';
import * as mathjs from 'mathjs';
import { XlsxSchemaConditions } from './models/schema-condition';
import { Schema, SchemaCondition, SchemaField, SchemaHelper } from '@guardian/interfaces';
import { XlsxError } from './models/error';

interface IResult {
    schemas?: Schema[];
    errors: XlsxError[];
}

export class XlsxToJson {
    public static async parse(buffer: Buffer): Promise<IResult> {
        try {
            const errors: XlsxError[] = [];
            const workbook = new Workbook();
            await workbook.read(buffer)
            const schemas: Schema[] = [];
            const map = new Map<string, string>();
            const worksheets = workbook.getWorksheets();
            for (const worksheet of worksheets) {
                const schema = await XlsxToJson.parseSheet(worksheet, errors);
                if (schema) {
                    schemas.push(schema);
                    map.set(worksheet.name, schema.iri);
                    map.set(schema.name, schema.iri);
                }
            }
            map.set('#GeoJSON', '#GeoJSON');
            for (const schema of schemas) {
                for (const field of schema.fields) {
                    if (field.isRef) {
                        field.type = map.get(field.type);
                    }
                }
                schema.updateRefs(schemas);
            }
            return { schemas, errors };
        } catch (error) {
            return {
                errors: [{
                    type: 'error',
                    text: 'Failed to parse file.',
                    message: error?.toString()
                }]
            };
        }
    }

    private static async parseSheet(
        worksheet: Worksheet,
        errors: XlsxError[]
    ): Promise<Schema | null> {
        const schema: Schema = new Schema();
        try {
            schema.name = worksheet.name;
            const range = worksheet.getRange();
            const table = new Table(range.s);

            const startCol = range.s.c;
            const endCol = range.e.c;
            const startRow = range.s.r;

            let row = startRow;

            for (; row < range.e.r; row++) {
                const title = worksheet.getValue<string>(startCol, row);
                if (row === startRow && table.isName(title)) {
                    table.setRow(Dictionary.SCHEMA_NAME, row);
                }
                if (table.isSchemaHeader(title)) {
                    table.setRow(title, row);
                }
                if (table.isFieldHeader(title)) {
                    break
                }
            }

            for (let col = startCol; col < endCol; col++) {
                const value = worksheet.getValue<string>(col, row);
                if (table.isFieldHeader(value)) {
                    table.setCol(value, col);
                }
            }

            const errorHeader = table.getErrorHeader();
            if (errorHeader) {
                XlsxToJson.addError(errors, {
                    type: 'error',
                    text: `Invalid headers. Header "${errorHeader.title}" not set.`,
                    message: `Invalid headers. Header "${errorHeader.title}" not set.`,
                    worksheet: worksheet.name
                }, schema)
                return schema;
            }

            table.setEnd(endCol, row);

            if (table.getRow(Dictionary.SCHEMA_NAME) !== -1) {
                schema.name = worksheet.getValue<string>(startCol, table.getRow(Dictionary.SCHEMA_NAME));
            }
            if (table.getRow(Dictionary.SCHEMA_DESCRIPTION) !== -1) {
                schema.description = worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.SCHEMA_DESCRIPTION));
            }
            if (table.getRow(Dictionary.SCHEMA_TYPE) !== -1) {
                schema.entity = xlsxToEntity(worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.SCHEMA_TYPE)));
            }

            row = table.end.r + 1;
            const fields: SchemaField[] = [];
            const fieldCache = new Map<string, SchemaField>();
            for (; row < range.e.r; row++) {
                const field: SchemaField = XlsxToJson.readField(worksheet, table, row, errors);
                if (field) {
                    fields.push(field);
                    fieldCache.set(field.name, field);
                }
            }

            row = table.end.r + 1;
            const conditionCache: XlsxSchemaConditions[] = [];
            for (; row < range.e.r; row++) {
                const condition = XlsxToJson.readCondition(
                    worksheet,
                    table,
                    fieldCache,
                    conditionCache,
                    row,
                    errors
                );
                if (condition) {
                    conditionCache.push(condition);
                }
            }

            const conditions = conditionCache.map(c => c.toJson())
            schema.update(fields, conditions);
            SchemaHelper.updateIRI(schema);
            return schema;
        } catch (error) {
            XlsxToJson.addError(errors, {
                type: 'error',
                text: 'Failed to parse sheet.',
                message: error?.toString(),
                worksheet: worksheet.name
            }, schema);
            return schema;
        }
    }

    private static readField(
        worksheet: Worksheet,
        table: Table,
        row: number,
        errors: XlsxError[]
    ): SchemaField {
        const field: SchemaField = {
            name: '',
            description: '',
            required: false,
            isArray: false,
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
        try {
            const name = worksheet.getPath(table.getCol(Dictionary.ANSWER), row);
            const path = worksheet.getFullPath(table.getCol(Dictionary.ANSWER), row);
            const type = worksheet.getValue<string>(table.getCol(Dictionary.FIELD_TYPE), row);
            const description = worksheet.getValue<string>(table.getCol(Dictionary.QUESTION), row);
            const required = xlsxToBoolean(worksheet.getValue<string>(table.getCol(Dictionary.REQUIRED_FIELD), row));
            const isArray = xlsxToBoolean(worksheet.getValue<string>(table.getCol(Dictionary.ALLOW_MULTIPLE_ANSWERS), row));

            field.name = name;
            field.description = description;
            field.required = required;
            field.isArray = isArray;

            const fieldType = FieldTypes.findByName(type);
            if (fieldType) {
                field.type = fieldType?.type;
                field.format = fieldType?.format;
                field.pattern = fieldType?.pattern;
                field.unit = fieldType?.unit;
                field.unitSystem = fieldType?.unitSystem;
                field.customType = fieldType?.customType;
                field.hidden = fieldType?.hidden;
                field.isRef = fieldType?.isRef;
                XlsxToJson.readFieldParams(
                    worksheet,
                    table,
                    field,
                    fieldType,
                    row,
                    errors
                );
            } else if (type) {
                field.type = type;
                field.isRef = true;
            } else {
                XlsxToJson.addError(errors, {
                    type: 'error',
                    text: 'Unknown field type.',
                    message: 'Unknown field type.',
                    worksheet: worksheet.name,
                    cell: worksheet.getPath(table.getCol(Dictionary.FIELD_TYPE), row),
                    row: row,
                    col: table.getCol(Dictionary.FIELD_TYPE),
                }, field);
            }

            //Formulae
            if (!field.isRef) {
                const answer = worksheet.getValue<string>(table.getCol(Dictionary.ANSWER), row);
                if (type === Dictionary.AUTO_CALCULATE) {
                    // field.value = sheet.getFormulae(header.get(Dictionary.ANSWER), row);
                } else if (answer) {
                    field.examples = xlsxToArray(answer, field.isArray);
                }
            }

            return field;
        } catch (error) {
            XlsxToJson.addError(errors, {
                type: 'error',
                text: 'Failed to parse field.',
                message: error?.toString(),
                worksheet: worksheet.name,
                row: row
            }, field);
            return null;
        }
    }

    private static readFieldParams(
        worksheet: Worksheet,
        table: Table,
        field: SchemaField,
        fieldType: IFieldTypes,
        row: number,
        errors: XlsxError[]
    ): void {
        try {
            const param = worksheet.getValue<string>(table.getCol(Dictionary.PARAMETER), row);

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
        } catch (error) {
            XlsxToJson.addError(errors, {
                type: 'error',
                text: 'Failed to parse params.',
                message: error?.toString(),
                worksheet: worksheet.name,
                row: row
            }, field);
        }
    }

    private static readCondition(
        worksheet: Worksheet,
        table: Table,
        fieldCache: Map<string, SchemaField>,
        conditionCache: XlsxSchemaConditions[],
        row: number,
        errors: XlsxError[]
    ): XlsxSchemaConditions | undefined {
        const name = worksheet.getPath(table.getCol(Dictionary.ANSWER), row);
        const field = fieldCache.get(name);

        try {
            //visibility
            if (worksheet.outColumnRange(table.getCol(Dictionary.VISIBILITY))) {
                return;
            }
            const cell = worksheet.getCell(table.getCol(Dictionary.VISIBILITY), row);
            let result: any;

            try {
                if (cell.isFormulae()) {
                    result = XlsxToJson.parseCondition(cell.getFormulae());
                } else if (cell.isValue()) {
                    result = XlsxToJson.parseCondition(xlsxToBoolean(cell.getValue<string>()));
                }
            } catch (error) {
                XlsxToJson.addError(errors, {
                    type: 'error',
                    text: `Failed to parse condition.`,
                    message: error?.toString(),
                    worksheet: worksheet.name,
                    cell: worksheet.getPath(table.getCol(Dictionary.VISIBILITY), row),
                    row: row,
                    col: table.getCol(Dictionary.VISIBILITY),
                }, field);
            }

            if (!result) {
                return;
            }

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
        } catch (error) {
            XlsxToJson.addError(errors, {
                type: 'error',
                text: 'Failed to parse condition.',
                message: error?.toString(),
                worksheet: worksheet.name,
                cell: worksheet.getPath(table.getCol(Dictionary.VISIBILITY), row),
                row: row,
                col: table.getCol(Dictionary.VISIBILITY),
            }, field);
            return;
        }
    }

    private static parseCondition(formulae: string | boolean): {
        type: 'const' | 'formulae',
        value?: any,
        field?: string,
        invert?: boolean,
    } {
        if (formulae === '') {
            return null;
        }
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
        if (node) {
            return {
                type: 'formulae',
                field: node.field,
                value: node.value,
                invert: node.invert,
            }
        } else {
            throw new Error(`Failed to parse formulae: ${formulae}.`)
        }
    }

    public static addError(
        errors: XlsxError[],
        error: XlsxError,
        target: SchemaField | Schema | SchemaCondition
    ) {
        errors.push(error);
        if (target.errors) {
            target.errors.push(error);
        } else {
            target.errors = [error];
        }
    }
}

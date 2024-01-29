import { Workbook, Worksheet } from './models/workbook';
import { Dictionary, FieldTypes, IFieldTypes } from './models/dictionary';
import { xlsxToArray, xlsxToBoolean, xlsxToEntity, xlsxToFont, xlsxToUnit } from './models/value-converters';
import { Table } from './models/table';
import * as mathjs from 'mathjs';
import { XlsxSchemaConditions } from './models/schema-condition';
import { Schema, SchemaCategory, SchemaField, SchemaHelper } from '@guardian/interfaces';
import { XlsxResult } from './models/xlsx-result';
import { XlsxEnum } from './models/xlsx-enum';
import { EnumTable } from './models/enum-table';

export class XlsxToJson {
    public static async parse(buffer: Buffer): Promise<XlsxResult> {
        const xlsxResult = new XlsxResult();
        try {
            const workbook = new Workbook();
            await workbook.read(buffer)
            const worksheets = workbook.getWorksheets();

            for (const worksheet of worksheets) {
                if (XlsxToJson.isEnum(worksheet)) {
                    const item = await XlsxToJson.readEnumSheet(worksheet, xlsxResult);
                    if (item) {
                        xlsxResult.addEnum(item);
                    }
                }
            }

            for (const worksheet of worksheets) {
                if (XlsxToJson.isSchema(worksheet)) {
                    const schema = await XlsxToJson.readSchemaSheet(worksheet, xlsxResult);
                    if (schema) {
                        if (schema.category === SchemaCategory.TOOL) {
                            xlsxResult.addTool(worksheet, schema.name, schema.messageId);
                        } else {
                            xlsxResult.addSchema(worksheet, schema.name, schema);
                        }
                    }
                }
            }

            return xlsxResult;
        } catch (error) {
            xlsxResult.addError({
                type: 'error',
                text: 'Failed to parse file.',
                message: error?.toString()
            }, null);
            xlsxResult.clear();
            return xlsxResult;
        }
    }

    private static isEnum(worksheet: Worksheet): boolean {
        return !this.isSchema(worksheet);
    }

    private static isSchema(worksheet: Worksheet): boolean {
        const range = worksheet.getRange();
        const startCol = range.s.c;
        const startRow = range.s.r;
        const endCol = Math.min(range.e.c, startCol + 10);
        const endRow = Math.min(range.e.r, startRow + 10);
        for (let c = startCol; c < endCol; c++) {
            for (let r = startRow; r < endRow; r++) {
                const title = worksheet.getValue<string>(c, r);
                if (title === Dictionary.FIELD_TYPE) {
                    return true;
                }
            }
        }
        return false;
    }

    private static async readEnumSheet(
        worksheet: Worksheet,
        xlsxResult: XlsxResult
    ): Promise<XlsxEnum | null> {
        const _enum = new XlsxEnum(worksheet);
        const range = worksheet.getRange();
        const table = new EnumTable(range.s);

        const startCol = range.s.c;
        const startRow = range.s.r;

        let row = startRow;
        for (; row < range.e.r; row++) {
            const title = worksheet.getValue<string>(startCol, row);
            if (table.isHeader(title)) {
                table.setRow(title, row);
            }
        }

        if (table.getRow(Dictionary.ENUM_SCHEMA_NAME) !== -1) {
            _enum.setSchemaName(worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.ENUM_SCHEMA_NAME)));
        }
        if (table.getRow(Dictionary.ENUM_FIELD_NAME) !== -1) {
            _enum.setFieldName(worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.ENUM_FIELD_NAME)));
        }

        row = table.end.r + 1;

        const items: Set<string> = new Set<string>();
        for (; row < range.e.r; row++) {
            const item = worksheet.getValue<string>(startCol, row);
            if (item) {
                if (items.has(item)) {
                    xlsxResult.addError({
                        type: 'warning',
                        text: 'Duplicate value.',
                        message: 'Duplicate value.',
                        worksheet: worksheet.name,
                        row
                    }, null);
                } else {
                    items.add(item);
                }
            }
        }
        _enum.setData(Array.from(items));
        return _enum;
    }

    private static async readSchemaSheet(
        worksheet: Worksheet,
        xlsxResult: XlsxResult
    ): Promise<Schema | null> {
        const schema: Schema = new Schema();
        try {
            schema.name = worksheet.name;
            schema.category = SchemaCategory.POLICY;
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
                xlsxResult.addError({
                    type: 'error',
                    text: `Invalid headers. Header "${errorHeader.title}" not set.`,
                    message: `Invalid headers. Header "${errorHeader.title}" not set.`,
                    worksheet: worksheet.name
                }, schema);
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

            let toolName: string, messageId: string;
            if (table.getRow(Dictionary.SCHEMA_TOOL) !== -1) {
                toolName = worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.SCHEMA_TOOL));
            }
            if (table.getRow(Dictionary.SCHEMA_TOOL_ID) !== -1) {
                messageId = worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.SCHEMA_TOOL_ID));
            }
            if (toolName || messageId) {
                schema.category = SchemaCategory.TOOL;
                schema.messageId = messageId;
                return schema;
            }

            row = table.end.r + 1;
            const fields: SchemaField[] = [];
            const fieldCache = new Map<string, SchemaField>();
            for (; row < range.e.r; row++) {
                const field: SchemaField = XlsxToJson.readField(
                    worksheet,
                    table,
                    row,
                    xlsxResult
                );
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
                    xlsxResult
                );
                if (condition) {
                    conditionCache.push(condition);
                }
            }

            const conditions = conditionCache.map(c => c.toJson())
            schema.setFields(fields, conditions);
            SchemaHelper.updateIRI(schema);
            return schema;
        } catch (error) {
            xlsxResult.addError({
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
        xlsxResult: XlsxResult
    ): SchemaField {
        if (worksheet.empty(table.start.c, table.end.c, row)) {
            return null;
        }
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
            isRef: null,
            order: row
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
                    xlsxResult
                );
            } else if (type) {
                const hyperlink = worksheet
                    .getCell(table.getCol(Dictionary.FIELD_TYPE), row)
                    .getLink();
                field.type = xlsxResult.addLink(type, hyperlink);
                field.isRef = true;
            } else {
                xlsxResult.addError({
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
                if (type === Dictionary.AUTO_CALCULATE && field.hidden) {
                    const formulae = worksheet.getFormulae(table.getCol(Dictionary.ANSWER), row);
                    if (formulae) {
                        field.formulae = formulae;
                    }
                } else {
                    const answer = worksheet.getValue<string>(table.getCol(Dictionary.ANSWER), row);
                    if (answer) {
                        field.examples = xlsxToArray(answer, field.isArray);
                    }
                }
            }

            return field;
        } catch (error) {
            xlsxResult.addError({
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
        xlsxResult: XlsxResult
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
                // field.enum = worksheet
                //     .getCell(table.getCol(Dictionary.ANSWER), row)
                //     .getList()
                // field.enum = param.split(/\r?\n/);
                const hyperlink = worksheet
                    .getCell(table.getCol(Dictionary.PARAMETER), row)
                    .getLink();
                const enumName = hyperlink?.worksheet || param;
                field.enum = xlsxResult.getEnum(enumName);
                if (!field.enum) {
                    field.enum = [];
                    xlsxResult.addError({
                        type: 'error',
                        text: `Enum named "${enumName}" not found.`,
                        message: `Enum named "${enumName}" not found.`,
                        worksheet: worksheet.name,
                        row: row
                    }, field);
                }
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
                if (fieldType.name === 'Help Text') {
                    const font = xlsxToFont(param);
                    field.font = font;
                    field.textBold = font.bold;
                    field.textColor = font.color;
                    field.textSize = font.size;
                }
                if (fieldType.name === 'Pattern') {
                    field.pattern = param;
                }
            }
        } catch (error) {
            xlsxResult.addError({
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
        xlsxResult: XlsxResult
    ): XlsxSchemaConditions | undefined {
        if (worksheet.empty(table.start.c, table.end.c, row)) {
            return null;
        }

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
                xlsxResult.addError({
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
            xlsxResult.addError({
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
}

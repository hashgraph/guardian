import { Workbook, Worksheet } from './models/workbook.js';
import { Dictionary, FieldTypes, IFieldTypes } from './models/dictionary.js';
import { xlsxToBoolean, xlsxToEntity, xlsxToFont, xlsxToPresetArray, xlsxToPresetValue, xlsxToUnit, xlsxToVisibility } from './models/value-converters.js';
import { Table } from './models/table.js';
import * as mathjs from 'mathjs';
import { XlsxSchemaConditions } from './models/schema-condition.js';
import { SchemaCategory, SchemaEntity, SchemaField } from '@guardian/interfaces';
import { XlsxResult } from './models/xlsx-result.js';
import { XlsxEnum } from './models/xlsx-enum.js';
import { EnumTable } from './models/enum-table.js';
import { XlsxSchema, XlsxTool } from './models/xlsx-schema.js';
import { XlsxExpressions } from './models/xlsx-expressions.js';
import { IFieldKey } from './interfaces/field-key.interface.js';
import { IOption } from './interfaces/option.interface.js';

interface ICondition {
    type: 'const' | 'formulae';
    value?: any;
    fieldPath?: string;
    compareValue?: any;
    op?: 'OR' | 'AND';
    items?: { fieldPath: string; compareValue: any }[];
    invert?: boolean;
}

export class XlsxToJson {
    public static async parse(buffer: Buffer, options?: IOption): Promise<XlsxResult> {
        const preview = options?.preview === true;
        const xlsxResult = new XlsxResult();
        try {
            const workbook = new Workbook();
            await workbook.read(buffer as any);
            const worksheets = workbook.getWorksheets();

            for (const worksheet of worksheets) {
                if (XlsxToJson.isEnum(worksheet)) {
                    const item = await XlsxToJson.readEnumSheet(worksheet, xlsxResult);
                    if (item) {
                        xlsxResult.addEnum(item);
                    }
                    const loaded = await item.upload(preview);
                    if (!loaded) {
                        xlsxResult.addError({
                            type: 'error',
                            text: `Failed to upload enum "${worksheet.name}".`,
                            message: `Failed to upload enum "${worksheet.name}".`,
                            worksheet: worksheet.name
                        }, null);
                    }
                }
            }

            for (const worksheet of worksheets) {
                if (XlsxToJson.isSchema(worksheet)) {
                    const schema = await XlsxToJson.readSchemaSheet(worksheet, xlsxResult);
                    if (schema) {
                        if (schema.category === SchemaCategory.TOOL) {
                            xlsxResult.addTool(worksheet, schema as XlsxTool);
                        } else {
                            xlsxResult.addSchema(worksheet, schema as XlsxSchema);
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
        return !XlsxToJson.isSchema(worksheet);
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
        const endCol = range.e.c;

        let row = startRow;
        for (; row < range.e.r; row++) {
            const title = worksheet.getValue<string>(startCol, row);
            if (table.isHeader(title)) {
                table.setRow(title, row);
            } else {
                break;
            }
        }
        table.setEnd(endCol, row);

        if (table.getRow(Dictionary.ENUM_SCHEMA_NAME) !== -1) {
            _enum.setSchemaName(worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.ENUM_SCHEMA_NAME)));
        }
        if (table.getRow(Dictionary.ENUM_FIELD_NAME) !== -1) {
            _enum.setFieldName(worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.ENUM_FIELD_NAME)));
        }
        if (table.getRow(Dictionary.ENUM_IPFS) !== -1) {
            _enum.setIPFS(xlsxToBoolean(worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.ENUM_IPFS))));
        }

        row = table.end.r;
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
    ): Promise<XlsxSchema | XlsxTool> {
        const schema: XlsxSchema = new XlsxSchema(worksheet);
        try {
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
                    break;
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
                const nameRow = table.getRow(Dictionary.SCHEMA_NAME);

                schema.name = worksheet.getValue<string>(startCol, table.getRow(Dictionary.SCHEMA_NAME));

                const normalizedName = schema.name?.trim();
                if (!normalizedName) {
                    xlsxResult.addError({
                        type: 'error',
                        text: 'Schema name is empty.',
                        message: `Schema name is empty on sheet "${worksheet.name}".`,
                        worksheet: worksheet.name,
                        cell: worksheet.getPath(startCol, nameRow),
                        row: nameRow,
                        col: startCol,
                    }, schema);

                    schema.name = worksheet.name
                }
            }

            if (table.getRow(Dictionary.SCHEMA_DESCRIPTION) !== -1) {
                schema.description = worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.SCHEMA_DESCRIPTION));
            }
            if (table.getRow(Dictionary.SCHEMA_TYPE) !== -1) {
                schema.entity = xlsxToEntity(worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.SCHEMA_TYPE)));
            }

            let toolName: string;
            let messageId: string;
            if (table.getRow(Dictionary.SCHEMA_TOOL) !== -1) {
                toolName = worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.SCHEMA_TOOL));
            }
            if (table.getRow(Dictionary.SCHEMA_TOOL_ID) !== -1) {
                messageId = worksheet.getValue<string>(startCol + 1, table.getRow(Dictionary.SCHEMA_TOOL_ID));
            }
            if (toolName || messageId) {
                return new XlsxTool(worksheet, schema.name, messageId);
            }

            row = table.end.r + 1;
            const fields: SchemaField[] = [];
            const allFields = new Map<string, SchemaField>();

            let parents: SchemaField[] = [];
            for (; row < range.e.r; row++) {
                const groupIndex = worksheet.getRow(row).getOutline();
                const field: SchemaField = XlsxToJson.readField(
                    worksheet,
                    table,
                    row,
                    xlsxResult
                );
                if (field) {
                    allFields.set(field.title, field);
                    parents = parents.slice(0, groupIndex);
                    parents[groupIndex] = field;
                    if (groupIndex === 0) {
                        XlsxToJson.addFieldByName(worksheet, table, row, xlsxResult, fields, field);
                    } else {
                        const parent = parents[groupIndex - 1];
                        if (parent) {
                            if (!parent.fields) {
                                parent.fields = [];
                            }
                            XlsxToJson.addFieldByName(worksheet, table, row, xlsxResult, parent.fields, field);
                        }
                    }
                }
            }

            row = table.end.r + 1;
            const conditionCache: XlsxSchemaConditions[] = [];
            for (; row < range.e.r; row++) {
                const condition = XlsxToJson.readCondition(
                    worksheet,
                    table,
                    fields,
                    conditionCache,
                    row,
                    xlsxResult
                );
                if (condition) {
                    conditionCache.push(condition);
                }
            }

            row = table.end.r + 1;
            const expressions: XlsxExpressions = new XlsxExpressions();
            for (; row < range.e.r; row++) {
                XlsxToJson.readExpression(
                    worksheet,
                    table,
                    allFields,
                    expressions,
                    row,
                    xlsxResult
                );
            }

            if (schema.entity === SchemaEntity.VC || schema.entity === SchemaEntity.EVC) {
                fields.push({
                    name: 'policyId',
                    title: 'Policy Id',
                    description: 'Policy Id',
                    required: true,
                    isArray: false,
                    isRef: false,
                    type: 'string',
                    format: undefined,
                    pattern: undefined,
                    unit: undefined,
                    unitSystem: undefined,
                    customType: undefined,
                    readOnly: true,
                    isPrivate: undefined,
                    property: undefined,
                    isUpdatable: false,
                });
                fields.push({
                    name: 'ref',
                    title: 'Relationships',
                    description: 'Relationships',
                    required: false,
                    isArray: false,
                    isRef: false,
                    type: 'string',
                    format: undefined,
                    pattern: undefined,
                    unit: undefined,
                    unitSystem: undefined,
                    customType: undefined,
                    readOnly: true,
                    isPrivate: undefined,
                    property: undefined,
                    isUpdatable: false,
                });
                fields.push({
                    name: 'guardianVersion',
                    title: 'Guardian Version',
                    description: 'Guardian Version',
                    required: true,
                    isArray: false,
                    isRef: false,
                    type: 'string',
                    format: undefined,
                    pattern: undefined,
                    unit: undefined,
                    unitSystem: undefined,
                    customType: undefined,
                    readOnly: true,
                    isPrivate: undefined,
                    property: undefined,
                    isUpdatable: false,
                });
            }
            const conditions = conditionCache.map(c => c.toJson());
            schema.update(fields, conditions, expressions);
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
            order: row,
            isUpdatable: false,
        };
        try {
            const key = XlsxToJson.getFieldKey(worksheet, table, row, xlsxResult);
            const type = worksheet.getValue<string>(table.getCol(Dictionary.FIELD_TYPE), row);
            const description = worksheet.getValue<string>(table.getCol(Dictionary.QUESTION), row);
            const required = xlsxToBoolean(worksheet.getValue<string>(table.getCol(Dictionary.REQUIRED_FIELD), row));
            const isArray = xlsxToBoolean(worksheet.getValue<string>(table.getCol(Dictionary.ALLOW_MULTIPLE_ANSWERS), row));
            const visibility = xlsxToVisibility(worksheet.getValue<string>(table.getCol(Dictionary.VISIBILITY), row));

            field.name = key.name;
            field.title = key.path;
            field.description = description;
            field.required = required;
            field.isArray = isArray;
            field.hidden = visibility === 'Hidden';
            field.autocalculate = visibility === 'Auto';

            let typeError = false;
            const fieldType = FieldTypes.findByName(type);
            if (fieldType) {
                field.type = fieldType?.type;
                field.format = fieldType?.format;
                field.pattern = fieldType?.pattern;
                field.unit = fieldType?.unit;
                field.unitSystem = fieldType?.unitSystem;
                field.customType = fieldType?.customType;
                field.hidden = field.hidden || fieldType?.hidden;
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
                typeError = true;
                xlsxResult.addError({
                    type: 'error',
                    text: 'Unknown field type.',
                    message: 'Unknown field type.',
                    worksheet: worksheet.name,
                    cell: worksheet.getPath(table.getCol(Dictionary.FIELD_TYPE), row),
                    row,
                    col: table.getCol(Dictionary.FIELD_TYPE),
                }, field);
            }

            if (!typeError && !XlsxToJson.isAutoCalculate(type, field)) {
                let parseType = (val: any) => val;
                if (fieldType) {
                    parseType = fieldType.pars.bind(fieldType);
                }

                const exampleValue = worksheet
                    .getCell(table.getCol(Dictionary.ANSWER), row)
                    .getValue<any>();
                const example = field.isArray && !field.isRef
                    ? xlsxToPresetArray(field, exampleValue)?.map(parseType)
                    : parseType(xlsxToPresetValue(field, exampleValue))
                field.examples = example ? [example] : null;

                if (table.hasCol(Dictionary.DEFAULT)) {
                    const defaultValue = worksheet
                        .getCell(table.getCol(Dictionary.DEFAULT), row)
                        .getValue<any>();
                    field.default = field.isArray && !field.isRef
                        ? xlsxToPresetArray(field, defaultValue)?.map(parseType)
                        : parseType(xlsxToPresetValue(field, defaultValue));
                }

                if (table.hasCol(Dictionary.SUGGEST)) {
                    const suggest = worksheet
                        .getCell(table.getCol(Dictionary.SUGGEST), row)
                        .getValue<any>();
                    field.suggest = field.isArray && !field.isRef
                        ? xlsxToPresetArray(field, suggest)?.map(parseType)
                        : parseType(xlsxToPresetValue(field, suggest));
                }
            }

            return field;
        } catch (error) {
            xlsxResult.addError({
                type: 'error',
                text: 'Failed to parse field.',
                message: error?.toString(),
                worksheet: worksheet.name,
                row
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
                const enumObject = xlsxResult.getEnum(enumName);

                if (enumObject) {
                    if (enumObject.loaded) {
                        field.enum = enumObject?.getEnum();
                        field.remoteLink = enumObject?.getLink();
                    } else {
                        field.enum = [];
                        field.remoteLink = null;
                        xlsxResult.addError({
                            type: 'error',
                            text: `Enum named "${enumName}" not loaded.`,
                            message: `Enum named "${enumName}" not loaded.`,
                            worksheet: worksheet.name,
                            row
                        }, field);
                    }
                } else {
                    field.enum = [];
                    field.remoteLink = null;
                    xlsxResult.addError({
                        type: 'error',
                        text: `Enum named "${enumName}" not found.`,
                        message: `Enum named "${enumName}" not found.`,
                        worksheet: worksheet.name,
                        row
                    }, field);
                }
                if (!(field.enum || field.remoteLink)) {
                    xlsxResult.addError({
                        type: 'error',
                        text: `Enum named "${enumName}" is empty.`,
                        message: `Enum named "${enumName}" is empty.`,
                        worksheet: worksheet.name,
                        row
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

                if (field.required === true) {
                    xlsxResult.addError({
                        type: 'error',
                        text: `Invalid configuration: "Help Text" cannot be required.`,
                        message: `Field type "Help Text" must not have "Required Field" = Yes. Set it to No.`,
                        worksheet: worksheet.name,
                        cell: worksheet.getPath(table.getCol(Dictionary.REQUIRED_FIELD), row),
                        row,
                        col: table.getCol(Dictionary.REQUIRED_FIELD),
                    }, field);
                }
            }

            if (field.autocalculate && !param) {
                xlsxResult.addError({
                    type: 'error',
                    text: `Auto-calculate field is empty.`,
                    message: `Auto-calculate field is empty.`,
                    worksheet: worksheet.name,
                    cell: worksheet.getPath(table.getCol(Dictionary.PARAMETER), row),
                    row
                }, field);
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
                if (field.autocalculate) {
                    field.expression = param;
                }
            }
        } catch (error) {
            xlsxResult.addError({
                type: 'error',
                text: 'Failed to parse params.',
                message: error?.toString(),
                worksheet: worksheet.name,
                row
            }, field);
        }
    }

    private static readCondition(
        worksheet: Worksheet,
        table: Table,
        fields: SchemaField[],
        conditionCache: XlsxSchemaConditions[],
        row: number,
        xlsxResult: XlsxResult
    ): XlsxSchemaConditions | undefined {
        if (worksheet.empty(table.start.c, table.end.c, row)) {
            return null;
        }
        if (worksheet.getRow(row).getOutline()) {
            return null;
        }

        const key = XlsxToJson.getFieldKey(worksheet, table, row, xlsxResult);
        const field = fields.find((f) => f.title === key.path);

        try {
            //visibility
            if (worksheet.outColumnRange(table.getCol(Dictionary.VISIBILITY))) {
                return;
            }
            const cell = worksheet.getCell(table.getCol(Dictionary.VISIBILITY), row);
            let result: ICondition | null = null;

            try {
                if (cell.isFormulae()) {
                    result = XlsxToJson.parseCondition(cell.getFormulae());
                } else if (cell.isValue()) {
                    result = XlsxToJson.parseCondition(xlsxToVisibility(cell.getValue<string>()));
                }
            } catch (error) {
                xlsxResult.addError({
                    type: 'error',
                    text: `Failed to parse condition.`,
                    message: error?.toString(),
                    worksheet: worksheet.name,
                    cell: worksheet.getPath(table.getCol(Dictionary.VISIBILITY), row),
                    row,
                    col: table.getCol(Dictionary.VISIBILITY),
                }, field);
            }

            if (!result) {
                return;
            }

            if (result.type === 'const') {
                field.hidden = field.hidden || !result.value;
                return;
            }

            if (result.op && Array.isArray(result.items)) {
                const resolved = result.items.map(it => {
                    const target = fields.find(f => f.title === it.fieldPath);
                    if (!target) {
                        throw new Error(`Invalid target in ${result.op} condition: ${it.fieldPath}`);
                    }
                    return { field: target, value: it.compareValue };
                });

                const conditionKey = { op: result.op, items: resolved };
                const existed = conditionCache.find(c => (c as any).equal(conditionKey));
                const holder = existed || new XlsxSchemaConditions(conditionKey as any);

                holder.addField(field, !!result.invert);
                if (!existed) {
                    return holder;
                }
                return null;
            } else {
                const target = fields.find((f) => f.title === result.fieldPath);
                if (!target) {
                    throw new Error('Invalid target');
                }
                const condition = conditionCache.find(c => c.equal(target, result.compareValue));
                if (condition) {
                    condition.addField(field, result.invert);
                    return null;
                } else {
                    const newCondition = new XlsxSchemaConditions(target, result.compareValue);
                    newCondition.addField(field, result.invert);
                    return newCondition;
                }
            }

        } catch (error) {
            xlsxResult.addError({
                type: 'error',
                text: 'Failed to parse condition.',
                message: error?.toString(),
                worksheet: worksheet.name,
                cell: worksheet.getPath(table.getCol(Dictionary.VISIBILITY), row),
                row,
                col: table.getCol(Dictionary.VISIBILITY),
            }, field);
            return;
        }
    }

    private static readExpression(
        worksheet: Worksheet,
        table: Table,
        allFields: Map<string, SchemaField>,
        expressions: XlsxExpressions,
        row: number,
        xlsxResult: XlsxResult
    ): XlsxSchemaConditions | undefined {
        if (worksheet.empty(table.start.c, table.end.c, row)) {
            return null;
        }

        const key = XlsxToJson.getFieldKey(worksheet, table, row, xlsxResult);
        const description = worksheet.getValue<string>(table.getCol(Dictionary.QUESTION), row);
        const groupIndex = worksheet.getRow(row).getOutline();
        const type = worksheet.getValue<string>(table.getCol(Dictionary.FIELD_TYPE), row);

        expressions.addVariable(key, description, groupIndex);

        const field = allFields.get(key.path);
        try {
            if (field && !field.isRef) {
                if (XlsxToJson.isAutoCalculate(type, field)) {
                    const formulae = worksheet.getFormulae(table.getCol(Dictionary.ANSWER), row);
                    if (formulae) {
                        field.formulae = formulae;
                    }
                }
            }
        } catch (error) {
            xlsxResult.addError({
                type: 'error',
                text: 'Failed to parse expression.',
                message: error?.toString(),
                worksheet: worksheet.name,
                cell: worksheet.getPath(table.getCol(Dictionary.ANSWER), row),
                row,
                col: table.getCol(Dictionary.ANSWER),
            }, field);
            return;
        }
    }

    private static parseCondition(formulae: string): ICondition {
        if (formulae === '') {
            return null;
        }

        if (formulae === 'TRUE') {
            return { type: 'const', value: true };
        }
        if (formulae === 'FALSE') {
            return { type: 'const', value: false };
        }
        if (formulae === 'Hidden') {
            return { type: 'const', value: false };
        }
        if (formulae === 'Auto') {
            return { type: 'const', value: true };
        }

        const nodes = mathjs.parse(formulae);

        const parseFn = (node: mathjs.MathNode, invert: boolean): ICondition => {
            if (node.type === 'FunctionNode') {
                const fn = node as mathjs.FunctionNode;
                const name = fn.fn.name?.toUpperCase();

                if (name === 'NOT' && fn.args.length === 1) {
                    return parseFn(fn.args[0], !invert);
                }

                if (name === 'EXACT' && fn.args.length === 2) {
                    const a = fn.args[0] as mathjs.SymbolNode | mathjs.ConstantNode;
                    const b = fn.args[1] as mathjs.SymbolNode | mathjs.ConstantNode;

                    const toPair = (
                        first: mathjs.SymbolNode | mathjs.ConstantNode,
                        second: mathjs.SymbolNode | mathjs.ConstantNode
                    ) => {
                        if (first.type === 'SymbolNode' && second.type === 'ConstantNode') {
                            return { fieldPath: first.name, compareValue: (second as mathjs.ConstantNode).value };
                        }
                        if (first.type === 'ConstantNode' && second.type === 'SymbolNode') {
                            return { fieldPath: (second as mathjs.SymbolNode).name, compareValue: (first as mathjs.ConstantNode).value };
                        }
                        return null;
                    };

                    const pair = toPair(a, b);
                    if (!pair) {
                        throw new Error(`Unsupported EXACT signature in "${formulae}"`)
                    };

                    return {
                        type: 'formulae',
                        fieldPath: pair.fieldPath,
                        compareValue: pair.compareValue,
                        invert
                    };
                }

                if ((name === 'OR' || name === 'AND') && fn.args.length >= 2) {
                    const items: { fieldPath: string; compareValue: any }[] = [];
                    for (const arg of fn.args) {
                        const parsed = parseFn(arg, false);
                        if (!(parsed?.type === 'formulae' && parsed.fieldPath && parsed.compareValue !== undefined && !parsed.op)) {
                            throw new Error(`Unsupported argument inside ${name} in "${formulae}"`);
                        }
                        items.push({ fieldPath: parsed.fieldPath, compareValue: parsed.compareValue });
                    }
                    return {
                        type: 'formulae',
                        op: name as 'OR' | 'AND',
                        items,
                        invert
                    };
                }
            }

            throw new Error(`Failed to parse formulae: ${formulae}.`);
        };

        return parseFn(nodes, false);
    }

    private static isAutoCalculate(type: string, field: SchemaField): boolean {
        return field.hidden || type === 'Auto-Calculate';
    }

    private static getFieldKey(
        worksheet: Worksheet,
        table: Table,
        row: number,
        xlsxResult: XlsxResult,
    ): IFieldKey {
        const path = worksheet.getPath(table.getCol(Dictionary.ANSWER), row);
        const fullPath = worksheet.getFullPath(table.getCol(Dictionary.ANSWER), row);
        let name: string;
        if (table.getCol(Dictionary.KEY) !== -1) {
            name = worksheet.getValue<string>(table.getCol(Dictionary.KEY), row) || path;
        } else {
            name = path;
        }
        if (name) {
            name = name.trim();
        }
        if (name && name.includes('.')) {
            xlsxResult.addError({
                type: 'warning',
                text: `Invalid character.`,
                message: `Dots are not allowed in the Keys (${name})`,
                worksheet: worksheet.name,
                cell: worksheet.getPath(table.getCol(Dictionary.KEY), row),
                row,
                col: table.getCol(Dictionary.KEY),
            }, null);
            name = name.replaceAll('.', '');
        }
        return { name, path, fullPath }
    }

    private static addFieldByName(
        worksheet: Worksheet,
        table: Table,
        row: number,
        xlsxResult: XlsxResult,
        fields: SchemaField[],
        field: SchemaField
    ) {
        if (fields.find((item) => item.name === field.name)) {
            xlsxResult.addError({
                type: 'error',
                text: `Failed to parse field.`,
                message: `Key ${field.name} already exists`,
                worksheet: worksheet.name,
                cell: worksheet.getPath(table.getCol(Dictionary.KEY), row),
                row,
                col: table.getCol(Dictionary.KEY),
            }, field);
        }
        fields.push(field);
    }
}

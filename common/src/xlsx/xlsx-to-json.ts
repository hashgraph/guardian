import { Range, Workbook, Worksheet } from './models/workbook.js';
import { Dictionary, FieldTypes, IFieldTypes } from './models/dictionary.js';
import { xlsxToBoolean, xlsxToEntity, xlsxToFont, xlsxToPresetArray, xlsxToPresetValue, xlsxToUnit, xlsxToVisibility } from './models/value-converters.js';
import { Table } from './models/table.js';
import * as mathjs from 'mathjs';
import { XlsxSchemaConditions } from './models/schema-condition.js';
import { SchemaCategory, SchemaEntity, SchemaField } from '@guardian/interfaces';
import { XlsxResult } from './models/xlsx-result.js';
import { XlsxEnum } from './models/xlsx-enum.js';
import { EnumTable, SharedEnumTable } from './models/enum-table.js';
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

            // Pass 0: shared enum tab
            for (const worksheet of worksheets) {
                if (worksheet.name === Dictionary.SHARED_ENUM_SHEET) {
                    if (XlsxToJson.isSharedEnumSheet(worksheet)) {
                        const enums = await XlsxToJson.readSharedEnumSheet(worksheet, xlsxResult, preview);
                        for (const item of enums) {
                            xlsxResult.addEnum(item);
                        }
                    } else {
                        XlsxToJson.validateSharedEnumHeaders(worksheet, xlsxResult);
                    }
                }
            }

            // Pass 1: per-tab enum sheets (backward compatibility)
            for (const worksheet of worksheets) {
                if (XlsxToJson.isEnum(worksheet)) {
                    const item = await XlsxToJson.readEnumSheet(worksheet, xlsxResult);
                    if (item) {
                        xlsxResult.addEnum(item);
                        const loaded = await item.upload(preview);
                        if (!loaded) {
                            xlsxResult.addError({
                                type: 'error',
                                text: `Failed to upload enum "${worksheet.name}".`,
                                message: `Failed to upload enum "${worksheet.name}". `
                                    + `Check your IPFS configuration, or set "Loaded to IPFS" to "No" in the header of the "${worksheet.name}" enum sheet.`,
                                worksheet: worksheet.name
                            }, null);
                        }
                    }
                }
            }

            // Pass 2: schema sheets
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

    /**
     * Resolve the Enums-tab columns by matching header text on the header row.
     * Returns null if any of the three required headers is missing.
     */
    private static resolveSharedEnumColumns(
        worksheet: Worksheet
    ): { name: number; ipfs: number; value: number } | null {
        const range = worksheet.getRange();
        let name: number | undefined;
        let ipfs: number | undefined;
        let value: number | undefined;
        for (let col = range.s.c; col < range.e.c; col++) {
            const header = worksheet.getValue<string>(col, SharedEnumTable.HEADER_ROW);
            if (header === Dictionary.ENUM_NAME) { name = col; }
            else if (header === Dictionary.ENUM_IPFS) { ipfs = col; }
            else if (header === Dictionary.ENUM_VALUE) { value = col; }
        }
        if (name === undefined || ipfs === undefined || value === undefined) {
            return null;
        }
        return { name, ipfs, value };
    }

    private static isSharedEnumSheet(worksheet: Worksheet): boolean {
        return XlsxToJson.resolveSharedEnumColumns(worksheet) !== null;
    }

    private static validateSharedEnumHeaders(worksheet: Worksheet, xlsxResult: XlsxResult): void {
        if (XlsxToJson.resolveSharedEnumColumns(worksheet)) {
            return;
        }
        const range = worksheet.getRange();
        const present = new Set<string>();
        for (let col = range.s.c; col < range.e.c; col++) {
            present.add(worksheet.getValue<string>(col, SharedEnumTable.HEADER_ROW));
        }
        const missing = [Dictionary.ENUM_NAME, Dictionary.ENUM_IPFS, Dictionary.ENUM_VALUE]
            .filter(header => !present.has(header));
        const text = `"${Dictionary.SHARED_ENUM_SHEET}" sheet is missing required header(s): ${missing.map(h => `"${h}"`).join(', ')}.`;
        xlsxResult.addError({
            type: 'error',
            text,
            message: text,
            worksheet: worksheet.name,
            row: SharedEnumTable.HEADER_ROW
        }, null);
    }

    private static isEnum(worksheet: Worksheet): boolean {
        if (worksheet.name === Dictionary.SHARED_ENUM_SHEET) {
            return false;
        }
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
                        message: `Duplicate enum value at row ${row}. Each value in an enum list must be unique — remove or rename the repeated entry.`,
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

    private static async readSharedEnumSheet(
        worksheet: Worksheet,
        xlsxResult: XlsxResult,
        preview: boolean
    ): Promise<XlsxEnum[]> {
        const result: XlsxEnum[] = [];
        const range = worksheet.getRange();
        const endRow = range.e.r;

        const cols = XlsxToJson.resolveSharedEnumColumns(worksheet);
        if (!cols) {
            return result;
        }

        let currentName: string = null;
        let currentIpfs: boolean = false;
        let currentItems: string[] = [];
        let currentItemsSet: Set<string> = new Set();
        let groupStartRow: number = SharedEnumTable.FIRST_DATA_ROW;
        const seenNames = new Set<string>();

        const flushGroup = async (
            enumName: string,
            ipfs: boolean,
            items: string[],
            startRow: number,
            nextRow: number
        ): Promise<void> => {
            if (!enumName) {
                return;
            }
            if (seenNames.has(enumName)) {
                xlsxResult.addError({
                    type: 'warning',
                    text: `Duplicate enum name "${enumName}" in the "${Dictionary.SHARED_ENUM_SHEET}" tab. The first definition is used; this one is ignored.`,
                    message: `Duplicate enum name "${enumName}" in the "${Dictionary.SHARED_ENUM_SHEET}" tab. The first definition is used; this one is ignored.`,
                    worksheet: worksheet.name,
                    row: startRow
                }, null);
                return;
            }
            seenNames.add(enumName);
            const _enum = new XlsxEnum(worksheet);
            _enum.setEnumName(enumName);
            _enum.setIPFS(ipfs);
            _enum.setData([...items]);
            _enum.setRange(Range.fromRows(startRow, nextRow - 1, cols.value));

            const loaded = await _enum.upload(preview);
            if (!loaded) {
                xlsxResult.addError({
                    type: 'error',
                    text: `Failed to upload enum "${enumName}".`,
                    message: `Failed to upload enum "${enumName}. `
                        + `Check your IPFS configuration, or set "Loaded to IPFS" to "No" for this entry in the "${Dictionary.SHARED_ENUM_SHEET}" tab.`,
                    worksheet: worksheet.name
                }, null);
                return;
            }
            result.push(_enum);
        };

        for (let row = SharedEnumTable.FIRST_DATA_ROW; row < endRow; row++) {
            const enumName = worksheet.getValue<string>(cols.name,  row);
            const ipfsRaw  = worksheet.getValue<string>(cols.ipfs,  row);
            const value    = worksheet.getValue<string>(cols.value, row);

            if (!enumName && !value) {
                continue;
            }

            if (enumName) {
                await flushGroup(currentName, currentIpfs, currentItems, groupStartRow, row);
                currentName   = enumName;
                currentIpfs   = xlsxToBoolean(ipfsRaw);
                currentItems  = [];
                currentItemsSet   = new Set();
                groupStartRow = row;
            }

            if (value) {
                if (currentItemsSet.has(value)) {
                    xlsxResult.addError({
                        type: 'warning',
                        text: 'Duplicate value.',
                        message: `Duplicate enum value "${value}" at row ${row}. Each value in an enum list must be unique — remove or rename the repeated entry.`,
                        worksheet: worksheet.name,
                        row
                    }, null);
                } else {
                    currentItemsSet.add(value);
                    currentItems.push(value);
                }
            }
        }
        await flushGroup(currentName, currentIpfs, currentItems, groupStartRow, endRow);

        return result;
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
                } else if (table.isFieldHeader(title)) {
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
                    message: `Sheet "${worksheet.name}" is missing required column header "${errorHeader.title}". `
                        + `Ensure the header row contains all required columns matching the template exactly.`,
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
                        message: `Schema name is empty on sheet "${worksheet.name}". Enter the schema name in the first cell of row 1.`,
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

            // Create schemas for inline sub-schema fields
            const seenSchemaNames = new Map<string, SchemaField[]>();
            const createInlineSchemas = (schemaFields: SchemaField[]) => {
                for (const field of schemaFields) {
                    if (field.isRef && field.customType === 'subSchema') {
                        const name = field.property || field.description;
                        const childFields = field.fields || [];
                        if (seenSchemaNames.has(name)) {
                            const existing = seenSchemaNames.get(name);
                            if (!XlsxToJson.inlineFieldsMatch(existing, childFields)) {
                                xlsxResult.addError({
                                    type: 'warning',
                                    text: `Sub-schema "${name}" is defined more than once with different fields. The first definition will be used.`,
                                    message: `Sub-schema "${name}" on sheet "${worksheet.name}" has conflicting field definitions across its occurrences. `
                                        + `Ensure every use of this sub-schema has the same fields, or rename one of them to distinguish them.`,
                                    worksheet: worksheet.name,
                                }, null);
                            }
                        } else {
                            seenSchemaNames.set(name, [...childFields]);
                            const syntheticSchema = new XlsxSchema(worksheet);
                            syntheticSchema.name = name;
                            syntheticSchema.update(childFields, [], new XlsxExpressions());
                            xlsxResult.addInlineSchema(syntheticSchema, worksheet.name);
                            if (childFields.length) {
                                createInlineSchemas(childFields);
                            }
                        }
                    }
                }
            };
            createInlineSchemas(fields);

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
                    text: `Unknown field type (cell is empty).`,
                    message: `Field Type cell is empty. `
                        + `Supported types: Number, Integer, String, Boolean, Date, Time, DateTime, Duration, `
                        + `URL, URI, Email, Image, File, Pattern, Help Text, GeoJSON, HederaAccount, `
                        + `Prefix, Postfix, Auto-Calculate, Enum, Sub-Schema.`,
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
                message: `Failed to parse field at row ${row} on sheet "${worksheet.name}": ${error?.toString()}`,
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
            if (fieldType.name === 'Sub-Schema') {
                const subSchemaName = param || field.description;
                field.type = xlsxResult.addLink(subSchemaName, null);
                field.property = subSchemaName;
            }
            if (fieldType.name === 'Enum') {
                if (!param) {
                    field.enumName = '';
                    field.enum = [];
                    field.remoteLink = null;
                    xlsxResult.addError({
                        type: 'error',
                        text: 'Enum field is missing a value in the Parameter column.',
                        message: 'Enum field is missing a value in the Parameter column.',
                        worksheet: worksheet.name,
                        row
                    }, field);
                    return;
                }
                let enumName: string = param;
                let enumObject = xlsxResult.getEnumByName(enumName);

                if (!enumObject) {
                    // Legacy fallback: per-tab enum sheet referenced by hyperlink or name.
                    const hyperlink = worksheet
                        .getCell(table.getCol(Dictionary.PARAMETER), row)
                        .getLink();
                    const legacyName = hyperlink?.worksheet || enumName;
                    if (legacyName) {
                        enumName = legacyName;
                        enumObject = xlsxResult.getEnum(legacyName);
                    }
                }

                if (enumObject) {
                    field.enumName = enumObject?.enumName || '';
                    if (enumObject.loaded) {
                        field.enum = enumObject?.getEnum();
                        field.remoteLink = enumObject?.getLink();
                    } else {
                        field.enum = [];
                        field.remoteLink = null;
                        xlsxResult.addError({
                            type: 'error',
                            text: `Enum "${enumName}" failed to load.`,
                            message: `Enum "${enumName}" was found in the "Enums" tab but failed to upload to IPFS. `
                                + `Try setting "Loaded to IPFS" to "No" in the Enums tab, or check your IPFS configuration.`,
                            worksheet: worksheet.name,
                            row
                        }, field);
                    }
                } else {
                    field.enumName = '';
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
                        text: `Enum "${enumName}" has no values.`,
                        message: `Enum "${enumName}" was found but contains no values. Add at least one value in the "Value" column of the "Enums" tab.`,
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
                    text: `Auto-Calculate field is missing an expression.`,
                    message: `Row ${row}: Auto-Calculate field "${field.description}" has no expression in the Parameter column. `
                        + `Enter a math expression referencing other field cells, e.g. "G6 + G7".`,
                    worksheet: worksheet.name,
                    cell: worksheet.getPath(table.getCol(Dictionary.PARAMETER), row),
                    row,
                    col: table.getCol(Dictionary.PARAMETER),
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
                text: `Failed to parse params for field "${field.description || '(unknown)'}" (${fieldType.name}).`,
                message: `Row ${row}: Failed to parse params for "${field.description || '(unknown)'}" (type: ${fieldType.name}): ${error?.toString()}`,
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

            let rawConditionValue: string = '';
            try {
                if (cell.isFormulae()) {
                    rawConditionValue = cell.getFormulae();
                    result = XlsxToJson.parseCondition(rawConditionValue);
                } else if (cell.isValue()) {
                    rawConditionValue = xlsxToVisibility(cell.getValue<string>());
                    result = XlsxToJson.parseCondition(rawConditionValue);
                }
            } catch (error) {
                xlsxResult.addError({
                    type: 'error',
                    text: `Invalid visibility condition on field "${field?.description || key.path}".`,
                    message: `Row ${row}: Failed to parse Visibility formula "${rawConditionValue}". `
                        + `Supported formats: blank (always visible), "hidden" or "No" (always hidden), `
                        + `EXACT(Gn,"value") or NOT(EXACT(Gn,"value")) where Gn is an Answer cell reference. `
                        + `Error: ${error?.toString()}`,
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
                text: `Failed to resolve condition for field "${field?.description || key?.path}".`,
                message: `Row ${row}: Visibility condition references a field that does not exist on this sheet. `
                    + `Make sure the cell reference in EXACT(Gn, ...) points to an Answer cell of a field defined above this row. `
                    + `Error: ${error?.toString()}`,
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
                message: `Row ${row}: Failed to parse Auto-Calculate expression on sheet "${worksheet.name}". `
                    + `Ensure the formula in the Test Value column is a valid math expression. Error: ${error?.toString()}`,
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

    private static inlineFieldsMatch(a: SchemaField[], b: SchemaField[]): boolean {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i].description !== b[i].description) {
                return false;
            }
            if (a[i].isRef && a[i].customType === 'subSchema') {
                if (!XlsxToJson.inlineFieldsMatch(a[i].fields || [], b[i].fields || [])) {
                    return false;
                }
            } else if (a[i].type !== b[i].type) {
                return false;
            }
        }
        return true;
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
                message: `Key "${name}" contains a dot ('.'), which is not allowed in field keys. The dot has been removed automatically — rename the key in the Key column to avoid this.`,
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
                message: `Row ${row}: Field key "${field.name}" already exists on sheet "${worksheet.name}". Each field must have a unique key — rename it in the Key column.`,
                worksheet: worksheet.name,
                cell: worksheet.getPath(table.getCol(Dictionary.KEY), row),
                row,
                col: table.getCol(Dictionary.KEY),
            }, field);
        }
        fields.push(field);
    }
}

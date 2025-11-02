import { Dictionary, FieldTypes } from './models/dictionary.js';
import { anyToXlsx, examplesToXlsx, booleanToXlsx, entityToXlsx, fontToXlsx, stringToXlsx, typeToXlsx, unitToXlsx, valueToFormula, visibilityToXlsx } from './models/value-converters.js';
import { Hyperlink, Range, Workbook, Worksheet } from './models/workbook.js';
import { Table } from './models/table.js';
import { ISchema, Schema, SchemaCondition, SchemaField } from '@guardian/interfaces';
import { PolicyTool } from '../entity/index.js';
import { IRowField } from './interfaces/row-field.interface.js';
import { SheetName } from './models/sheet-name.js';
import { XlsxEnum } from './models/xlsx-enum.js';
import { EnumTable } from './models/enum-table.js';
import { IPFS } from '../helpers/index.js';

export class JsonToXlsx {
    public static async generate(
        schemas: ISchema[],
        tools: PolicyTool[],
        toolSchemas: ISchema[]
    ): Promise<ArrayBuffer> {
        const workbook = new Workbook();
        const names = new SheetName();

        const _schemas: any = [];
        const _enums: XlsxEnum[] = [];
        const _schemaCache = new Map<string, string>();
        const _enumsCache = new Map<string, XlsxEnum>();

        //Schemas
        for (const item of schemas) {
            const schema = new Schema(item);
            JsonToXlsx.updateFieldPaths(schema.fields, schema.iri);
            const sheetName = names.getSchemaName(schema.name);
            const worksheet = workbook.createWorksheet(sheetName);
            _schemas.push({
                schema,
                worksheet,
                sheetName
            });
            _schemaCache.set(schema.iri, sheetName);
        }

        //Tools
        for (const item of toolSchemas) {
            const schema = new Schema(item);
            JsonToXlsx.updateFieldPaths(schema.fields, schema.iri);
            const sheetName = names.getToolName(schema.name);
            const worksheet = workbook.createWorksheet(sheetName);
            const tool = tools.find((t) => t.topicId === item.topicId);
            _schemas.push({
                schema,
                worksheet,
                sheetName,
                tool
            });
            _schemaCache.set(schema.iri, sheetName);
        }

        //Enums
        for (const item of _schemas) {
            const schema = item.schema as Schema;
            for (const field of schema.fields) {
                if (field.enum || field.remoteLink) {
                    const sheetName = names.getEnumName(field.description);
                    const worksheet = workbook.createWorksheet(sheetName);
                    const _enum = new XlsxEnum(worksheet);
                    _enum.setSchema(schema);
                    _enum.setField(field);
                    _enums.push(_enum);
                    _enumsCache.set(field.path, _enum);
                    if (field.enum) {
                        _enum.setData(field.enum);
                    } else {
                        const enumValues = await JsonToXlsx.loadEnum(field.remoteLink);
                        _enum.setData(enumValues);
                    }
                }
            }
        }

        //Write Enums
        for (const item of _enums) {
            JsonToXlsx.writeEnum(
                item.worksheet,
                item.schema,
                item.field,
                item
            );
        }

        //Write Fields
        for (const item of _schemas) {
            JsonToXlsx.writeSchema(
                item.worksheet,
                item.schema,
                item.tool,
                _schemaCache,
                _enumsCache
            );
        }
        //Write
        if (workbook.sheetLength === 0) {
            workbook.createWorksheet('blank');
        }
        return await workbook.write();
    }

    private static updateFieldPaths(fields: SchemaField[], parent: string) {
        for (const field of fields) {
            field.path = `${parent}:${field.name}`;
            if (field.isRef && field.fields) {
                JsonToXlsx.updateFieldPaths(field.fields, field.type);
            }
        }
    }

    public static writeSchema(
        worksheet: Worksheet,
        schema: Schema,
        tool: PolicyTool,
        schemaCache: Map<string, string>,
        enumsCache: Map<string, XlsxEnum>
    ): void {
        const range = worksheet.getRange();

        const table = new Table(range.s);
        table.setDefault(!!tool);

        //Schema headers
        for (const header of table.schemaHeaders) {
            worksheet
                .setValue(header.title, header.column, header.row)
                .setStyle(header.style);
        }
        worksheet.setValue(schema.name, table.start.c, table.getRow(Dictionary.SCHEMA_NAME));
        worksheet.mergeCells(Range.fromColumns(table.start.c, table.end.c - 1, table.getRow(Dictionary.SCHEMA_NAME)));
        worksheet.setValue(Dictionary.SCHEMA_DESCRIPTION, table.start.c, table.getRow(Dictionary.SCHEMA_DESCRIPTION));
        worksheet.setValue(Dictionary.SCHEMA_TYPE, table.start.c, table.getRow(Dictionary.SCHEMA_TYPE));
        worksheet.mergeCells(Range.fromColumns(table.start.c + 1, table.end.c - 1, table.getRow(Dictionary.SCHEMA_DESCRIPTION)));
        worksheet.mergeCells(Range.fromColumns(table.start.c + 1, table.end.c - 1, table.getRow(Dictionary.SCHEMA_TYPE)));
        worksheet
            .getCell(table.start.c + 1, table.getRow(Dictionary.SCHEMA_DESCRIPTION))
            .setStyle(table.schemaItemStyle)
            .setValue(schema.description);
        worksheet
            .getCell(table.start.c + 1, table.getRow(Dictionary.SCHEMA_TYPE))
            .setStyle(table.schemaItemStyle)
            .setValue(entityToXlsx(schema.entity));

        if (tool) {
            worksheet.setValue(Dictionary.SCHEMA_TOOL, table.start.c, table.getRow(Dictionary.SCHEMA_TOOL));
            worksheet.setValue(Dictionary.SCHEMA_TOOL_ID, table.start.c, table.getRow(Dictionary.SCHEMA_TOOL_ID));
            worksheet.mergeCells(Range.fromColumns(table.start.c + 1, table.end.c - 1, table.getRow(Dictionary.SCHEMA_TOOL)));
            worksheet.mergeCells(Range.fromColumns(table.start.c + 1, table.end.c - 1, table.getRow(Dictionary.SCHEMA_TOOL_ID)));
            worksheet
                .getCell(table.start.c + 1, table.getRow(Dictionary.SCHEMA_TOOL))
                .setStyle(table.schemaItemStyle)
                .setValue(tool.name);
            worksheet
                .getCell(table.start.c + 1, table.getRow(Dictionary.SCHEMA_TOOL_ID))
                .setStyle(table.schemaItemStyle)
                .setValue(tool.messageId);
        }

        //Field headers
        for (const header of table.fieldHeaders) {
            worksheet
                .getCol(header.column)
                .setWidth(header.width)
            worksheet
                .setValue(header.title, header.column, header.row)
                .setStyle(header.style);
        }

        const fieldCache = new Map<string, IRowField>();

        let row = table.end.r;
        for (const field of schema.fields) {
            row++
            JsonToXlsx.writeField(
                worksheet,
                table,
                field,
                schemaCache,
                enumsCache,
                fieldCache,
                row
            );
            row = JsonToXlsx.writeSubFields(
                worksheet,
                table,
                field,
                schemaCache,
                enumsCache,
                row
            );
        }

        for (const condition of schema.conditions) {
            JsonToXlsx.writeCondition(
                worksheet,
                table,
                condition,
                fieldCache
            );
        }
    }

    public static writeField(
        worksheet: Worksheet,
        table: Table,
        field: SchemaField,
        schemaCache: Map<string, string>,
        enumsCache: Map<string, XlsxEnum>,
        fieldCache: Map<string, IRowField>,
        row: number,
        parent?: SchemaField
    ) {
        const fieldItemStyle = parent ? table.subItemStyle : table.fieldItemStyle;
        for (const header of table.fieldHeaders) {
            worksheet
                .getCell(header.column, row)
                .setStyle(fieldItemStyle);
        }
        worksheet
            .getCell(table.getCol(Dictionary.QUESTION), row)
            .setValue(stringToXlsx(field.description));
        worksheet
            .getCell(table.getCol(Dictionary.REQUIRED_FIELD), row)
            .setValue(booleanToXlsx(field.required));
        worksheet
            .getCell(table.getCol(Dictionary.ALLOW_MULTIPLE_ANSWERS), row)
            .setValue(booleanToXlsx(field.isArray));
        worksheet
            .getCell(table.getCol(Dictionary.PARAMETER), row)
            .setValue(anyToXlsx(undefined));
        worksheet
            .getCell(table.getCol(Dictionary.ANSWER), row)
            .setValue(anyToXlsx(undefined));
        worksheet
            .getCell(table.getCol(Dictionary.DEFAULT), row)
            .setValue(anyToXlsx(undefined));
        worksheet
            .getCell(table.getCol(Dictionary.SUGGEST), row)
            .setValue(anyToXlsx(undefined));
        worksheet
            .getCell(table.getCol(Dictionary.KEY), row)
            .setValue(stringToXlsx(field.name));

        const type = FieldTypes.findByValue(field);
        if (type) {
            worksheet
                .getCell(table.getCol(Dictionary.FIELD_TYPE), row)
                .setValue(typeToXlsx(type));
        } else if (field.isRef) {
            const sheetName = schemaCache.get(field.type);
            worksheet
                .getCell(table.getCol(Dictionary.FIELD_TYPE), row)
                .setLink(sheetName, new Hyperlink(sheetName, 'A1'))
                .setStyle(table.linkStyle);
        } else {
            throw new Error(`Unknown field type (${worksheet.name}: ${field.name}).`);
        }

        if (type && type.pattern === true) {
            worksheet
                .getCell(table.getCol(Dictionary.PARAMETER), row)
                .setValue(stringToXlsx(field.pattern));
        }
        if (field.unit) {
            worksheet
                .getCell(table.getCol(Dictionary.PARAMETER), row)
                .setValue(stringToXlsx(field.unit))
                .setStyle(table.paramStyle);
            worksheet.getCell(table.getCol(Dictionary.ANSWER), row)
                .setFormat(unitToXlsx(field));
        }
        if (field.autocalculate) {
            worksheet
                .getCell(table.getCol(Dictionary.PARAMETER), row)
                .setValue(stringToXlsx(field.expression))
                .setStyle(table.paramStyle);
        }
        if (field.font) {
            worksheet
                .getCell(table.getCol(Dictionary.PARAMETER), row)
                .setValue(JSON.stringify(field.font))
                .setStyle(table.paramStyle);
            worksheet
                .getCell(table.getCol(Dictionary.QUESTION), row)
                .setStyle(fontToXlsx(field.font, fieldItemStyle));
        }
        if (field.enum || field.remoteLink) {
            const _enum = enumsCache.get(field.path);
            if (_enum) {
                worksheet
                    .getCell(table.getCol(Dictionary.PARAMETER), row)
                    .setLink(_enum.sheetName, new Hyperlink(_enum.sheetName, 'A3'))
                    .setStyle(table.linkStyle);
                if (!field.isArray) {
                    worksheet
                        .getCell(table.getCol(Dictionary.ANSWER), row)
                        .setList2(_enum.getData());
                    worksheet
                        .getCell(table.getCol(Dictionary.DEFAULT), row)
                        .setList2(_enum.getData());
                    worksheet
                        .getCell(table.getCol(Dictionary.SUGGEST), row)
                        .setList2(_enum.getData());
                }
            } else {
                throw new Error(`Enum ('${worksheet.name}', ${field.name}, '${field.description}', ${field.path}) not found.`);
            }
        }

        worksheet
            .getCell(table.getCol(Dictionary.ANSWER), row)
            .setValue(examplesToXlsx(field));
        worksheet
            .getCell(table.getCol(Dictionary.DEFAULT), row)
            .setValue(anyToXlsx(field.default));
        worksheet
            .getCell(table.getCol(Dictionary.SUGGEST), row)
            .setValue(anyToXlsx(field.suggest));

        if (field.hidden) {
            worksheet
                .getCell(table.getCol(Dictionary.VISIBILITY), row)
                .setValue(visibilityToXlsx('Hidden'));
        }
        if (field.autocalculate) {
            worksheet
                .getCell(table.getCol(Dictionary.VISIBILITY), row)
                .setValue(visibilityToXlsx('Auto'));
        }

        const name = worksheet.getPath(table.getCol(Dictionary.ANSWER), row);
        const path = worksheet.getFullPath(table.getCol(Dictionary.ANSWER), row);
        fieldCache.set(field.name, { key: field.name, name, path, row });
    }

    public static writeCondition(
        worksheet: Worksheet,
        table: Table,
        condition: SchemaCondition,
        fieldCache: Map<string, IRowField>,
    ) {
        const baseFormula = JsonToXlsx.buildIfFormula(condition.ifCondition, fieldCache);

        const thenFormula = baseFormula;
        const elseFormula = `NOT(${baseFormula})`;

        if (Array.isArray(condition.thenFields)) {
            for (const field of condition.thenFields) {
                const thenField = fieldCache.get(field.name);
                if (!thenField) {
                    continue;
                }
                worksheet
                    .getCell(table.getCol(Dictionary.VISIBILITY), thenField.row)
                    .setFormulae(thenFormula);
            }
        }
        if (Array.isArray(condition.elseFields)) {
            for (const field of condition.elseFields) {
                const elseField = fieldCache.get(field.name);
                if (!elseField) {
                    continue;
                }
                worksheet
                    .getCell(table.getCol(Dictionary.VISIBILITY), elseField.row)
                    .setFormulae(elseFormula);
            }
        }
    }

    public static writeEnum(
        worksheet: Worksheet,
        schema: Schema,
        field: SchemaField,
        xlsxEnum: XlsxEnum
    ) {
        const range = worksheet.getRange();

        const table = new EnumTable(range.s);
        table.setDefault();

        for (const header of table.headers) {
            worksheet
                .setValue(header.title, header.column, header.row)
                .setStyle(header.style);
            worksheet
                .getCol(header.column)
                .setWidth(header.width)
        }
        worksheet
            .getCell(table.start.c + 1, table.getRow(Dictionary.ENUM_SCHEMA_NAME))
            .setStyle(table.descriptionStyle)
            .setValue(schema.name);
        worksheet
            .getCell(table.start.c + 1, table.getRow(Dictionary.ENUM_FIELD_NAME))
            .setStyle(table.descriptionStyle)
            .setValue(field.description);
        worksheet
            .getCell(table.start.c + 1, table.getRow(Dictionary.ENUM_IPFS))
            .setStyle(table.descriptionStyle)
            .setValue(booleanToXlsx(!!field.remoteLink));
        worksheet
            .getCol(table.start.c + 1)
            .setWidth(50)

        let row = table.end.r;
        for (const item of xlsxEnum.data) {
            worksheet
                .mergeCells(Range.fromColumns(table.start.c, table.end.c - 1, row));
            worksheet
                .getCell(table.getCol(), row)
                .setValue(stringToXlsx(item))
                .setStyle(table.itemStyle);
            row++
        }
        xlsxEnum.setRange(Range.fromRows(table.end.r, row - 1, table.getCol()));
    }

    public static writeSubFields(
        worksheet: Worksheet,
        table: Table,
        parent: SchemaField,
        schemaCache: Map<string, string>,
        enumsCache: Map<string, XlsxEnum>,
        row: number
    ): number {
        if (!parent || !parent.isRef || !Array.isArray(parent.fields) || parent.fields.length === 0) {
            return row;
        }

        const lvl = worksheet.getRow(row).getOutline() + 1;
        if (lvl > 7) {
            return row;
        }
        if (lvl > 1) {
            for (const header of table.fieldHeaders) {
                worksheet
                    .getCell(header.column, row)
                    .setStyle(table.subHeadersStyle);
            }
        }
        const fieldCache = new Map<string, IRowField>();
        for (const field of parent.fields) {
            row++
            JsonToXlsx.writeField(
                worksheet,
                table,
                field,
                schemaCache,
                enumsCache,
                fieldCache,
                row,
                parent
            );
            worksheet
                .getRow(row)
                .setOutline(lvl);
            row = JsonToXlsx.writeSubFields(
                worksheet,
                table,
                field,
                schemaCache,
                enumsCache,
                row
            );
        }

        for (const condition of parent.conditions) {
            JsonToXlsx.writeCondition(
                worksheet,
                table,
                condition,
                fieldCache
            );
        }

        return row;
    }

    private static async loadEnum(link: string): Promise<string[]> {
        try {
            const cidMatches = link.match(/Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/);
            const cid = (cidMatches && cidMatches[0]) || '';
            const file = await IPFS.getFile(cid, 'raw');
            const buffer = Buffer.from(file);
            const json = JSON.parse(buffer.toString());
            if (Array.isArray(json.enum)) {
                return json.enum;
            } else {
                return [];
            }
        } catch (error) {
            return [];
        }
    }

    private static buildIfFormula(
        condition: SchemaCondition['ifCondition'],
        fieldCache: Map<string, IRowField>
    ): string {
        const toExact = (sub: any): string => {
            const f = fieldCache.get(sub.field.name);
            if (!f) {
                throw new Error(`Condition refers to unknown field "${sub.field?.name}".`);
            }
            const v = valueToFormula(sub.fieldValue);
            return `EXACT(${f.name},${v})`;
        };

        if ((condition as any).field && (condition as any).fieldValue !== undefined) {
            return toExact(condition as any);
        }

        if ((condition as any).OR) {
            const parts = (condition as any).OR.map((x: any) => toExact(x));
            return `OR(${parts.join(',')})`;
        }

        if ((condition as any).AND) {
            const parts = (condition as any).AND.map((x: any) => toExact(x));
            return `AND(${parts.join(',')})`;
        }

        throw new Error('Unsupported condition format in ifCondition');
    }

}
import { Dictionary, FieldTypes } from './models/dictionary';
import { anyToXlsx, examplesToXlsx, booleanToXlsx, entityToXlsx, fontToXlsx, stringToXlsx, typeToXlsx, unitToXlsx, valueToFormula } from './models/value-converters';
import { Hyperlink, Range, Workbook, Worksheet } from './models/workbook';
import { Table } from './models/table';
import { ISchema, Schema, SchemaCondition, SchemaField } from '@guardian/interfaces';
import { PolicyTool } from '../entity';
import { IRowField } from './interfaces/row-field.interface';
import { SheetName } from './models/sheet-name';

export class JsonToXlsx {
    public static async generate(
        schemas: ISchema[],
        tools: PolicyTool[],
        toolSchemas: ISchema[]
    ): Promise<ArrayBuffer> {
        const workbook = new Workbook();
        const items: any = [];
        const schemaCache = new Map<string, string>();
        const toolCache = new Map<string, PolicyTool>();
        const names = new SheetName();
        for (const item of schemas) {
            const schema = new Schema(item);
            const sheetName = names.getSheetName(schema.name, 30);
            const worksheet = workbook.createWorksheet(sheetName);
            items.push({
                schema,
                worksheet,
                sheetName
            });
            schemaCache.set(schema.iri, sheetName);
        }
        if (schemas.length === 0) {
            workbook.createWorksheet('blank');
        }
        for (const item of tools) {
            toolCache.set(item.topicId, item);
        }
        for (const item of toolSchemas) {
            const schema = new Schema(item);
            const sheetName = names.getSheetName(schema.name, 23) + ' (tool)';
            const worksheet = workbook.createWorksheet(sheetName);
            const tool = toolCache.get(item.topicId);
            items.push({
                schema,
                worksheet,
                sheetName,
                tool
            });
            schemaCache.set(schema.iri, sheetName);
        }

        for (const item of items) {
            await JsonToXlsx.parseSheet(
                item.worksheet,
                item.schema,
                item.tool,
                schemaCache
            );
        }
        return await workbook.write();
    }

    public static async parseSheet(
        worksheet: Worksheet,
        schema: Schema,
        tool: PolicyTool,
        schemaCache: Map<string, string>
    ): Promise<void> {
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
            .setStyle(table.schemaStyle)
            .setValue(schema.description);
        worksheet
            .getCell(table.start.c + 1, table.getRow(Dictionary.SCHEMA_TYPE))
            .setStyle(table.schemaStyle)
            .setValue(entityToXlsx(schema.entity));

        if (tool) {
            worksheet.setValue(Dictionary.SCHEMA_TOOL, table.start.c, table.getRow(Dictionary.SCHEMA_TOOL));
            worksheet.setValue(Dictionary.SCHEMA_TOOL_ID, table.start.c, table.getRow(Dictionary.SCHEMA_TOOL_ID));
            worksheet.mergeCells(Range.fromColumns(table.start.c + 1, table.end.c - 1, table.getRow(Dictionary.SCHEMA_TOOL)));
            worksheet.mergeCells(Range.fromColumns(table.start.c + 1, table.end.c - 1, table.getRow(Dictionary.SCHEMA_TOOL_ID)));
            worksheet
                .getCell(table.start.c + 1, table.getRow(Dictionary.SCHEMA_TOOL))
                .setStyle(table.schemaStyle)
                .setValue(tool.name);
            worksheet
                .getCell(table.start.c + 1, table.getRow(Dictionary.SCHEMA_TOOL_ID))
                .setStyle(table.schemaStyle)
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
                fieldCache,
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
        fieldCache: Map<string, IRowField>,
        row: number
    ) {
        worksheet
            .getCell(table.getCol(Dictionary.QUESTION), row)
            .setValue(stringToXlsx(field.description))
            .setStyle(table.fieldStyle);
        worksheet
            .getCell(table.getCol(Dictionary.REQUIRED_FIELD), row)
            .setValue(booleanToXlsx(field.required))
            .setStyle(table.fieldStyle);
        worksheet
            .getCell(table.getCol(Dictionary.ALLOW_MULTIPLE_ANSWERS), row)
            .setValue(booleanToXlsx(field.isArray))
            .setStyle(table.fieldStyle);
        worksheet
            .getCell(table.getCol(Dictionary.PARAMETER), row)
            .setValue(anyToXlsx(undefined))
            .setStyle(table.fieldStyle);

        const type = FieldTypes.findByValue(field);
        if (type) {
            worksheet
                .getCell(table.getCol(Dictionary.FIELD_TYPE), row)
                .setValue(typeToXlsx(type))
                .setStyle(table.fieldStyle);
        } else if (field.isRef) {
            const sheetName = schemaCache.get(field.type);
            worksheet
                .getCell(table.getCol(Dictionary.FIELD_TYPE), row)
                .setLink(sheetName, new Hyperlink(sheetName, 'A1'))
                .setStyle(table.linkStyle);
        } else {
            throw new Error(`Unknown field type (${worksheet.name}: ${field.name}).`);
        }

        if (type && !field.isRef) {
            worksheet
                .getCell(table.getCol(Dictionary.ANSWER), row)
                .setValue(type.pars(examplesToXlsx(field)))
                .setStyle(table.fieldStyle);
        }
        if (type && type.pattern === true) {
            worksheet
                .getCell(table.getCol(Dictionary.PARAMETER), row)
                .setValue(stringToXlsx(field.pattern))
                .setStyle(table.fieldStyle);
        }
        if (field.unit) {
            worksheet
                .getCell(table.getCol(Dictionary.PARAMETER), row)
                .setValue(stringToXlsx(field.unit))
                .setStyle(table.paramStyle);
            worksheet.getCell(table.getCol(Dictionary.ANSWER), row)
                .setFormat(unitToXlsx(field));
        }
        if (field.font) {
            worksheet
                .getCell(table.getCol(Dictionary.PARAMETER), row)
                .setValue(JSON.stringify(field.font))
                .setStyle(table.paramStyle);
            worksheet
                .getCell(table.getCol(Dictionary.QUESTION), row)
                .setStyle(fontToXlsx(field.font, table.fieldStyle));
        }
        if (field.enum) {
            worksheet
                .getCell(table.getCol(Dictionary.PARAMETER), row)
                .setValue(field.enum.join('\r\n'))
                .setStyle(table.paramStyle);
            // worksheet.getCell(table.getCol(Dictionary.ANSWER), row)
            //     .setList(field.enum);
        }

        const name = worksheet.getPath(table.getCol(Dictionary.ANSWER), row);
        const path = worksheet.getFullPath(table.getCol(Dictionary.ANSWER), row);
        fieldCache.set(field.name, { name, path, row });
    }

    public static writeCondition(
        worksheet: Worksheet,
        table: Table,
        condition: SchemaCondition,
        fieldCache: Map<string, IRowField>,
    ) {
        const ifField = fieldCache.get(condition.ifCondition.field.name);
        const ifValue = valueToFormula(condition.ifCondition.fieldValue);
        const thenFormula = `EXACT(${ifField.name},${ifValue})`;
        const elseFormula = `NOT(EXACT(${ifField.name},${ifValue}))`;
        if (Array.isArray(condition.thenFields)) {
            for (const field of condition.thenFields) {
                const thenField = fieldCache.get(field.name);
                worksheet
                    .getCell(table.getCol(Dictionary.VISIBILITY), thenField.row)
                    .setFormulae(thenFormula)
                    .setStyle(table.fieldStyle);
            }
        }
        if (Array.isArray(condition.elseFields)) {
            for (const field of condition.elseFields) {
                const elseField = fieldCache.get(field.name);
                worksheet
                    .getCell(table.getCol(Dictionary.VISIBILITY), elseField.row)
                    .setFormulae(elseFormula)
                    .setStyle(table.fieldStyle);
            }
        }
    }
}
import { Dictionary, FieldTypes } from './models/dictionary';
import { anyToXlsx, arrayToXlsx, booleanToXlsx, entityToXlsx, fontToXlsx, stringToXlsx, typeToXlsx, unitToXlsx, valueToFormula } from './models/value-converters';
import { Range, Workbook, Worksheet } from './models/workbook';
import { Table } from './models/header-utils';
import { ISchema, Schema, SchemaCondition, SchemaField } from '@guardian/interfaces';

interface IRowField {
    name: string,
    path: string,
    row: number
}

export class JsonToXlsx {
    public static async parse(json: ISchema[]): Promise<Buffer> {
        const workbook = new Workbook();
        const items = [];
        const map = new Map<string, string>();
        for (const item of json) {
            const schema = new Schema(item);
            const sheetName = schema.name.slice(0, 30);
            const worksheet = workbook.createWorksheet(sheetName);
            items.push({
                schema,
                worksheet,
                sheetName
            });
            map.set(schema.iri, sheetName);
        }
        for (const item of items) {
            await JsonToXlsx.parseSheet(item.worksheet, item.schema, map);
        }
        return Buffer.from(await workbook.write());
    }

    public static async parseSheet(
        worksheet: Worksheet,
        schema: Schema,
        schemaCache: Map<string, string>
    ): Promise<void> {
        const range = worksheet.getRange();

        const table = new Table(range.s);
        table.setDefault();

        //Schema headers
        for (const header of table.schemaHeaders) {
            worksheet
                .setValue(header.title, header.column, header.row)
                .setStyle(header.style);
        }
        worksheet.setValue(schema.name, table.start.c, table.getRow(Dictionary.SCHEMA_NAME));
        worksheet.setValue(Dictionary.SCHEMA_DESCRIPTION, table.start.c, table.getRow(Dictionary.SCHEMA_DESCRIPTION));
        worksheet.setValue(Dictionary.SCHEMA_TYPE, table.start.c, table.getRow(Dictionary.SCHEMA_TYPE));
        worksheet.setValue(schema.description, table.start.c + 1, table.getRow(Dictionary.SCHEMA_DESCRIPTION));
        worksheet.setValue(entityToXlsx(schema.entity), table.start.c + 1, table.getRow(Dictionary.SCHEMA_TYPE));
        worksheet.mergeCells(Range.fromColumns(table.start.c, table.end.c - 1, table.getRow(Dictionary.SCHEMA_NAME)));
        worksheet.mergeCells(Range.fromColumns(table.start.c + 1, table.end.c - 1, table.getRow(Dictionary.SCHEMA_DESCRIPTION)));
        worksheet.mergeCells(Range.fromColumns(table.start.c + 1, table.end.c - 1, table.getRow(Dictionary.SCHEMA_TYPE)));

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
                .setLink(sheetName, `#'${sheetName}'!A1`)
                .setStyle(table.linkStyle);
        }

        if (!field.isRef) {
            worksheet
                .getCell(table.getCol(Dictionary.ANSWER), row)
                .setValue(type.pars(arrayToXlsx(field.examples, field.isArray)))
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
            worksheet.getCell(table.getCol(Dictionary.ANSWER), row)
                .setList(field.enum);
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
import { Schema, SchemaCategory, SchemaCondition, SchemaEntity, SchemaField, SchemaHelper } from '@guardian/interfaces';
import { Worksheet } from './workbook.js';
import { XlsxExpressions } from './xlsx-expressions.js';

export class XlsxSchema {
    public readonly worksheet: Worksheet;
    public readonly sheetName: string;
    public readonly schema: Schema;
    public readonly category: SchemaCategory;
    public expressions: XlsxExpressions;

    constructor(worksheet: Worksheet) {
        this.worksheet = worksheet;
        this.sheetName = worksheet.name;
        this.schema = new Schema();
        this.schema.name = worksheet.name;
        this.schema.category = SchemaCategory.POLICY;
    }

    public get iri(): string {
        return this.schema.iri;
    }

    public get name(): string {
        return this.schema.name;
    }

    public set name(value: string) {
        this.schema.name = value;
    }

    public get description(): string {
        return this.schema.description;
    }

    public set description(value: string) {
        this.schema.description = value;
    }

    public get entity(): SchemaEntity {
        return this.schema.entity;
    }

    public set entity(value: SchemaEntity) {
        this.schema.entity = value;
    }

    public get errors(): any[] {
        return this.schema.errors;
    }

    public set errors(value: any[]) {
        this.schema.errors = value;
    }

    public get fields(): SchemaField[] {
        return this.schema.fields;
    }

    public update(
        fields: SchemaField[],
        conditions: SchemaCondition[],
        expressions: XlsxExpressions
    ) {
        this.schema.setFields(fields, conditions);
        SchemaHelper.updateIRI(this.schema);
        this.expressions = expressions;
        expressions.setSchema(this.schema);
    }

    public updateExpressions(schemas: Schema[]) {
        this.expressions.updateSchemas(schemas);
    }

    public getVariables() {
        return this.expressions.getVariables();
    }
}

export class XlsxTool {
    public readonly worksheet: Worksheet;
    public readonly sheetName: string;
    public readonly name: string;
    public readonly messageId: string;
    public readonly category: SchemaCategory;

    constructor(
        worksheet: Worksheet,
        name: string,
        messageId: string
    ) {
        this.worksheet = worksheet;
        this.sheetName = worksheet.name;
        this.name = name || worksheet.name;
        this.messageId = messageId;
        this.category = SchemaCategory.TOOL;
    }
}

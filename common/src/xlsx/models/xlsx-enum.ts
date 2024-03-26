import { GenerateUUIDv4, Schema, SchemaField } from '@guardian/interfaces';
import { Range, Worksheet } from './workbook.js';

export class XlsxEnum {
    public readonly id: string;
    public readonly worksheet: Worksheet;
    public readonly sheetName: string;

    private _range: Range;
    private _data: string[];
    private _schema: Schema;
    private _field: SchemaField;
    private _schemaName: string;
    private _fieldName: string;

    constructor(worksheet: Worksheet) {
        this.id = GenerateUUIDv4();
        this.worksheet = worksheet;
        this.sheetName = worksheet.name;
        this._data = [];
    }

    public get data(): string[] {
        return this._data;
    }

    public get schema(): Schema {
        return this._schema;
    }

    public get field(): SchemaField {
        return this._field;
    }

    public get schemaName(): string {
        return this._schemaName;
    }

    public get fieldName(): string {
        return this._fieldName;
    }

    public setSchema(schema: Schema) {
        this._schema = schema;
        this._schemaName = schema.name;
    }

    public setField(field: SchemaField) {
        this._field = field;
        this._fieldName = field.description;
    }

    public setSchemaName(name: string) {
        this._schemaName = name;
    }

    public setFieldName(name: string) {
        this._fieldName = name;
    }

    public setRange(range: Range) {
        this._range = range;
    }

    public setData(data: string[]) {
        if (Array.isArray(data)) {
            this._data = data.filter(item => !!item);
        } else {
            this._data = [];
        }
    }

    public getValue(): string {
        const start = this.worksheet.getCell(this._range.startColumn, this._range.startRow);
        const end = this.worksheet.getCell(this._range.endColumn, this._range.endRow);
        const range = `'${this.sheetName}'!${start.address}:${end.address}`;
        return `=(ARRAYTOTEXT(${range}))`;
    }

    public getResult(): string {
        return this.data.join(';');
    }

    public getData(): string {
        const start = this.worksheet.getCell(this._range.startColumn, this._range.startRow);
        const end = this.worksheet.getCell(this._range.endColumn, this._range.endRow);
        const range = `'${this.sheetName}'!${start.address}:${end.address}`;
        return range;
    }
}

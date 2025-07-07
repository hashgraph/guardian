import { GenerateUUIDv4, Schema, SchemaField } from '@guardian/interfaces';
import { Range, Worksheet } from './workbook.js';
import { IPFS } from '../../helpers/index.js';

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
    private _ipfs: boolean;
    private _link: string;
    private _loaded: boolean;

    constructor(worksheet: Worksheet) {
        this.id = GenerateUUIDv4();
        this.worksheet = worksheet;
        this.sheetName = worksheet.name;
        this._ipfs = false;
        this._data = [];
        this._loaded = false;
    }

    public get data(): string[] {
        return this._data;
    }

    public get link(): string {
        return this._link;
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

    public get loaded(): boolean {
        return this._loaded;
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

    public setIPFS(ipfs: boolean) {
        this._ipfs = ipfs;
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

    public getEnum(): string[] | null {
        if (this._ipfs) {
            return null;
        } else {
            return this.data;
        }
    }

    public getLink(): string | null {
        if (this._ipfs) {
            return this.link;
        } else {
            return null;
        }
    }

    public async upload(preview: boolean): Promise<boolean> {
        try {
            if (this._ipfs) {
                if (preview) {
                    this._link = `ipfs://preview`;
                    this._loaded = true;
                    return true;
                } else {
                    const buffer = Buffer.from(JSON.stringify({
                        enum: this.data,
                    }))
                    const result = await IPFS.addFile(buffer);
                    if (result) {
                        this._link = `ipfs://${result.cid}`;
                        this._loaded = true;
                        return true;
                    } else {
                        this._loaded = false;
                        return false;
                    }
                }
            } else {
                this._loaded = true;
                return true;
            }
        } catch (error) {
            this._loaded = false;
            return false;
        }
    }
}

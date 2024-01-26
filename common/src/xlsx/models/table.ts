import ExcelJS from 'exceljs';
import { Dictionary } from './dictionary';
import { IPoint } from './workbook';
import { TableHeader } from './table-header';

export class Table {
    private readonly _fieldHeaders: Map<string, TableHeader>;
    private readonly _schemaHeaders: Map<string, TableHeader>;

    public readonly fieldHeadersStyle: Partial<ExcelJS.Style>;
    public readonly schemaNameStyle: Partial<ExcelJS.Style>;
    public readonly schemaDescriptionStyle: Partial<ExcelJS.Style>;
    public readonly fieldStyle: Partial<ExcelJS.Style>;
    public readonly linkStyle: Partial<ExcelJS.Style>;
    public readonly paramStyle: Partial<ExcelJS.Style>;

    public readonly start: IPoint;
    public end: IPoint;

    constructor(start: IPoint) {
        this.start = start;

        this.fieldHeadersStyle = {
            font: {
                size: 14,
                bold: true
            }
        }
        this.schemaNameStyle = {
            font: {
                size: 14,
                bold: true
            },
            alignment: {
                horizontal: 'center'
            },
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                    argb: 'FFBBBBBB'
                }
            }
        }
        this.schemaDescriptionStyle = {
            font: {
                size: 14,
                bold: false
            },
            alignment: {
                horizontal: 'center'
            },
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                    argb: 'FFBBBBBB'
                }
            }
        }
        this.fieldStyle = {
            font: {
                size: 11,
                bold: false
            },
            alignment: {
                wrapText: true
            }
        }
        this.linkStyle = {
            font: {
                size: 11,
                bold: false,
                underline: true,
                color: { argb: 'FF0000FF' }
            },
            alignment: {
                wrapText: true
            }
        }
        this.paramStyle = {
            font: {
                size: 11,
                bold: false
            },
            alignment: {
                // horizontal: 'fill',
                wrapText: false
            }
        }

        this._fieldHeaders = new Map<string, TableHeader>();
        this._fieldHeaders.set(Dictionary.REQUIRED_FIELD,
            new TableHeader(Dictionary.REQUIRED_FIELD, true)
                .setStyle(this.fieldHeadersStyle)
                .setWidth(20)
        );
        this._fieldHeaders.set(Dictionary.FIELD_TYPE,
            new TableHeader(Dictionary.FIELD_TYPE, true)
                .setStyle(this.fieldHeadersStyle)
                .setWidth(20)
        );
        this._fieldHeaders.set(Dictionary.PARAMETER,
            new TableHeader(Dictionary.PARAMETER, true)
                .setStyle(this.fieldHeadersStyle)
                .setWidth(20)
        );
        this._fieldHeaders.set(Dictionary.VISIBILITY,
            new TableHeader(Dictionary.VISIBILITY, false)
                .setStyle(this.fieldHeadersStyle)
                .setWidth(20)
        );
        this._fieldHeaders.set(Dictionary.QUESTION,
            new TableHeader(Dictionary.QUESTION, true)
                .setStyle(this.fieldHeadersStyle)
                .setWidth(50)
        );
        this._fieldHeaders.set(Dictionary.ALLOW_MULTIPLE_ANSWERS,
            new TableHeader(Dictionary.ALLOW_MULTIPLE_ANSWERS, true)
                .setStyle(this.fieldHeadersStyle)
                .setWidth(30)
        );
        this._fieldHeaders.set(Dictionary.ANSWER,
            new TableHeader(Dictionary.ANSWER, true)
                .setStyle(this.fieldHeadersStyle)
                .setWidth(50)
        );

        this._schemaHeaders = new Map<string, TableHeader>();
        this._schemaHeaders.set(Dictionary.SCHEMA_NAME,
            new TableHeader(Dictionary.SCHEMA_NAME, false)
                .setStyle(this.schemaNameStyle)
        );
        this._schemaHeaders.set(Dictionary.SCHEMA_DESCRIPTION,
            new TableHeader(Dictionary.SCHEMA_DESCRIPTION, false)
                .setStyle(this.fieldHeadersStyle)
        );
        this._schemaHeaders.set(Dictionary.SCHEMA_TYPE,
            new TableHeader(Dictionary.SCHEMA_TYPE, false)
                .setStyle(this.fieldHeadersStyle)
        );

        this._schemaHeaders.set(Dictionary.SCHEMA_TOOL,
            new TableHeader(Dictionary.SCHEMA_TOOL, false)
                .setStyle(this.fieldHeadersStyle)
        );
        this._schemaHeaders.set(Dictionary.SCHEMA_TOOL_ID,
            new TableHeader(Dictionary.SCHEMA_TOOL_ID, false)
                .setStyle(this.fieldHeadersStyle)
        );

        this.end = this.start;
    }

    public get fieldHeaders(): IterableIterator<TableHeader> {
        return this._fieldHeaders.values();
    }

    public get schemaHeaders(): IterableIterator<TableHeader> {
        return this._schemaHeaders.values();
    }

    public getCol(name: Dictionary): number {
        return this._fieldHeaders.get(name).column;
    }

    public getRow(name: Dictionary): number {
        return this._schemaHeaders.get(name).row;
    }

    public setCol(name: string, col: number): void {
        this._fieldHeaders.get(name)?.setPoint(col, -1);
    }

    public setRow(name: string, row: number): void {
        this._schemaHeaders.get(name)?.setPoint(-1, row);
    }

    public setDefault(tool: boolean): void {
        let row = this.start.c;
        let col = this.start.c;

        this._schemaHeaders.get(Dictionary.SCHEMA_NAME).setPoint(col, row++);
        this._schemaHeaders.get(Dictionary.SCHEMA_DESCRIPTION).setPoint(col, row++);
        this._schemaHeaders.get(Dictionary.SCHEMA_TYPE).setPoint(col, row++);

        if (tool) {
            this._schemaHeaders.get(Dictionary.SCHEMA_TOOL).setPoint(col, row++);
            this._schemaHeaders.get(Dictionary.SCHEMA_TOOL_ID).setPoint(col, row++);
        } else {
            this._schemaHeaders.delete(Dictionary.SCHEMA_TOOL);
            this._schemaHeaders.delete(Dictionary.SCHEMA_TOOL_ID);
        }

        this._fieldHeaders.get(Dictionary.REQUIRED_FIELD).setPoint(col++, row);
        this._fieldHeaders.get(Dictionary.FIELD_TYPE).setPoint(col++, row);
        this._fieldHeaders.get(Dictionary.PARAMETER).setPoint(col++, row);
        this._fieldHeaders.get(Dictionary.VISIBILITY).setPoint(col++, row);
        this._fieldHeaders.get(Dictionary.QUESTION).setPoint(col++, row);
        this._fieldHeaders.get(Dictionary.ALLOW_MULTIPLE_ANSWERS).setPoint(col++, row);
        this._fieldHeaders.get(Dictionary.ANSWER).setPoint(col++, row);

        this.end = {
            c: this.start.c + this._fieldHeaders.size,
            r: this.start.r + this._schemaHeaders.size,
        };
    }

    public setEnd(c: number, r: number) {
        this.end = { c, r };
    }

    public getErrorHeader(): TableHeader | null {
        for (const header of this._fieldHeaders.values()) {
            if (header.required && header.column === -1) {
                return header;
            }
        }
        for (const header of this._schemaHeaders.values()) {
            if (header.required && header.row === -1) {
                return header;
            }
        }
        return null;
    }

    public isName(value: string): boolean {
        return true;
    }

    public isSchemaHeader(value: string): boolean {
        return this._schemaHeaders.has(value);
    }

    public isFieldHeader(value: string): boolean {
        return this._fieldHeaders.has(value);
    }
}
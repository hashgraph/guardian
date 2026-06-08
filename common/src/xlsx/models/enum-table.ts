import ExcelJS from 'exceljs';
import { Dictionary } from './dictionary.js';
import { IPoint } from './workbook.js';
import { TableHeader } from './table-header.js';

export class SharedEnumTable {
    static readonly COL_NAME  = 1;
    static readonly COL_IPFS  = 2;
    static readonly COL_VALUE = 3;
    static readonly HEADER_ROW     = 1;
    static readonly FIRST_DATA_ROW = 2;

    public readonly headerStyle: Partial<ExcelJS.Style> = {
        font: { size: 14, bold: true },
        border: {
            left:   { style: 'thin', color: { argb: 'FF000000' } },
            right:  { style: 'thin', color: { argb: 'FF000000' } },
            top:    { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } }
        }
    };

    public readonly itemStyle: Partial<ExcelJS.Style> = {
        font: { size: 11, bold: false },
        alignment: { wrapText: true },
        border: {
            left:   { style: 'thin', color: { argb: 'FF000000' } },
            right:  { style: 'thin', color: { argb: 'FF000000' } },
            top:    { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } }
        }
    };
}

export class EnumTable {
    private readonly _headers: Map<string, TableHeader>;

    public readonly headersStyle: Partial<ExcelJS.Style>;
    public readonly descriptionStyle: Partial<ExcelJS.Style>;
    public readonly itemStyle: Partial<ExcelJS.Style>;

    public readonly start: IPoint;
    public end: IPoint;
    private column: number;

    constructor(start: IPoint) {
        this.start = start;

        this.headersStyle = {
            font: {
                size: 14,
                bold: true
            },
            border: {
                left: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                },
                right: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                },
                top: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                },
                bottom: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                }
            }
        };

        this.descriptionStyle = {
            font: {
                size: 11,
                bold: false
            },
            alignment: {
                wrapText: true
            },
            border: {
                top: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                },
                bottom: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                },
                right: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                }
            }
        }

        this.itemStyle = {
            font: {
                size: 11,
                bold: false
            },
            alignment: {
                wrapText: true
            },
            border: {
                left: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                },
                right: {
                    style: 'thin',
                    color: {
                        argb: 'FF000000'
                    }
                }
            }
        }

        this._headers = new Map<string, TableHeader>();
        this._headers.set(Dictionary.ENUM_IPFS,
            new TableHeader(Dictionary.ENUM_IPFS, false)
                .setStyle(this.headersStyle)
                .setWidth(30)
        );
        this.end = this.start;
    }

    public get headers(): IterableIterator<TableHeader> {
        return this._headers.values();
    }

    public getCol(): number {
        return this.column;
    }

    public getRow(name: Dictionary): number {
        return this._headers.get(name).row;
    }

    public setCol(col: number): void {
        this.column = col;
    }

    public setRow(name: string, row: number): void {
        this._headers.get(name)?.setPoint(-1, row);
    }

    public setDefault(): void {
        const col = this.start.c;
        let row = this.start.r;

        this._headers.get(Dictionary.ENUM_IPFS).setPoint(col, row++);
        this.column = this.start.c
        this.end = {
            c: this.start.c + 2,
            r: this.start.r + this._headers.size,
        };
    }

    public setEnd(c: number, r: number) {
        this.end = { c, r };
    }

    public isHeader(value: string): boolean {
        return this._headers.has(value);
    }
}

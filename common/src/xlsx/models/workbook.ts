import ExcelJS from 'exceljs';

export interface IPoint {
    r: number,
    c: number
}

export class Range {
    public readonly startColumn: number;
    public readonly startRow: number;
    public readonly endColumn: number;
    public readonly endRow: number;
    public readonly s: IPoint;
    public readonly e: IPoint;

    constructor(
        startColumn: number,
        startRow: number,
        endColumn: number,
        endRow: number
    ) {
        this.startColumn = startColumn;
        this.startRow = startRow;
        this.endColumn = endColumn;
        this.endRow = endRow;
        this.s = {
            r: startRow,
            c: startColumn
        }
        this.e = {
            r: endRow,
            c: endColumn
        }
    }

    public static fromColumns(startColumn: number, endColumn: number, row: number): Range {
        return new Range(startColumn, row, endColumn, row);
    }

    public static fromRows(startRow: number, endRow: number, column: number): Range {
        return new Range(column, startRow, column, endRow);
    }
}

export class Workbook {
    private readonly workbook: ExcelJS.Workbook;

    constructor() {
        this.workbook = new ExcelJS.Workbook();
    }

    public get sheetNames(): string[] {
        return this.workbook.worksheets.map((sheet) => sheet.name);
    }

    public get sheetLength(): number {
        return this.workbook.worksheets.length
    }

    public getWorksheet(sheetName: string): Worksheet {
        const worksheet = this.workbook.getWorksheet(sheetName);
        if (worksheet) {
            return new Worksheet(sheetName, worksheet);
        } else {
            return null;
        }
    }

    public getWorksheetByIndex(index: number): Worksheet {
        const worksheet = this.workbook.worksheets[index];
        if (worksheet) {
            return new Worksheet(worksheet.name, worksheet);
        } else {
            return null;
        }
    }

    public getWorksheets(): Worksheet[] {
        return this.workbook.worksheets.map(ws => new Worksheet(ws.name, ws));
    }

    public createWorksheet(sheetName: string): Worksheet {
        const worksheet = this.workbook.addWorksheet(sheetName);
        return new Worksheet(sheetName, worksheet);
    }

    public async read(buffer: ExcelJS.Buffer): Promise<void> {
        await this.workbook.xlsx.load(buffer);
    }

    public async write(): Promise<ArrayBuffer> {
        return await this.workbook.xlsx.writeBuffer();
    }
}

export class Worksheet {
    public readonly name: string;
    private readonly worksheet: ExcelJS.Worksheet;

    constructor(name: string, worksheet: ExcelJS.Worksheet) {
        this.name = name;
        this.worksheet = worksheet;
        this.worksheet.properties.outlineProperties = {
            summaryBelow: false,
            summaryRight: false,
        };
    }

    public get rowCount(): number {
        return this.worksheet.rowCount;
    }

    public get columnCount(): number {
        return this.worksheet.columnCount;
    }

    public getRange(): Range {
        return new Range(
            1,
            1,
            this.worksheet.columnCount + 1,
            this.worksheet.rowCount + 1
        )
    }

    public outColumnRange(c: number): boolean {
        return (!Number.isFinite(c) || c < 1 || c > 255)
    }

    public outRowRange(r: number): boolean {
        return (!Number.isFinite(r) || r < 1 || r > 65000)
    }

    public checkColumnRange(c: number) {
        if (this.outColumnRange(c)) {
            throw Error(`Invalid column range ${c}`);
        }
    }

    public checkRowRange(r: number) {
        if (this.outRowRange(r)) {
            throw Error(`Invalid row range ${r}`);
        }
    }

    public checkRange(c: number, r: number) {
        this.checkColumnRange(c);
        this.checkRowRange(r);
    }

    public getCol(c: number): Column {
        this.checkColumnRange(c);
        return new Column(this.worksheet.getColumn(c));
    }

    public getRow(r: number): Row {
        this.checkRowRange(r);
        return new Row(this.worksheet.getRow(r));
    }

    public getCell(c: number, r: number): Cell {
        this.checkRange(c, r);
        return new Cell(this.worksheet.getCell(r, c));
    }

    public getValue<T>(c: number, r: number): T {
        return this.getCell(c, r).getValue<T>();
    }

    public getFormulae(c: number, r: number): string {
        return this.getCell(c, r).getFormulae();
    }

    public getPath(c: number, r: number): string {
        return this.getCell(c, r).getPath();
    }

    public getFullPath(c: number, r: number): string {
        const path = this.getCell(c, r).getPath();
        return `'${this.name}'!${path}`;
    }

    public setValue<T extends ExcelJS.CellValue>(value: T, c: number, r: number): Cell {
        return this.getCell(c, r).setValue<T>(value);
    }

    public setStyle(style: ExcelJS.Style, c: number, r: number): Cell {
        return this.getCell(c, r).setStyle(style);
    }

    public mergeCells(range: Range): Worksheet {
        this.worksheet.mergeCells(range.startRow, range.startColumn, range.endRow, range.endColumn);
        return this;
    }

    public empty(startCol: number, endCol: number, row: number): boolean {
        for (let col = startCol; col < endCol; col++) {
            const value = this.getValue(col, row);
            if (value) {
                return false;
            }
        }
        return true;
    }
}

export class Cell {
    private readonly cell: ExcelJS.Cell;

    constructor(cell: ExcelJS.Cell) {
        this.cell = cell;
    }

    public get address(): string {
        return this.cell?.address;
    }

    public setValue<T extends ExcelJS.CellValue>(value: T): Cell {
        this.cell.value = value;
        return this;
    }

    public setFormulae(formula: string, result?: any): Cell {
        if (result) {
            this.cell.value = { formula, result };
        } else {
            this.cell.value = { formula };
        }
        return this;
    }

    public setStyle(style: Partial<ExcelJS.Style>): Cell {
        if (style) {
            this.cell.style = Object.assign(this.cell.style || {}, style);
        }
        return this;
    }

    public setFormat(numFmt: string): Cell {
        if (numFmt) {
            this.cell.style = Object.assign(this.cell.style || {}, { numFmt });
            this.cell.numFmt = numFmt;
        }
        return this;
    }

    public setFont(font: Partial<ExcelJS.Font>): Cell {
        if (font) {
            this.cell.style.font = Object.assign(this.cell.style.font || {}, font);
        }
        return this;
    }

    public setLink(text: string, hyperlink: Hyperlink): Cell {
        this.cell.value = {
            text,
            hyperlink: hyperlink.link
        };
        return this;
    }

    public getLink(): Hyperlink {
        if (this.cell?.hyperlink) {
            return Hyperlink.from(this.cell.hyperlink);
        }
        if ((this.cell?.value as ExcelJS.CellHyperlinkValue)?.hyperlink) {
            return Hyperlink.from((this.cell.value as ExcelJS.CellHyperlinkValue).hyperlink);
        }
        return null;
    }

    public setList(items: string[]): Cell {
        if (Array.isArray(items)) {
            this.cell.dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${items.join(',')}"`]
            };
        }
        return this;
    }

    public setList2(formulae: string): Cell {
        this.cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [formulae]
        };
        return this;
    }

    public getValue<T>(): T {
        if (this.cell && this.cell.value) {
            if (typeof this.cell.value === 'object') {
                return (this.cell.value as ExcelJS.CellHyperlinkValue).text as T;
            } else {
                return this.cell.value as T;
            }
        }
        return null;
    }

    public getFormulae(): string {
        return this.cell?.formula;
    }

    public getResult(): any {
        return this.cell?.result;
    }

    public getPath(): string {
        return this.cell?.address;
    }

    public getFormat(): string {
        return this.cell?.numFmt;
    }

    public getFont(): Partial<ExcelJS.Font> {
        return this.cell?.style?.font;
    }

    public getList(): string[] {
        try {
            if (
                this.cell?.dataValidation?.type === 'list' &&
                this.cell.dataValidation.formulae.length === 1
            ) {
                const formulae = this.cell.dataValidation.formulae[0];
                return formulae.slice(1, formulae.length - 1).split(',')
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    public isFormulae(): boolean {
        return !!this.getFormulae();
    }

    public isValue(): boolean {
        return !!this.getValue();
    }
}

export class Column {
    private readonly column: ExcelJS.Column;

    constructor(column: ExcelJS.Column) {
        this.column = column;
    }

    public setWidth(width: number): Column {
        if (width) {
            this.column.width = width;
        }
        return this;
    }
}

export class Row {
    private readonly row: ExcelJS.Row;

    constructor(row: ExcelJS.Row) {
        this.row = row;
    }

    public setOutline(lvl: number): void {
        this.row.outlineLevel = lvl;
    }

    public getOutline(): number {
        return this.row?.outlineLevel || 0;
    }
}

export class Hyperlink {
    public readonly worksheet: string;
    public readonly cell: string;
    public readonly link: string;

    constructor(worksheet: string, cell: string) {
        this.worksheet = worksheet;
        this.cell = cell
        this.link = `#'${worksheet}'!${cell}`;
    }

    public static from(link: string): Hyperlink | null {
        try {
            if (link) {
                // tslint:disable-next-line
                let [worksheet, cell] = link.split('!');
                if (worksheet.startsWith('#')) {
                    worksheet = worksheet.slice(1);
                }
                if (worksheet.startsWith('\'')) {
                    worksheet = worksheet.slice(1, -1);
                }
                if (worksheet.startsWith('\"')) {
                    worksheet = worksheet.slice(1, -1);
                }
                if (worksheet && cell) {
                    return new Hyperlink(worksheet, cell);
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}
import ExcelJS from 'exceljs';

export class TableHeader {
    public title: string;
    public column: number;
    public row: number;
    public style: Partial<ExcelJS.Style>;
    public width: number;
    public required: boolean;

    constructor(title: string, required?: boolean) {
        this.title = title;
        this.column = -1;
        this.row = -1;
        this.style = null;
        this.width = null;
        this.required = !!required;
    }

    public setStyle(style: Partial<ExcelJS.Style>): TableHeader {
        this.style = style;
        return this;
    }

    public setWidth(width: number): TableHeader {
        this.width = width;
        return this;
    }

    public setPoint(column: number, row: number) {
        this.column = column;
        this.row = row;
    }
}

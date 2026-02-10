import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

interface IConfig {
    header: string;
    columns: {
        id?: any;
        field: any;
        width: any;
        title: any;
        colClass?: any;
    }[],
    data: any[];
    height?: any;
    buttons: {
        name: string;
        class: string;
    }[];
}

@Component({
    selector: 'app-grid-dialog',
    templateUrl: './grid-dialog.component.html',
    styleUrls: ['./grid-dialog.component.scss'],
})
export class GridDialogComponent implements OnInit {
    public loading = true;
    public header: string;
    public columns: {
        id?: any;
        field: any;
        width: any;
        title: any;
        colClass?: any;
    }[];
    public data: any[];
    public buttons: {
        name: string,
        class: string,
    }[];
    public height: any

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const _config: IConfig = this.config.data;
        this.header = _config.header;
        this.columns = _config.columns;
        this.data = _config.data;
        this.height = _config.height || 52;
        this.buttons = _config.buttons;
    }

    ngOnInit() {
        this.loading = false;
    }

    onClick(button?: any): void {
        this.ref.close(button?.name);
    }

    public colClass(column: any, row: any):string {
        if (column.colClass) {
            if (typeof column.colClass === 'function') {
                return column.colClass(column, row);
            } else {
                return column.colClass;
            }
        }
        return ''
    }
}
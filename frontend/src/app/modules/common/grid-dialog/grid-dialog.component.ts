import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-grid-dialog',
    templateUrl: './grid-dialog.component.html',
    styleUrls: ['./grid-dialog.component.scss'],
})
export class GridDialogComponent implements OnInit {
    public loading = true;
    public header: string;
    public columns: any[];
    public data: any[];
    public buttons: {
        name: string,
        class: string,
    }[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.data.header;
        this.columns = this.config.data.columns;
        this.data = this.config.data.data;
        this.buttons = this.config.data.buttons;
    }

    ngOnInit() {
        this.loading = false;
    }

    onClick(button?: any): void {
        this.ref.close(button?.name);
    }
}
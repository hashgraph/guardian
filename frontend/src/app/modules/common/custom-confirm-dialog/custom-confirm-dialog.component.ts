import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-custom-confirm-dialog',
    templateUrl: './custom-confirm-dialog.component.html',
    styleUrls: ['./custom-confirm-dialog.component.scss'],
})
export class CustomConfirmDialogComponent implements OnInit {
    public loading = true;
    public header: string;
    public text: string;
    public buttons: {
        name: string,
        class: string,
    }[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.data.header;
        this.text = this.config.data.text;
        this.buttons = this.config.data.buttons;
    }

    ngOnInit() {
        this.loading = false;
    }

    onClick(button?: any): void {
        this.ref.close(button?.name);
    }
}
import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-schema-delete-warning-dialog.',
    templateUrl: './schema-delete-warning-dialog.component.html',
    styleUrls: ['./schema-delete-warning-dialog.component.scss'],
})
export class SchemaDeleteWarningDialogComponent implements OnInit {
    public loading = true;
    public header: string;
    public text: string;
    public buttons: {
        name: string,
        class: string,
    }[];
    public warningItems: string[] = [];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.data.header;
        this.text = this.config.data.text;
        this.buttons = this.config.data.buttons;
        this.warningItems = this.config.data.warningItems || [];
    }

    ngOnInit() {
        this.loading = false;
    }

    onClick(button?: any): void {
        this.ref.close(button?.name);
    }
}

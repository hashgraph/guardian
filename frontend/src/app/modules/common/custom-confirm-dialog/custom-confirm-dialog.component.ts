import { Component, OnInit } from '@angular/core';
import { GenerateUUIDv4 } from '@guardian/interfaces';
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
    public texts: string[];
    public buttons: {
        name: string,
        class: string,
    }[];
    public options?: {
        title: string,
        sub?: string,
        value: any,
        id: string
    }[];
    public option: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.header = this.config.data.header;
        this.text = this.config.data.text;
        this.texts = this.config.data.texts;

        this.buttons = this.config.data.buttons;
        this.options = this.config.data.options;
        this.option = this.config.data.optionValue;
        if (this.options) {
            for (const op of this.options) {
                op.id = GenerateUUIDv4();
            }
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    onClick(button?: any): void {
        if (this.options) {
            this.ref.close({
                button: button?.name,
                option: this.option
            });
        } else {
            this.ref.close(button?.name);
        }
    }
}
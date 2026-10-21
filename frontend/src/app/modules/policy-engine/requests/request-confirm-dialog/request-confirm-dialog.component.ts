import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { hideSecrets } from '../request-labels';

export interface IConfirmRow {
    name: string;
    value: string;
}

export interface IConfirmButton {
    name: string;
    class: 'primary' | 'secondary' | 'delete';
}

/**
 * Asks to confirm an operation on a request: what it is about, and what will happen
 */
@Component({
    selector: 'app-request-confirm-dialog',
    templateUrl: './request-confirm-dialog.component.html',
    styleUrls: [
        '../request-common.scss'
    ],
    standalone: false
})
export class RequestConfirmDialog {
    public header: string;
    public text: string;
    public rows: IConfirmRow[];
    public list: string[];
    public json: string = '';
    public buttons: IConfirmButton[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const { header, text, rows, list, document, buttons } = this.config.data;
        this.header = header;
        this.text = text;
        this.rows = rows || [];
        this.list = list || [];
        this.buttons = buttons || [];
        if (document) {
            this.json = JSON.stringify(hideSecrets(document), null, 4);
        }
    }

    public onClick(button?: IConfirmButton): void {
        this.ref.close(button?.name);
    }
}

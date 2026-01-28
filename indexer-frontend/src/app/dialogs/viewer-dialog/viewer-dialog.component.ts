import {Component} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import { HederaExplorer, HederaType } from '@components/hedera-explorer/hedera-explorer.component';
import { CommonModule } from '@angular/common';

/**
 * Dialog for display json
 */
@Component({
    standalone: true,
    selector: 'viewer-dialog',
    templateUrl: './viewer-dialog.component.html',
    styleUrls: ['./viewer-dialog.component.scss'],
    imports: [
        CommonModule,
        HederaExplorer,
    ]
})
export class ViewerDialog {
    public title: string = '';
    public type: any = 'TEXT';
    public text: any = '';
    public json: any = '';
    public links: any = [];

    public data: any

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.data = this.config.data;
    }

    ngOnInit() {
        const {
            value,
            title,
            type,
        } = this.data;

        this.title = title;
        this.type = type || 'TEXT';
        if (this.type === 'JSON') {
            this.json = value ? JSON.stringify((value), null, 4) : '';
        }
        if (this.type === 'TEXT') {
            this.text = value || '';
        }
        if (this.type === 'LINK') {
            if (Array.isArray(value)) {
                this.links = [];
                for (const link of value) {
                    this.links.push(link);
                }
            } else if (value) {
                this.links = [value];
            }
        }
    }

    onClose(): void {
        this.dialogRef.close(null);
    }
}

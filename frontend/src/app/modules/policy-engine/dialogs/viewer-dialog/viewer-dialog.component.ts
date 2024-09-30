import { Component, Inject, Input } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for display json
 */
@Component({
    selector: 'viewer-dialog',
    templateUrl: './viewer-dialog.component.html',
    styleUrls: ['./viewer-dialog.component.scss']
})
export class ViewerDialog {
    public title: string = '';
    public type: any = 'TEXT';
    public text: any = '';
    public json: any = '';
    public links: any = [];

    constructor(
        public dialogRef: MatDialogRef<ViewerDialog>,
        @Inject(MAT_DIALOG_DATA) public data: {
            title: string,
            value: any,
            type: 'LINK' | 'TEXT' | 'JSON'
        }) {
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

    onClick(): void {
        this.dialogRef.close(null);
    }
}

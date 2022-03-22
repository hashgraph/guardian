import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'icon-preview-dialog',
    templateUrl: './icon-preview-dialog.component.html',
    styleUrls: ['./icon-preview-dialog.component.css']
})
export class IconPreviewDialog {
    iconType!: string;
    icon!: string;
    loading: boolean = true
    

    constructor(
        public dialogRef: MatDialogRef<IconPreviewDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
            this.iconType = data.iconType;
            this.icon = data.icon;
    }
    
    onLoad() {
        this.loading = false;
    }

    ngOnInit() {
    }
}
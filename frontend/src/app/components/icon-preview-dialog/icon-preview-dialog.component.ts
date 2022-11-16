import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IconType } from '@guardian/interfaces';
import { IPFSService } from 'src/app/services/ipfs.service';

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
    loading: boolean = false;


    constructor(
        public dialogRef: MatDialogRef<IconPreviewDialog>,
        private ipfs: IPFSService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
            this.iconType = data.iconType;
            if (this.iconType == IconType.CUSTOM) {
                this.loading = true;
                this.ipfs
                    .getImageByLink(data.icon)
                    .then((res) => {
                        this.icon = res;
                    })
                    .finally(() => (this.loading = false));
            } else {
                this.icon = data.icon;
            }
    }

    ngOnInit() {
    }
}
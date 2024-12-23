import {Component, Inject} from '@angular/core';
import {IconType} from '@guardian/interfaces';
import {IPFSService} from 'src/app/services/ipfs.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

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
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private ipfs: IPFSService,
    ) {
        const data = this.config.data

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

    onClose(): void {
        this.dialogRef.close(null);
    }
}

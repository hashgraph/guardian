import {Component, OnInit, Inject} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

// import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

/**
 * Dialog for display json
 */
@Component({
    selector: 'document-dialog-block',
    templateUrl: './document-dialog-block.component.html',
    styleUrls: ['./document-dialog-block.component.scss']
})
export class DocumentDialogBlock implements OnInit {
    title: string = '';
    json: string = '';

    public data: any

    constructor(
        // public dialogRef: MatDialogRef<DocumentDialogBlock>,
        // @Inject(MAT_DIALOG_DATA) public data: any
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.data = this.config.data;
    }

    ngOnInit() {
        const {
            document,
            title,
            dialogType,
            dialogClass,
        } = this.data;

        this.title = title;
        this.json = JSON.stringify((document), null, 4);
    }

    onClick(): void {
        this.dialogRef.close(null);
    }
}

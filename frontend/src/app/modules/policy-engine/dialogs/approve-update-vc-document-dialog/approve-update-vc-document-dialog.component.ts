import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Export schema dialog.
 */
@Component({
    selector: 'approve-update-vc-document-dialog',
    templateUrl: './approve-update-vc-document-dialog.component.html',
    styleUrls: ['./approve-update-vc-document-dialog.component.scss'],
})
export class ApproveUpdateVcDocumentDialogComponent {
    public text: string;
    public okBtnName: string;
    public closeBtnName: string;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig
    ) {
        const data = this.config.data;
        this.text = data.text;
        this.okBtnName = data?.okBtnName ?? 'Save';
        this.closeBtnName = data?.closeBtnName ?? 'Close';
    }

    ngOnInit() {}

    public onSave(): void {
        this.dialogRef.close(true);
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }
}

import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToastService } from 'src/app/services/toast.service';

/**
 * Registration page.
 */
@Component({
    selector: 'app-otp-codes-dialog',
    templateUrl: './otp-codes-dialog.component.html',
    styleUrls: ['./otp-codes-dialog.component.scss'],
    standalone: false
})
export class OtpCodesDialogComponent implements OnInit {
    public codes: string[] | undefined;
    public codesText: string;
    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,
        private toastService: ToastService,
    ) {
        this.codes = this.dialogConfig.data?.codes;
        this.codesText = this.codes?.join('\t') || '';
    }

    ngOnInit() {
    }

    onCancelClick() {
        this.dialogRef.close(false);
    }

    onOkClick() {
        this.dialogRef.close(true);
    }

    onCopy() {
        this.toastService.success('Codes copied');
    }

    saveToFile() {
        const downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(
            new Blob([Uint8Array.from(new TextEncoder().encode(this.codesText))], {
                type: 'application/text'
            })
        );
        downloadLink.setAttribute('download', `mgs_recovery_codes.txt`);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
    }
}

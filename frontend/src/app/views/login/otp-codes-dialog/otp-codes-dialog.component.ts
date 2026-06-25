import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { AuthService } from 'src/app/services/auth.service';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToastrService } from "ngx-toastr";

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
        private toastr: ToastrService,
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
        this.toastr.success('Codes copied');
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
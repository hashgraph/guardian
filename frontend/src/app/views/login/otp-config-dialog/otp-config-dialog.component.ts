import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { AuthService } from 'src/app/services/auth.service';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToastrService } from "ngx-toastr";


/**
 * Registration page.
 */
@Component({
    selector: 'app-config-otp-dialog',
    templateUrl: './otp-config-dialog.component.html',
    styleUrls: ['./otp-config-dialog.component.scss']
})
export class OtpConfigDialogComponent implements OnInit {
    public form = new UntypedFormGroup({
        token: new UntypedFormControl('', [
            Validators.required,
            Validators.minLength(6),
            Validators.maxLength(6),
            noWhitespaceValidator(),
        ]),
    });

    public config: any;
    public tokenError: boolean = false;

    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,
        private auth: AuthService,
        private toastr: ToastrService,
        private authState: AuthStateService
    ) {
        this.config = this.dialogConfig.data?.config;
    }

    ngOnInit() {
    }
    secretCopied() {
        this.toastr.success('Secret copied');
    }

    onNoClick() {
        this.dialogRef.close(null);
    }

    onEnable() {
        const token = this.form.value.token;
        
        this.auth.confirmOtpSecret(token).subscribe(result => {
            if (!result.success) {
                this.tokenError = true;                
            }
            else {
                this.tokenError = false;
                this.dialogRef.close(result.backupCodes);
            }
        });
    }
}
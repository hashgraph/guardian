import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { AuthService } from 'src/app/services/auth.service';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Registration page.
 */
@Component({
    selector: 'app-otp-dialog',
    templateUrl: './otp-dialog.component.html',
    styleUrls: ['./otp-dialog.component.scss'],
    standalone: false
})
export class OtpDialogComponent implements OnInit {
    public form = new UntypedFormGroup({
        token: new UntypedFormControl('', [
            Validators.required,
            Validators.minLength(6),
            Validators.maxLength(6),            
            noWhitespaceValidator(),
        ]),        
    });


    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,
        private auth: AuthService,
        private router: Router,
        private authState: AuthStateService
    ) {      
        
    }

    ngOnInit() {
        
    }

    onNoClick() {
        this.dialogRef.close(null);
    }

    onChange() {
        const token = this.form.value.token;
        this.dialogRef.close(token);
    }
}
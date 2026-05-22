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
    selector: 'app-otp-disable-dialog',
    templateUrl: './otp-disable-dialog.component.html',
    styleUrls: ['./otp-disable-dialog.component.scss'],
    standalone: false
})
export class OtpDisableDialogComponent implements OnInit {
    
    constructor(
        private dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,        
    ) {      
        
    }

    ngOnInit() {        
    }

    onCancelClick() {
        this.dialogRef.close(false);
    }

    onDisableClick() {        
        this.dialogRef.close(true);
    }
}
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-forgot-password-dialog',
    templateUrl: './forgot-password-dialog.component.html',
    styleUrls: ['./forgot-password-dialog.component.scss']
})
export class ForgotPasswordDialogComponent implements OnInit {
    forgotPasswordFormGroup: FormGroup = new FormGroup({
        username: new FormControl(''),
    });

    constructor(private dialogRef: DynamicDialogRef, private dialogConfig: DynamicDialogConfig,) {
    }

    ngOnInit(): void {
        this.forgotPasswordFormGroup.controls.username.setValue(this.dialogConfig.data.login)
    }

    onNoClick() {
        this.dialogRef.close(false);
    }

    onSubmit() {
        this.dialogRef.close();
    }

}

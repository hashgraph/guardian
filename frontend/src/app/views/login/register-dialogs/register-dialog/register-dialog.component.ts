import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-register-dialog',
    templateUrl: './register-dialog.component.html',
    styleUrls: ['./register-dialog.component.scss']
})
export class RegisterDialogComponent implements OnInit {

    registerFormGroup: UntypedFormGroup = new UntypedFormGroup({
        username: new UntypedFormControl('', {validators: [Validators.pattern(`\\S+`), Validators.required]}),
        password: new UntypedFormControl('', {validators: [Validators.pattern(`\\S+`), Validators.required]}),
        confirmPassword: new UntypedFormControl('', {validators: [Validators.pattern(`\\S+`), Validators.required]}),
        // email: new FormControl('', {validators: [Validators.pattern(`([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)`), Validators.required]}),
    });

    constructor(private dialogRef: DynamicDialogRef, private dialogConfig: DynamicDialogConfig,) {
    }

    ngOnInit(): void {
    }

    onNoClick() {
        this.dialogRef.close(false);
    }

    onSubmit() {
        this.dialogRef.close(this.registerFormGroup.value);
    }

}

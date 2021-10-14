import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
    selector: 'policy-dialog',
    templateUrl: './policy-dialog.component.html',
    styleUrls: ['./policy-dialog.component.css']
})
export class PolicyDialog {
    started = false;
    dataForm = this.fb.group({
        name: ['', Validators.required],
        type: ['', Validators.required],
        userSchema: ['', Validators.required],
        dataSchema: ['', Validators.required],
        rules: ['', Validators.required],
        tokenId: ['', Validators.required],
    });
    userSchemes: any[];
    dataSchemes: any[];
    tokens: any[];

    constructor(
        public dialogRef: MatDialogRef<PolicyDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.userSchemes = data.userSchemes || [];
        this.dataSchemes = data.dataSchemes || [];
        this.tokens = data.tokens || [];
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.dialogRef.close(data);
        }
    }
}
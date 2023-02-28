import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

/**
 * Dialog for creating tokens.
 */
@Component({
    selector: 'token-dialog',
    templateUrl: './token-dialog.component.html',
    styleUrls: ['./token-dialog.component.css']
})
export class TokenDialog {
    started = false;
    dataForm = this.fb.group({
        draftToken: [true, Validators.required],
        tokenName: ['Token Name', Validators.required],
        tokenSymbol: ['F', Validators.required],
        tokenType: ['fungible', Validators.required],
        decimals: ['2'],
        initialSupply: ['0'],
        enableAdmin: [true, Validators.required],
        changeSupply: [true, Validators.required],
        enableFreeze: [false, Validators.required],
        enableKYC: [false, Validators.required],
        enableWipe: [true, Validators.required]
    });
    title: string = "New Token";
    description: string = "";
    token: any = null;
    valid: boolean = true;
    readonly: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<TokenDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        if (data) {
            if (data.title) {
                this.title = data.title;
            } else {
                if (data.token) {
                    this.title = "Edit Token";
                } else {
                    this.title = "New Token";
                }
            }
            if (data.description) {
                this.description = data.description;
            }
            if (data.token) {
                this.dataForm?.patchValue(data.token);
                this.token = data.token;
                if (data.token.draftToken) {
                    this.readonly = false;
                } else {
                    this.readonly = true;
                }
            }
        }
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onCreate() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            if (data.tokenType == 'fungible') {
                data.decimals = data.decimals || '0';
                data.initialSupply = '0';
            } else {
                data.decimals = '0';
                data.initialSupply = '0';
            }
            this.dialogRef.close(data);
        }
    }

    onSave() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.dialogRef.close(data);
        }
    }
}

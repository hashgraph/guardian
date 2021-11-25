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
        tokenName: ['Token Name', Validators.required],
        tokenSymbol: ['F', Validators.required],
        tokenType: ['fungible', Validators.required],
        decimals: ['2'],
        initialSupply: ['0'],
        enableAdmin: [true, Validators.required],
        changeSupply: [true, Validators.required],
        enableFreeze: [true, Validators.required],
        enableKYC: [true, Validators.required],
        enableWipe: [true, Validators.required],
    });
    ft: boolean = true;

    constructor(
        public dialogRef: MatDialogRef<TokenDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
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

    onChangeType() {
        const data = this.dataForm.value;
        this.ft = (data && data.tokenType == 'fungible')
    }
}
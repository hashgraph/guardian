import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { ContractService } from 'src/app/services/contract.service';

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
    dataForm = new FormGroup({
        draftToken: new FormControl(true, [Validators.required]),
        tokenName: new FormControl('Token Name', [Validators.required, noWhitespaceValidator()]),
        tokenSymbol: new FormControl('F', [Validators.required, noWhitespaceValidator()]),
        tokenType: new FormControl('fungible', [Validators.required]),
        decimals: new FormControl('2'),
        initialSupply: new FormControl('0'),
        enableAdmin: new FormControl(true, [Validators.required]),
        changeSupply: new FormControl(true, [Validators.required]),
        enableFreeze: new FormControl(false, [Validators.required]),
        enableKYC: new FormControl(false, [Validators.required]),
        enableWipe: new FormControl(true, [Validators.required]),
        wipeContractId: new FormControl(''),
    });
    title: string = "New Token";
    description: string = "";
    token: any = null;
    readonly: boolean = false;
    contracts: any[] = [];

    public innerWidth: any;
    public innerHeight: any;
    hideType: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<TokenDialog>,
        private fb: FormBuilder,

        @Inject(MAT_DIALOG_DATA) public data: any) {
        if (data) {
            this.hideType = !!data.hideType;
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
            if (data.contracts) {
                this.contracts = data.contracts;
            }
        }
    }

    ngOnInit() {
        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
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

    get shouldDisableActionButtons(): boolean | null {
        return !(this.dataForm.valid && this.started) || null;
    }
}

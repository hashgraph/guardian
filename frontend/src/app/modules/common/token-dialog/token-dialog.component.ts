import { Component, Input } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

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
        enableWipe: new FormControl(true, [Validators.required])
    });
    title: string = 'New Token';
    description: string = '';
    token: any = null;
    readonly: boolean = false;

    public innerWidth: any;
    public innerHeight: any;
    hideType: boolean = false;

    @Input() data: any;

    constructor(
        public dialogRef: DynamicDialogRef,
        private fb: FormBuilder,
        public dialogConfig: DynamicDialogConfig) {
        if (dialogConfig) {
            this.hideType = !!dialogConfig.data.hideType;
            if (dialogConfig.data.title) {
                this.title = dialogConfig.data.title;
            } else {
                if (dialogConfig.data.token) {
                    this.title = 'Edit Token';
                } else {
                    this.title = 'New Token';
                }
            }
            if (dialogConfig.data.description) {
                this.description = dialogConfig.data.description;
            }
            if (dialogConfig.data.token) {
                this.dataForm?.patchValue(dialogConfig.data.token);
                this.token = dialogConfig.data.token;
                if (dialogConfig.data.token.draftToken) {
                    this.readonly = false;
                } else {
                    this.readonly = true;
                }
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
            if (data.tokenType === 'fungible') {
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

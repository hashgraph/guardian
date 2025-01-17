import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TokenService } from '../../services/token.service';
import { ITokenInfo, Token } from '@guardian/interfaces';
import { HttpResponse } from '@angular/common/http';
import { noWhitespaceValidator } from '../../validators/no-whitespace-validator';

@Component({
    selector: 'app-token-dialog',
    templateUrl: './token-dialog.component.html',
    styleUrls: ['./token-dialog.component.scss'],
})
export class TokenDialogComponent implements OnInit {
    preset?: any;
    dataForm!: UntypedFormGroup;
    readonly!: boolean;
    hideType!: boolean;
    contracts: any[];
    currentTokenId?: string;
    policyId?: string;

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig,
        private tokenService: TokenService,
    ) {
        this.dataForm = new UntypedFormGroup({
            draftToken: new UntypedFormControl(true, [Validators.required]),
            tokenName: new UntypedFormControl('Token Name', [Validators.required, noWhitespaceValidator()]),
            tokenSymbol: new UntypedFormControl('F', [Validators.required, noWhitespaceValidator()]),
            tokenType: new UntypedFormControl('fungible', [Validators.required]),
            decimals: new UntypedFormControl('2'),
            initialSupply: new UntypedFormControl('0'),
            enableAdmin: new UntypedFormControl(true, [Validators.required]),
            changeSupply: new UntypedFormControl(true, [Validators.required]),
            enableFreeze: new UntypedFormControl(false, [Validators.required]),
            enableKYC: new UntypedFormControl(false, [Validators.required]),
            enableWipe: new UntypedFormControl(true, [Validators.required]),
            wipeContractId: new UntypedFormControl(),
        });
    }

    ngOnInit(): void {
        this.preset = this.dialogConfig.data?.preset;
        this.hideType = !!this.dialogConfig.data?.hideType;
        this.contracts = this.dialogConfig.data?.contracts;
        this.currentTokenId = this.dialogConfig.data?.currentTokenId;
        this.policyId = this.dialogConfig.data?.policyId

        this.getTokenById(this.currentTokenId, this.policyId)
    }

    getTokenById(currentTokenId: string = '', policyId: string = ''): void {
        if(!currentTokenId) {
            return
        }

        this.tokenService.getTokenById(currentTokenId, policyId).subscribe((data: HttpResponse<ITokenInfo>) => {
            if(!data.body) {
                return
            }

            const token: Token = new Token(data.body);

            this.dataForm.patchValue(token);
            this.readonly = !token.draftToken;
        });
    }
}

import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
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
    dataForm!: FormGroup;
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
        this.dataForm = new FormGroup({
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
            wipeContractId: new FormControl(),
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

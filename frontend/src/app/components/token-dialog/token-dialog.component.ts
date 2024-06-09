import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TokenService } from '../../services/token.service';

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
    ) {}

    ngOnInit(): void {
        // console.log('ngOnInit');
        // this.getTokenById(this.currentTokenId)
        this.preset = this.dialogConfig.data?.preset;
        // console.log('this.preset', this.preset);
        this.dataForm = this.dialogConfig.data?.dataForm;
        // console.log('this.dataForm1', this.dataForm);
        // console.log('this.dataForm', this.dataForm);
        this.readonly = !!this.dialogConfig.data?.readonly;
        this.hideType = !!this.dialogConfig.data?.hideType;
        this.contracts = this.dialogConfig.data?.contracts;
        this.currentTokenId = this.dialogConfig.data?.currentTokenId;
        this.policyId = this.dialogConfig.data?.policyId
        //
        // this.getTokenById(this.currentTokenId, this.policyId)
    }

    // getTokenById(currentTokenId: string = '', policyId: string = ''): void {
    //     if(!currentTokenId) {
    //         return
    //     }
    //
    //     this.tokenService.getTokenById(currentTokenId, policyId).subscribe((data: HttpResponse<ITokenInfo>) => {
    //         if(!data.body) {
    //             return
    //         }
    //
    //         // console.log('getTokenById2', new Token(data.body));
    //
    //         const token: Token = new Token(data.body);
    //
    //         this.dataForm.patchValue(token);
    //         // console.log('this.dataForm2', this.dataForm);
    //         this.readonly = !token.draftToken;
    //     });
    // }
}

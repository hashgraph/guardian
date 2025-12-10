import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

@Component({
    selector: 'app-token-configuration',
    templateUrl: './token-configuration.component.html',
    styleUrls: ['./token-configuration.component.scss'],
})
export class TokenConfigurationComponent implements OnChanges {
    @Input('dataForm') dataForm!: UntypedFormGroup;
    @Input('readonly') readonly?: any;
    @Input('hide-type') hideType: boolean = false;
    @Input() contracts: any[];
    displayContracts: any[];
    ft: any;

    test: any;

    tokenTypes: { value: string, name: string }[] = [
        {
            name: 'Fungible',
            value: 'fungible'
        },
        {
            name: 'Non-Fungible',
            value: 'non-fungible'
        }
    ];

    constructor() {
    }

    get notDraftToken(): boolean {
        return !this.dataForm?.get('draftToken')?.value;
    }

    set notDraftToken(value: any) {
        this.dataForm?.patchValue({draftToken: !value});
    }

    get enableAdmin(): any {
        return this.dataForm?.get('enableAdmin')?.value;
    }

    set enableAdmin(value: any) {
        this.dataForm?.patchValue({enableAdmin: value});
    }

    get enableAdminDisabled(): any {
        return this.dataForm?.get('enableAdmin')?.disabled;
    }

    get enableWipe(): any {
        return this.dataForm?.get('enableWipe')?.value;
    }

    set enableWipe(value: any) {
        this.dataForm?.patchValue({enableWipe: value});
    }

    get enableWipeDisabled(): any {
        return this.dataForm?.get('enableWipe')?.disabled;
    }

    get enableFreeze(): any {
        return this.dataForm?.get('enableFreeze')?.value;
    }

    set enableFreeze(value: any) {
        this.dataForm?.patchValue({enableFreeze: value});
    }

    get enableFreezeDisabled(): any {
        return this.dataForm?.get('enableFreeze')?.disabled;
    }

    get enableKYC(): any {
        return this.dataForm?.get('enableKYC')?.value;
    }

    set enableKYC(value: any) {
        this.dataForm?.patchValue({enableKYC: value});
    }

    get enableKYCDisabled(): any {
        return this.dataForm?.get('enableKYC')?.disabled;
    }

    get wipeContractId(): any {
        return this.dataForm?.get('wipeContractId')?.value;
    }

    set decimals(value: string) {
        this.dataForm?.patchValue({ decimals: value });
    }

    ngOnChanges() {
        this.displayContracts =
            this.wipeContractId &&
            this.contracts.findIndex(
                (contract) => contract.contractId === this.wipeContractId
            ) < 0
                ? this.contracts.concat([{ contractId: this.wipeContractId }])
                : this.contracts;
        this.onChangeType();
    }

    onChangeType() {
        const data = this.dataForm.getRawValue();
        this.ft = (data && data.tokenType == 'fungible');
        if (!this.ft) {
            this.decimals = '0';
        }
    }

    tokenTypeChanged($event: any) {
        this.dataForm.controls.tokenType = $event.value;
    }
}

import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'app-token-configuration',
    templateUrl: './token-configuration.component.html',
    styleUrls: ['./token-configuration.component.css'],
})
export class TokenConfigurationComponent implements OnInit {
    @Input('preset') preset?: any;
    @Input('dataForm') dataForm!: FormGroup;
    @Input('readonly') readonly?: any;
    @Input('hide-type') hideType: boolean = false;

    ft: any;

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
    selectedTokenType: { value: string, name: string } = this.tokenTypes[0];

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

    get enableWipe(): any {
        return this.dataForm?.get('enableWipe')?.value;
    }

    set enableWipe(value: any) {
        this.dataForm?.patchValue({enableWipe: value});
    }

    get enableFreeze(): any {
        return this.dataForm?.get('enableFreeze')?.value;
    }

    set enableFreeze(value: any) {
        this.dataForm?.patchValue({enableFreeze: value});
    }

    get enableKYC(): any {
        return this.dataForm?.get('enableKYC')?.value;
    }

    set enableKYC(value: any) {
        this.dataForm?.patchValue({enableKYC: value});
    }

    ngOnInit(): void {
        if (this.preset) {
            this.dataForm.patchValue(this.preset);
            for (let presetEntry of Object.entries(this.preset)) {
                const controlName = presetEntry[0];
                this.dataForm.get(controlName)?.disable();
            }
        }
        this.onChangeType();
    }

    onChangeType() {
        const data = this.dataForm.getRawValue();
        this.ft = (data && data.tokenType == 'fungible');
    }

    tokenTypeChanged($event: any) {
        this.dataForm.controls.tokenType = $event.value;
    }
}

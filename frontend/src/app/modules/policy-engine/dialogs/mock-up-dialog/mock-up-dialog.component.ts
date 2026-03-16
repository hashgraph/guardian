import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'mock-up-dialog',
    templateUrl: './mock-up-dialog.component.html',
    styleUrls: ['./mock-up-dialog.component.scss'],
})
export class MockUpDialog {
    public loading = true;
    public dataForm: FormGroup;
    public title: string;
    public action: string;
    public type: 'IPFS' | 'MESSAGE' | 'TOKEN' | 'ACCOUNT' | 'API';
    public tokenTypes = [{
        name: 'Fungible',
        value: 'FUNGIBLE_COMMON'
    }, {
        name: 'Non-Fungible',
        value: 'NON_FUNGIBLE_UNIQUE'
    }];
    public apiTypes = [{
        name: 'GET',
        value: 'GET'
    }, {
        name: 'POST',
        value: 'POST'
    }, {
        name: 'PUT',
        value: 'PUT'
    }, {
        name: 'PATCH',
        value: 'PATCH'
    }, {
        name: 'DELETE',
        value: 'DELETE'
    }];
    public responseTypes = [{
        name: 'NONE',
        value: 'NONE'
    }, {
        name: 'JSON',
        value: 'JSON'
    }, {
        name: 'TEXT',
        value: 'TEXT'
    }];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.title = this.config.data?.title || 'Add mockup data';
        this.action = this.config.data?.action || 'Add';
        this.type = this.config.data?.type || 'IPFS';

        if (this.type === 'IPFS') {
            this.dataForm = new FormGroup({
                cid: new FormControl<string>('', Validators.required),
                content: new FormControl<string>('', Validators.required),
            });
        } else if (this.type === 'MESSAGE') {
            this.dataForm = new FormGroup({
                topicId: new FormControl<string>('', Validators.required),
                consensusTimestamp: new FormControl<string>('', Validators.required),
                payerAccountId: new FormControl<string>('', Validators.required),
                message: new FormControl<string>('', Validators.required),
            });
        } else if (this.type === 'TOKEN') {
            this.dataForm = new FormGroup({
                tokenId: new FormControl<string>('', Validators.required),
                treasuryId: new FormControl<string>('', Validators.required),
                name: new FormControl<string>('', Validators.required),
                symbol: new FormControl<string>('', Validators.required),
                type: new FormControl<string>('', Validators.required),
                decimals: new FormControl<string>('', Validators.required),
                adminKey: new FormControl<boolean>(false, Validators.required),
                supplyKey: new FormControl<boolean>(false, Validators.required),
                freezeKey: new FormControl<boolean>(false, Validators.required),
                kycKey: new FormControl<boolean>(false, Validators.required),
                wipeKey: new FormControl<boolean>(false, Validators.required),
            });
        } else if (this.type === 'API') {
            this.dataForm = new FormGroup({
                method: new FormControl<string>('', Validators.required),
                url: new FormControl<string>('', Validators.required),
                responseType: new FormControl<string>('', Validators.required),
                response: new FormControl<string>(''),
            });
        } else {
            this.dataForm = new FormGroup({});
            return;
        }

        if (this.config.data?.item) {
            this.dataForm.setValue(this.config.data.item);
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        if (this.dataForm.valid) {
            const item = this.dataForm.value;
            this.ref.close(item);
        }
    }
}

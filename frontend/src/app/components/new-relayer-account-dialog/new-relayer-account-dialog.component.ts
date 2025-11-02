import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';

@Component({
    selector: 'new-relayer-account-dialog',
    templateUrl: './new-relayer-account-dialog.component.html',
    styleUrls: ['./new-relayer-account-dialog.component.scss'],
})
export class NewRelayerAccountDialog {
    public loading = true;
    public dataForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        account: new FormControl<string>('', Validators.required),
        key: new FormControl<string>('', Validators.required),
    });
    public title: string;
    public readonly: boolean;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private relayerAccountsService: RelayerAccountsService,
        private dialogService: DialogService,
    ) {
        this.title = this.config.data?.title || '';
        this.readonly = true;
        this.dataForm.get('key')?.disable();
    }

    ngOnInit() {
        setTimeout(() => {
            this.readonly = false;
            this.dataForm.get('key')?.enable();
        }, 1000);
        setTimeout(() => {
            this.loading = false;
        }, 1100);
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        if (this.dataForm.valid) {
            const {
                name,
                account,
                key,
            } = this.dataForm.value;
            this.ref.close({
                name: name?.trim(),
                account: account?.trim(),
                key: key?.trim(),
            });
        }
    }

    public onGenerate() {
        this.loading = true;
        this.relayerAccountsService
            .generateRelayerAccount()
            .subscribe((account) => {
                const data = this.dataForm.value;
                this.dataForm.setValue({
                    name: data.name || '',
                    account: account.id || '',
                    key: account.key || ''
                })
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }
}

import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ProjectWalletService } from 'src/app/services/project-wallet.service';

@Component({
    selector: 'new-project-wallets-dialog',
    templateUrl: './new-project-wallets-dialog.component.html',
    styleUrls: ['./new-project-wallets-dialog.component.scss'],
})
export class NewProjectWalletDialog {
    public loading = true;
    public dataForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        account: new FormControl<string>(''),
        key: new FormControl<string>(''),
        generate: new FormControl<string>('')
    });
    public title: string;
    public readonly: boolean;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private projectWalletService: ProjectWalletService,
        private dialogService: DialogService,
    ) {
        this.title = this.config.data?.title || '';
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
            const {
                name,
                account,
                key,
                generate
            } = this.dataForm.value;
            this.ref.close({
                name: name?.trim(),
                account: account?.trim(),
                key: key?.trim(),
                generate
            });
        }
    }

    public onGenerate() {
        this.loading = true;
        this.projectWalletService
            .generateProjectWallet()
            .subscribe((account) => {
                debugger;
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }
}

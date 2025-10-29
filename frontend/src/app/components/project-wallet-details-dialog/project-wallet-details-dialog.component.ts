import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ProjectWalletService } from 'src/app/services/project-wallet.service';

@Component({
    selector: 'project-wallet-details-dialog',
    templateUrl: './project-wallet-details-dialog.component.html',
    styleUrls: ['./project-wallet-details-dialog.component.scss'],
})
export class ProjectWalletDetailsDialog {
    public loading = true;
    public title: string;
    public readonly: boolean;
    public wallet: any;
    public walletId: string;

    public page: any[];
    public count: number;
    public pageIndex: number;
    public pageSize: number;
    public columns: any[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private projectWalletService: ProjectWalletService,
        private dialogService: DialogService,
    ) {
        this.wallet = this.config.data?.wallet;
        this.readonly = true;
        this.title = this.wallet?.name || 'Wallet';
        this.walletId = this.wallet?.account || '';
        this.page = [];
        this.count = 0;
        this.pageIndex = 0;
        this.pageSize = 10;
        debugger;
    }

    ngOnInit() {
        this.loadDocuments();
        setTimeout(() => {
            this.readonly = false;
        }, 10);
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    private loadDocuments() {
        this.loading = true;
        this.projectWalletService
            .getRelationships(
                this.walletId,
                this.pageIndex,
                this.pageSize
            )
            .subscribe((response) => {
                const { page, count } = this.projectWalletService.parsePage(response);
                this.page = page;
                this.count = count;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }
}

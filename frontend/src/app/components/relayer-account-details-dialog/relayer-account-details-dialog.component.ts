import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';

@Component({
    selector: 'relayer-account-details-dialog',
    templateUrl: './relayer-account-details-dialog.component.html',
    styleUrls: ['./relayer-account-details-dialog.component.scss'],
})
export class RelayerAccountDetailsDialog {
    public loading = true;
    public title: string;
    public readonly: boolean;
    public relayerAccount: any;
    public relayerAccountId: string;

    public page: any[];
    public count: number;
    public pageIndex: number;
    public pageSize: number;
    public columns: any[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private relayerAccountsService: RelayerAccountsService,
        private dialogService: DialogService,
    ) {
        this.relayerAccount = this.config.data?.relayerAccount;
        this.readonly = true;
        this.title = this.relayerAccount?.name || 'Relayer Account';
        this.relayerAccountId = this.relayerAccount?.account || '';
        this.page = [];
        this.count = 0;
        this.pageIndex = 0;
        this.pageSize = 10;
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
        this.relayerAccountsService
            .getRelationships(
                this.relayerAccountId,
                this.pageIndex,
                this.pageSize
            )
            .subscribe((response) => {
                const { page, count } = this.relayerAccountsService.parsePage(response);
                this.page = page;
                this.count = count;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    public onOpenDocument(document: any) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                id: document.id,
                row: document,
                dryRun: !!document.dryRunId,
                document: document.document,
                title: 'VC Document',
                type: 'VC',
                viewDocument: true,
                canExport: false,
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadDocuments();
    }
}

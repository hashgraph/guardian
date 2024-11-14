import { Component, Inject, OnInit } from '@angular/core';
// import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { Token } from '@guardian/interfaces';
import { ContractService } from 'src/app/services/contract.service';
import { TokenService } from 'src/app/services/token.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-retire-requests-dialog',
    templateUrl: './retire-requests-dialog.component.html',
    styleUrls: ['./retire-requests-dialog.component.scss'],
})
export class RetireRequestsDialogComponent implements OnInit {
    contractId!: any;
    requests: any[] = [];
    syncDate: string;
    loading: boolean = false;
    pageIndex = 0;
    pageSize = 5;
    length = 0;

    tokens: Token[] = [];
    selectedTokens: any = [];

    contract: any

    constructor(
        // public dialogRef: MatDialogRef<RetireRequestsDialogComponent>,
        public contractService: ContractService,
        public tokenService: TokenService,
        // @Inject(MAT_DIALOG_DATA) public contract: any,
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        this.contract = this.config.data.contract;

        this.syncDate = this.contract.syncRequestsDate;
        this.contractId = this.contract.contractId;
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.loadRequests();
        });
    }

    loadRequests() {
        this.loading = true;
        this.contractService
            .getRetireRequests({
                contractId: this.contractId,
                pageIndex: this.pageIndex,
                pageSize: this.pageSize,
            })
            .subscribe(
                (pools) => {
                    this.requests = (pools.body as any) || [];
                    this.requests = this.requests.map((item) => {
                        item.available = !item.tokens.find(
                            (tokenItem: { approved: any }) =>
                                !tokenItem.approved
                        );
                        return item;
                    });
                    const count = pools.headers.get('X-Total-Count');
                    this.length = (count && +count) || this.requests.length;
                    this.loading = false;
                },
                () => (this.loading = false)
            );
    }

    onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadRequests();
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    approveRequest(requestId: string) {
        this.loading = true;
        this.contractService.approveRetire(requestId).subscribe(
            (result) => {
                this.loadRequests();
            },
            () => (this.loading = false)
        );
    }

    unsetRetire(requestId: string) {
        this.loading = true;
        this.contractService.unsetRetireRequest(requestId).subscribe(
            (result) => {
                this.loadRequests();
            },
            () => (this.loading = false)
        );
    }

    hasPermissions(permissions: number, index: number) {
        return (permissions >> index) % 2 != 0;
    }
}

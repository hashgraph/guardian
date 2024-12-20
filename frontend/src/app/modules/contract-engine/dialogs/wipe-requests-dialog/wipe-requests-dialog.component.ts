import {Component, OnInit, Inject} from '@angular/core';
// import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import {ContractService} from 'src/app/services/contract.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-wipe-requests-dialog',
    templateUrl: './wipe-requests-dialog.component.html',
    styleUrls: ['./wipe-requests-dialog.component.scss'],
})
export class WipeRequestsDialogComponent implements OnInit {
    contractId!: string;
    requests: {
        id: string;
        user: string;
        token?: string;
    }[];
    loading: boolean = false;
    pageIndex = 0;
    pageSize = 5;
    length = 0;
    version!: string

    contract: any

    constructor(
        // public dialogRef: MatDialogRef<WipeRequestsDialogComponent>,
        public contractService: ContractService,
        // @Inject(MAT_DIALOG_DATA) public contract: any
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        this.contract = this.config.data ?? {};

        this.contractId = this.contract.contractId;
        this.version = this.contract.version;
    }

    ngOnInit(): void {
        this.loadRequests();
    }

    loadRequests() {
        this.loading = true;
        this.contractService
            .getWipeRequests({
                contractId: this.contractId,
                pageIndex: this.pageIndex,
                pageSize: this.pageSize,
            })
            .subscribe(
                (requests) => {
                    this.requests = (requests.body as any) || [];
                    const count = requests.headers.get('X-Total-Count');
                    this.length = (count && +count) || this.requests.length;
                    this.loading = false;
                },
                () => (this.loading = false)
            );
    }

    onPage(event: any) {
        if (this.pageSize !== event.pageSize) {
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
        this.contractService
            .approveWipeRequest(requestId)
            .subscribe(
                (result) => {
                    this.loadRequests();
                },
                () => (this.loading = false)
            );
    }

    rejectRequest(requestId: any, ban: boolean = false) {
        this.loading = true;
        this.loading = true;
        this.contractService
            .rejectWipeRequest(requestId, ban)
            .subscribe(
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

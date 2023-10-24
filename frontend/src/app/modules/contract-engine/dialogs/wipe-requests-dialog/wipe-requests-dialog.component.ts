import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ContractService } from 'src/app/services/contract.service';

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
    }[];
    loading: boolean = false;
    pageIndex = 0;
    pageSize = 5;
    length = 0;

    constructor(
        public dialogRef: MatDialogRef<WipeRequestsDialogComponent>,
        public contractService: ContractService,
        @Inject(MAT_DIALOG_DATA) public contract: any
    ) {
        this.contractId = contract.contractId;
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

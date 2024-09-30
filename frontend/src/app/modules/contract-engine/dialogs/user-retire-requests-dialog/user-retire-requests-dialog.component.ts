import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Token } from '@guardian/interfaces';
import { ContractService } from 'src/app/services/contract.service';
import { TokenService } from 'src/app/services/token.service';

@Component({
    selector: 'app-user-retire-requests-dialog',
    templateUrl: './user-retire-requests-dialog.component.html',
    styleUrls: ['./user-retire-requests-dialog.component.scss'],
})
export class UserRetireRequestsDialogComponent implements OnInit {
    requests: any[] = [];
    loading: boolean = false;
    pageIndex = 0;
    pageSize = 5;
    length = 0;

    tokens: Token[] = [];
    selectedTokens: any = [];

    constructor(
        public dialogRef: MatDialogRef<UserRetireRequestsDialogComponent>,
        public contractService: ContractService,
        public tokenService: TokenService,
        @Inject(MAT_DIALOG_DATA) public contract: any
    ) {
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

    ngOnInit(): void {
        setTimeout(() => {
            this.loadRequests();
        });
    }

    loadRequests() {
        this.loading = true;
        this.contractService
            .getRetireRequests({
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

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    unsetRetire(requestId: string) {
        this.loading = true;
        this.contractService.cancelRetireRequest(requestId).subscribe(
            (result) => {
                this.loadRequests();
            },
            () => (this.loading = false)
        );
    }
}

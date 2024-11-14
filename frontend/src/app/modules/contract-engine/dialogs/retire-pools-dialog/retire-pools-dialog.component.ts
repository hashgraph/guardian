import {Component, Inject, OnInit} from '@angular/core';
// import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import {RetireTokenPool, Token} from '@guardian/interfaces';
import {ContractService} from 'src/app/services/contract.service';
import {TokenService} from 'src/app/services/token.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-retire-pools-dialog',
    templateUrl: './retire-pools-dialog.component.html',
    styleUrls: ['./retire-pools-dialog.component.scss'],
})
export class RetirePoolsDialogComponent implements OnInit {
    pools: any[] = [];
    syncDate: string;
    loading: boolean = false;
    pageIndex = 0;
    pageSize = 5;
    length = 0;

    tokens: Token[] = [];
    selectedTokens: any = [];

    contract: any

    constructor(
        // public dialogRef: MatDialogRef<RetirePoolsDialogComponent>,
        public contractService: ContractService,
        public tokenService: TokenService,
        // @Inject(MAT_DIALOG_DATA) public contract: any
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        this.contract = this.config.data.contract;

        if (this.contract) {
            this.syncDate = this.contract.syncPoolsDate;
        }
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.loadPools();
        });
    }

    loadPools() {
        this.loading = true;
        this.contractService
            .getRetirePools({
                contractId: this.contract.contractId,
                pageIndex: this.pageIndex,
                pageSize: this.pageSize,
                tokens: this.selectedTokens,
            })
            .subscribe(
                (pools) => {
                    const tokens = new Map<string, any>();
                    this.pools = (pools.body as any) || [];
                    this.pools.forEach((pool) => {
                        pool.tokens.forEach(
                            (token: { token: string; tokenSymbol: any }) => {
                                if (!tokens.has(token.token)) {
                                    tokens.set(token.token, {
                                        tokenId: token.token,
                                        tokenSymbol: token.tokenSymbol,
                                    });
                                }
                            }
                        );
                    });
                    this.tokens = Array.from(tokens.values());
                    const count = pools.headers.get('X-Total-Count');
                    this.length = (count && +count) || this.pools.length;
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
        this.loadPools();
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    sync(event: any) {
        event.target.classList.add('spin');
        this.loading = true;
        this.contractService.retireSyncPools(this.contract.id).subscribe(
            (result) => {
                this.syncDate = result;
                this.contract.syncPoolsDate = result;
                this.loadPools();
            },
            () => (this.loading = false),
            () => {
                event.target.classList.remove('spin');
            }
        );
    }

    removePool(pool: any) {
        this.loading = true;
        this.contractService.unsetRetirePool(pool.id).subscribe(
            () => {
                this.loadPools();
            },
            () => (this.loading = false)
        );
    }

    hasPermissions(permissions: number, index: number) {
        return (permissions >> index) % 2 != 0;
    }
}

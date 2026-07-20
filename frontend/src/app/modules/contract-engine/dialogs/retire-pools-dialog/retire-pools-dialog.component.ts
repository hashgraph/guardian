import {Component, Inject, OnInit} from '@angular/core';
import {RetireTokenPool, Token} from '@guardian/interfaces';
import {ContractService} from 'src/app/services/contract.service';
import {TokenService} from 'src/app/services/token.service';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-retire-pools-dialog',
    templateUrl: './retire-pools-dialog.component.html',
    styleUrls: ['./retire-pools-dialog.component.scss'],
    standalone: false
})
export class RetirePoolsDialogComponent implements OnInit {
    pools: any[] = [];
    syncDate: string;
    loading: boolean = false;
    syncLoading: boolean = false;
    pageIndex = 0;
    pageSize = 5;
    length = 0;

    tokens: Token[] = [];
    selectedTokens: any = [];

    contract: any = {}

    constructor(
        public contractService: ContractService,
        public tokenService: TokenService,
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        this.contract = this.config.data ?? {};

        if (this.contract) {
            this.syncDate = this.contract.syncPoolsDate;
        }
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.loadPools();
        });
    }

    loadPools(showLoading: boolean = true, onComplete?: () => void) {
        if (showLoading) {
            this.loading = true;
        }
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
                    onComplete?.();
                },
                () => {
                    this.loading = false;
                    onComplete?.();
                }
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

    sync() {
        const startedAt = Date.now();
        const stopSyncLoading = () => {
            const delay = Math.max(0, 800 - (Date.now() - startedAt));
            setTimeout(() => {
                this.syncLoading = false;
            }, delay);
        };

        this.syncLoading = true;
        this.contractService.retireSyncPools(this.contract.id).subscribe(
            (result) => {
                this.syncDate = result;
                this.contract.syncPoolsDate = result;
                this.loadPools(false, stopSyncLoading);
            },
            () => {
                this.loading = false;
                stopSyncLoading();
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

    getTransformedTokens(): any[] {
        return this.tokens.map(token => ({
            label: `${token.tokenSymbol} (${token.tokenId})`,
            value: token.tokenId
        }));
    }
}

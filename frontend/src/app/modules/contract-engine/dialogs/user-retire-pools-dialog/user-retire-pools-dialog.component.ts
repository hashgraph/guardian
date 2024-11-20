import {Component, Inject, OnInit} from '@angular/core';
import {
    AbstractControl,
    UntypedFormArray,
    UntypedFormControl,
    FormControlDirective,
    UntypedFormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
// import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import {RetireTokenPool, Token, TokenType} from '@guardian/interfaces';
import {ContractService} from 'src/app/services/contract.service';
import {TokenService} from 'src/app/services/token.service';
import {DynamicDialogRef} from 'primeng/dynamicdialog';

@Component({
    selector: 'app-user-retire-pools-dialog',
    templateUrl: './user-retire-pools-dialog.component.html',
    styleUrls: ['./user-retire-pools-dialog.component.scss'],
})
export class UserRetirePoolsDialogComponent implements OnInit {
    pools: any[] = [];
    syncDate: string;
    loading: boolean = false;
    pageIndex = 0;
    pageSize = 5;
    length = 0;

    tokens: Token[] = [];
    selectedTokens: any = [];
    selectedPool: any;

    retireMod: boolean = false;

    retireForm: UntypedFormArray = new UntypedFormArray(
        [],
        [Validators.required, this.rationValidator()]
    );

    constructor(
        // public dialogRef: MatDialogRef<UserRetirePoolsDialogComponent>,
        private dialogRef: DynamicDialogRef,
        public contractService: ContractService,
        public tokenService: TokenService
    ) {
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

    async retire(pool: any) {
        this.loading = true;
        pool.tokens = await Promise.all(
            pool.tokens.map(
                async (item: {
                    type: TokenType;
                    serials: any;
                    token: string;
                }) => {
                    if (item.type === TokenType.NON_FUNGIBLE) {
                        item.serials = await this.tokenService
                            .serials(item.token)
                            .toPromise();
                    }
                    return item;
                }
            )
        );
        this.selectedPool = pool;
        for (const token of pool.tokens) {
            const tokenControl = new UntypedFormControl(token.token);
            const countControl = new UntypedFormControl(0);
            const serialsControl = new UntypedFormControl([]);
            this.retireForm.push(
                new UntypedFormGroup({
                    token: tokenControl,
                    count: countControl,
                    serials: serialsControl,
                })
            );
        }
        this.retireMod = true;
        this.loading = false;
    }

    confirm() {
        const retireForm = this.retireForm.value?.map(
            (item: any, i: number) => {
                const token = this.selectedPool.tokens[i];
                if (token.type === TokenType.FUNGIBLE && token.decimals > 0) {
                    item.count *= Math.pow(10, token.decimals);
                }
                return item;
            }
        );
        this.dialogRef.close({
            retireForm,
            poolId: this.selectedPool.id,
        });
    }

    back() {
        this.retireMod = false;
        this.retireForm.clear();
    }

    getRetireForm(index: number) {
        return this.retireForm.controls[index] as UntypedFormGroup;
    }

    rationValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const form = control.value || [];
            if (form.length === 2) {
                const token1Count =
                    form[0].count || form[0].serials.length || 0;
                const token2Count =
                    form[1].count || form[1].serials.length || 0;
                const token1RatioCount =
                    this.selectedPool.tokens[0].count /
                    Math.pow(10, this.selectedPool.tokens[0].decimals);
                const token2RatioCount =
                    this.selectedPool.tokens[1].count /
                    Math.pow(10, this.selectedPool.tokens[1].decimals);
                return token1Count < token1RatioCount ||
                token2Count < token2RatioCount ||
                token1Count * token2RatioCount !==
                token1RatioCount * token2Count
                    ? {
                        ratio: {
                            valid: false,
                        },
                    }
                    : null;
            } else if (form.length === 1) {
                const tokenCount = form[0].count || form[0].serials.length || 0;
                const tokenRatioCount =
                    this.selectedPool.tokens[0].count /
                    Math.pow(10, this.selectedPool.tokens[0].decimals);
                return tokenCount < tokenRatioCount ||
                tokenCount % tokenRatioCount !== 0
                    ? {
                        ratio: {
                            valid: false,
                        },
                    }
                    : null;
            }
            return {
                ratio: {
                    valid: false,
                },
            };
        };
    }

    getTokenOptions() {
        return this.tokens.map(token => ({
            label: `${token.tokenSymbol} (${token.tokenId})`,
            value: token.tokenId,
        }));
    }

    getSerialOptions(tokenId: string) {
        const token = this.tokens.find(t => t.tokenId === tokenId) as any;
        if (!token || !token.serials) {
            return [];
        }
        return (token.serials).map((serial: any) => ({
            label: serial.toString(),
            value: serial,
        }));
    }
}

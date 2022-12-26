import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { ContractService } from 'src/app/services/contract.service';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { TokenType } from '@guardian/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Dialog for retire tokens.
 */
@Component({
    selector: 'retire-token-dialog',
    templateUrl: './retire-token-dialog.component.html',
    styleUrls: ['./retire-token-dialog.component.css'],
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { showError: true },
        },
    ],
})
export class RetireTokenDialogComponent {
    tokens: any[] = [];
    baseTokens: any[] = [];
    oppositeTokens: any = [];

    chooseTokensForm = this.fb.group({
        baseTokenId: ['', Validators.required],
        oppositeTokenId: ['', Validators.required],
    });
    contractForm = this.fb.control('', Validators.required);
    tokenCountForm = this.fb.group({
        baseTokenCount: [0],
        oppositeTokenCount: [0],
        baseTokenSerials: [[]],
        oppositeTokenSerials: [[]],
    });

    baseTokenType?: TokenType;
    baseTokenDecimals?: number;
    baseTokenSerials: any = [];
    baseTokenRate: number = 0;
    oppositeTokenType?: TokenType;
    oppositeTokenDecimals?: number;
    oppositeTokenSerials: any = [];
    oppositeTokenRate: number = 0;

    contractAndRates: any = [];
    contractsLoading = false;

    readonly separatorKeysCodes = [ENTER, COMMA] as const;

    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        public dialogRef: MatDialogRef<RetireTokenDialogComponent>,
        private fb: FormBuilder,
        private contractService: ContractService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        if (data) {
            this.tokens = data.tokens || [];
            this.baseTokens = this.tokens;
            this.oppositeTokens = this.tokens;
            const baseTokenControl = this.chooseTokensForm.get('baseTokenId');
            const oppositeTokenControl =
                this.chooseTokensForm.get('oppositeTokenId');
            const oppositeTokenCountControl =
                this.tokenCountForm.get('oppositeTokenCount');
            const baseTokenCountControl =
                this.tokenCountForm.get('baseTokenCount');

            oppositeTokenCountControl?.disable();
            baseTokenControl?.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((value) => {
                    this.oppositeTokens = this.tokens.filter(
                        (item) => item.tokenId != value
                    );
                    const baseToken = this.tokens.find(
                        (item: any) => item.tokenId === value
                    );
                    this.baseTokenType = baseToken?.tokenType;
                    this.baseTokenDecimals = baseToken?.decimals;
                    this.baseTokenSerials = baseToken?.serials || [];
                    const oppositeTokenId =
                        this.chooseTokensForm.get('oppositeTokenId')?.value;
                    this.contractAndRates = [];
                    this.contractForm.patchValue('');
                    this.tokenCountForm.reset();
                    this.setContractPair(value, oppositeTokenId);
                });
            this.contractForm.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((value) => {
                    this.tokenCountForm.reset({
                        baseTokenCount: 0,
                        oppositeTokenCount: 0,
                        baseTokenSerials: [],
                        oppositeTokenSerials: [],
                    });
                    if (!value) {
                        this.baseTokenRate = 0;
                        this.oppositeTokenRate = 0;
                        return;
                    }
                    const contractAndRates = this.contractAndRates.find(
                        (item: any) => item.contractId === value
                    );
                    this.baseTokenRate = contractAndRates.baseTokenRate;
                    this.oppositeTokenRate = contractAndRates.oppositeTokenRate;
                });
            oppositeTokenControl?.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((value) => {
                    this.baseTokens = this.tokens.filter(
                        (item) => item.tokenId != value
                    );
                    const oppositeToken = this.tokens.find(
                        (item: any) => item.tokenId === value
                    );
                    this.oppositeTokenType = oppositeToken?.tokenType;
                    this.oppositeTokenDecimals = oppositeToken?.decimals;
                    this.oppositeTokenSerials = oppositeToken?.serials || [];
                    const baseTokenId =
                        this.chooseTokensForm.get('baseTokenId')?.value;
                    this.contractAndRates = [];
                    this.contractForm.patchValue('');
                    this.tokenCountForm.reset();
                    this.setContractPair(baseTokenId, value);
                });

            baseTokenCountControl?.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe(this.countValueForOppositeToken.bind(this));
        }
    }

    setContractPair(baseTokenId: string, oppositeTokenId: string) {
        if (!baseTokenId || !oppositeTokenId) {
            return;
        }
        this.contractsLoading = true;
        this.contractService.getPair(baseTokenId, oppositeTokenId).subscribe(
            (result) => {
                if (!result) {
                    this.contractsLoading = false;
                    return;
                }
                this.contractAndRates = result.filter(
                    (item: any) => item.baseTokenRate && item.oppositeTokenRate
                );
                this.contractsLoading = false;
            },
            () => (this.contractsLoading = false)
        );
    }

    countValueForOppositeToken(baseTokenValue: number) {
        if (!this.tokenCountForm) {
            return;
        }
        const oppositeTokenControl =
            this.tokenCountForm.get('oppositeTokenCount');
        if (
            this.oppositeTokenType == TokenType.FUNGIBLE &&
            this.baseTokenRate &&
            this.oppositeTokenRate &&
            baseTokenValue >= this.baseTokenRate
        ) {
            const baseTokenCount = this.baseTokenDecimals
                ? baseTokenValue * Math.pow(10, this.baseTokenDecimals)
                : baseTokenValue;
            const baseTokenRate = this.baseTokenDecimals
                ? this.baseTokenRate * Math.pow(10, this.baseTokenDecimals)
                : this.baseTokenRate;
            if (baseTokenCount % baseTokenRate === 0) {
                const rate = baseTokenCount / baseTokenRate;
                oppositeTokenControl?.patchValue(rate * this.oppositeTokenRate);
            } else {
                oppositeTokenControl?.patchValue(0);
            }
        } else {
            oppositeTokenControl?.patchValue(0);
        }
    }

    ngOnInit() {}

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onCreate() {
        this.dialogRef.close({
            ...this.chooseTokensForm.value,
            ...this.tokenCountForm.getRawValue(),
            contractId: this.contractForm.value,
        });
    }

    validateCountValues() {
        if (!this.baseTokenRate || !this.oppositeTokenRate) {
            return false;
        }

        const {
            baseTokenCount,
            oppositeTokenCount,
            baseTokenSerials,
            oppositeTokenSerials,
        } = this.tokenCountForm.getRawValue() || {};

        if (
            !baseTokenCount &&
            !oppositeTokenCount &&
            !baseTokenSerials?.length &&
            !oppositeTokenSerials?.length
        ) {
            return false;
        }

        const baseTokenSerialsCount = baseTokenSerials.length;
        const oppositeTokenSerialsCount = oppositeTokenSerials.length;

        const baseTokenCountWithDecimals = this.baseTokenDecimals
            ? (baseTokenCount || baseTokenSerialsCount) *
              Math.pow(10, this.baseTokenDecimals)
            : baseTokenCount || baseTokenSerialsCount;
        const baseTokenRate = this.baseTokenDecimals
            ? this.baseTokenRate * Math.pow(10, this.baseTokenDecimals)
            : this.baseTokenRate;
        if (baseTokenCountWithDecimals % baseTokenRate === 0) {
            const rate = baseTokenCountWithDecimals / baseTokenRate;
            if (
                rate * this.oppositeTokenRate ===
                (oppositeTokenSerialsCount || oppositeTokenCount)
            ) {
                return true;
            }
        }
        return false;
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
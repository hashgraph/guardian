import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators, } from '@angular/forms';
import { ContractService } from 'src/app/services/contract.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { moreThanZeroValidator } from 'src/app/validators/more-than-zero.validator';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Dialog for creating pair.
 */
@Component({
    selector: 'add-pair-dialog',
    templateUrl: './add-pair-dialog.component.html',
    styleUrls: ['./add-pair-dialog.component.scss'],
})
export class AddPairDialogComponent {
    baseTokenId = new FormControl('', Validators.required);
    baseTokenCount = new FormControl(
        {value: 0, disabled: true},
        Validators.required
    );
    oppositeTokenId = new FormControl('');
    oppositeTokenCount = new FormControl(
        {value: 0, disabled: true},
        moreThanZeroValidator()
    );
    contractId = new FormControl('', Validators.required);
    dataForm = new FormGroup({
        baseTokenId: this.baseTokenId,
        baseTokenCount: this.baseTokenCount,
        oppositeTokenId: this.oppositeTokenId,
        oppositeTokenCount: this.oppositeTokenCount,
        contractId: this.contractId,
    });
    loading: boolean = false;
    existsPairs: any = [];
    tokens: any[] = [];
    baseTokens: any[] = [];
    oppositeTokens: any[] = [];
    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private contractService: ContractService,
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        this.tokens = this.config.data?.tokens || [];
        console.log(this.config.data);

        this.baseTokens = this.tokens;
        this.oppositeTokens = this.tokens;
        this.contractId.patchValue(this.config.data?.contractId || '');
        this.baseTokenId.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(this.onTokenChange(this.oppositeTokenId));
        this.oppositeTokenId.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(this.onTokenChange(this.baseTokenId, true));
    }

    onTokenChange(control: AbstractControl, isOppositeToken: boolean = false) {

        return (value: any) => {
            const tokenId = control.value;
            if (isOppositeToken) {
                this.baseTokens = this.tokens.filter(
                    (item) => item.tokenId !== value
                );
            } else {
                this.oppositeTokens = this.tokens.filter(
                    (item) => item.tokenId !== value
                );
            }
            this.existsPairs = [];
            if (!value && isOppositeToken) {
                this.baseTokenCount.disable();
                this.oppositeTokenCount.disable();
            } else if (isOppositeToken) {
                this.baseTokenCount.enable();
                this.oppositeTokenCount.enable();
            }
            if ((!value && !isOppositeToken) || (!tokenId && isOppositeToken)) {
                return;
            }
            this.loading = true;
            this.contractService
                .getPair(
                    isOppositeToken ? tokenId : value,
                    isOppositeToken ? value : tokenId
                )
                .subscribe(
                    (result) => {
                        this.loading = false;
                        if (!result) {
                            return;
                        }
                        this.existsPairs = result
                            .filter((item: any) => item.baseTokenRate)
                            .map(
                                (item: any) =>
                                    item.contractId +
                                    (item.oppositeTokenRate
                                        ? ` (${item.baseTokenRate}:${item.oppositeTokenRate})`
                                        : '')
                            );
                    },
                    () => (this.loading = false)
                );
        };
    }

    ngOnInit() {
    }

    onNoClick(): void {
        this.ref.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.ref.close(data);
        }
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}

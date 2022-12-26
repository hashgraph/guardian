import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
    AbstractControl,
    FormBuilder,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { ContractService } from 'src/app/services/contract.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
/**
 * Dialog for creating pair.
 */
@Component({
    selector: 'add-pair-dialog',
    templateUrl: './add-pair-dialog.component.html',
    styleUrls: ['./add-pair-dialog.component.css'],
})
export class AddPairDialogComponent {
    dataForm = this.fb.group({
        baseTokenId: ['', Validators.required],
        baseTokenCount: [0, this.moreThanZeroValidator()],
        oppositeTokenId: ['', Validators.required],
        oppositeTokenCount: [0, this.moreThanZeroValidator()],
        contractId: ['', Validators.required],
    });
    loading: boolean = false;
    existsPairs: any = [];
    tokens: any[] = [];
    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        public dialogRef: MatDialogRef<AddPairDialogComponent>,
        private contractService: ContractService,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.tokens = data?.tokens || [];
        this.dataForm.get('contractId')?.patchValue(data?.contractId || '');
        this.dataForm
            .get('baseTokenId')
            ?.valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe(this.onTokenChange('oppositeTokenId'));
        this.dataForm
            .get('oppositeTokenId')
            ?.valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe(this.onTokenChange('baseTokenId', true));
    }

    onTokenChange(controlName: string, isReverse: boolean = false) {
        return (value: any) => {
            const tokenId = this.dataForm.get(controlName)?.value;
            this.existsPairs = [];
            if (!value || !tokenId) {
                return;
            }
            this.loading = true;
            this.contractService
                .getPair(
                    isReverse ? tokenId : value,
                    isReverse ? value : tokenId
                )
                .subscribe(
                    (result) => {
                        this.loading = false;
                        if (!result) {
                            return;
                        }
                        this.existsPairs = result
                            .filter(
                                (item: any) =>
                                    item.baseTokenRate && item.oppositeTokenRate
                            )
                            .map(
                                (item: any) =>
                                    `${item.contractId} (${item.baseTokenRate}:${item.oppositeTokenRate})`
                            );
                    },
                    () => (this.loading = false)
                );
        };
    }

    ngOnInit() {}

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onCreate() {
        if (this.dataForm.valid) {
            this.dialogRef.close(this.dataForm.value);
        }
    }

    onSave() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.dialogRef.close(data);
        }
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    moreThanZeroValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (typeof value === 'number' && value > 0) {
                return null;
            }
            return {
                lessThanZero: {
                    valid: false,
                },
            };
        };
    }
}

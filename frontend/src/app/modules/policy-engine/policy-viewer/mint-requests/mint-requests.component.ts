import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { DialogService } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';

@Component({
    selector: 'app-mint-requests',
    templateUrl: './mint-requests.component.html',
    styleUrls: ['./mint-requests.component.scss'],
    standalone: false
})
export class MintRequestsComponent implements OnInit, OnDestroy {
    @Input() policyId: string;

    public loading: boolean = true;
    public page: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 10;
    public pageCount: number = 0;

    public statusOptions = [
        { label: 'All', value: '' },
        { label: 'Pending', value: 'pending' },
        { label: 'Error', value: 'error' },
        { label: 'Success', value: 'success' },
    ];

    public filtersForm = new UntypedFormGroup({
        status: new UntypedFormControl(''),
        target: new UntypedFormControl(''),
        vpMessageId: new UntypedFormControl(''),
    });

    private subscription = new Subscription();

    constructor(
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService
    ) {}

    ngOnInit() {
        this.loadData();
        this.subscription.add(
            this.filtersForm.get('status')!.valueChanges.subscribe(() => {
                this.applyFilters();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public loadData() {
        this.loading = true;
        const filters: any = {};
        const status = this.filtersForm.get('status')?.value;
        const target = this.filtersForm.get('target')?.value;
        const vpMessageId = this.filtersForm.get('vpMessageId')?.value;
        if (status) {
            filters.status = status;
        }
        if (target) {
            filters.target = target;
        }
        if (vpMessageId) {
            filters.vpMessageId = vpMessageId;
        }

        this.subscription.add(
            this.policyEngineService
                .getMintRequests(this.policyId, filters, this.pageIndex, this.pageSize)
                .subscribe({
                    next: (response) => {
                        const { page, count } = this.policyEngineService.parsePage(response);
                        this.page = page;
                        this.pageCount = count;
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    error: () => {
                        this.loading = false;
                    },
                })
        );
    }

    public onPage(event: any) {
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public applyFilters() {
        this.pageIndex = 0;
        this.loadData();
    }

    public clearFilters() {
        this.filtersForm.reset({ status: '', target: '', vpMessageId: '' });
        this.pageIndex = 0;
        this.loadData();
    }

    public onRetry(row: any) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Retry Mint',
                text: `Are you sure you want to retry minting for VP ${row.vpMessageId}?`,
                buttons: [
                    { name: 'Cancel', class: 'secondary' },
                    { name: 'Retry', class: 'primary' },
                ],
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Retry') {
                this.policyEngineService
                    .retryMint(this.policyId, row.vpMessageId)
                    .subscribe();
                this.loadData();
            }
        });
    }

    public getStatusLabel(row: any): string {
        if (row.error) {
            return 'Error';
        }
        if (row.isMintNeeded) {
            return 'Pending';
        }
        return 'Success';
    }

    public getStatusClass(row: any): string {
        if (row.error) {
            return 'chip chip-color-red';
        }
        if (row.isMintNeeded) {
            return 'chip chip-color-yellow';
        }
        return 'chip chip-color-green';
    }

    public hasError(row: any): boolean {
        return !!row.error;
    }

    public getTokenTypeLabel(tokenType: string): string {
        if (tokenType === 'non-fungible') {
            return 'NFT';
        }
        if (tokenType === 'fungible') {
            return 'FT';
        }
        return tokenType || '';
    }

    public getFormattedAmount(row: any): string {
        if (row.amount == null) {
            return '-';
        }
        return row.decimals > 0
            ? String(row.amount / Math.pow(10, row.decimals))
            : String(row.amount);
    }

    public getMintedDisplay(row: any): string {
        if (row.mintedExpected == null) {
            return '-';
        }
        return `${row.mintedAmount} / ${row.mintedExpected}`;
    }

    public getTransferredDisplay(row: any): string {
        if (!row.wasTransferNeeded) {
            return 'N/A';
        }
        return `${row.transferredAmount} / ${row.transferredExpected}`;
    }
}

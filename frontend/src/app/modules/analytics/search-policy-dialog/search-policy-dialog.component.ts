import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Search policy dialog.
 */
@Component({
    selector: 'search-policy-dialog',
    templateUrl: './search-policy-dialog.component.html',
    styleUrls: ['./search-policy-dialog.component.scss']
})
export class SearchPolicyDialog {
    public loading = false;
    public policy: any = null;
    public filtersForm = new UntypedFormGroup({
        policyName: new UntypedFormControl(''),
        type: new UntypedFormControl('Owned'),
        owner: new UntypedFormControl(''),
        tokens: new UntypedFormControl(false),
        vcDocuments: new UntypedFormControl(false),
        vpDocuments: new UntypedFormControl(false),
        tokensCount: new UntypedFormControl(1),
        vcDocumentsCount: new UntypedFormControl(1),
        vpDocumentsCount: new UntypedFormControl(1),
        toolName: new UntypedFormControl('')
    });
    public types = [{
        name: 'Search only imported',
        value: 'Owned'
    }, {
        name: 'Local Guardian search',
        value: 'Local'
    }, {
        name: 'Global search',
        value: 'Global'
    }];
    public options = [{
        name: 'Not selected',
        value: false
    }, {
        name: 'Yes',
        value: true
    }];
    public showMoreFilters = false;
    public list: any[] = [];
    public selectedAll: boolean = false;
    public count: number = 0;
    public filtersCount: number = 0;
    public error: string | null = null;

    public get globalType(): boolean {
        return this.filtersForm.value.type === 'Global';
    }

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private analyticsService: AnalyticsService,
        private policyEngineService: PolicyEngineService,
        private router: Router
    ) {
        this.policy = this.config.data.policy;
    }

    ngOnInit() {
        this.load();
    }

    public load() {
        this.loading = true;
        this.count = this.policy ? 1 : 0;

        this.filtersCount = 0;
        const filters = this.filtersForm.value;
        const options: any = {
            threshold: 0
        };
        options.type = filters.type;
        if (this.policy) {
            options.policyId = this.policy.id;
        }
        if (filters.policyName) {
            options.text = filters.policyName;
            this.filtersCount++;
        }
        if (filters.owner) {
            options.owner = filters.owner;
            this.filtersCount++;
        }
        if (filters.tokens) {
            options.minTokensCount = filters.tokensCount || 1;
            this.filtersCount++;
        }
        if (filters.vcDocuments) {
            options.minVcCount = filters.vcDocumentsCount || 1;
            this.filtersCount++;
        }
        if (filters.vpDocuments) {
            options.minVpCount = filters.vpDocumentsCount || 1;
            this.filtersCount++;
        }
        if (filters.toolName) {
            options.toolName = filters.toolName;
            this.filtersCount++;
        }
        this.error = null;
        this.analyticsService.searchPolicies(options)
            .subscribe((data) => {
                this.loading = false;
                if (!data || !data.result) {
                    return;
                }
                const { target, result } = data;
                this.list = result;
                for (const item of this.list) {
                    if (item.rate) {
                        if (item.rate >= 80) {
                            item._color = 'item-color-green';
                        } else if (item.rate >= 40) {
                            item._color = 'item-color-yellow';
                        } else {
                            item._color = 'item-color-red';
                        }
                    } else {
                        item._color = 'item-color-red';
                    }
                    item._tags = item.tags.join(', ');
                }
                this.loading = false;
                this.select();
            }, (error) => {
                this.error = error?.error?.message;
                this.list = [];
                this.loading = false;
                console.error(error);
            });
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onCompare() {
        const items = [];
        if (this.policy) {
            items.push({
                type: 'id',
                value: this.policy.id
            })
        }
        const type = this.filtersForm.value.type;
        for (const item of this.list) {
            if (item._select) {
                if (type === 'Global') {
                    items.push({
                        type: 'message',
                        name: item.messageId,
                        value: item.messageId
                    })
                } else {
                    items.push({
                        type: 'id',
                        name: item.name,
                        value: item.id
                    })
                }
            }
        }
        this.ref.close(items);
    }

    public changeType(): void {
        this.loading = true;
        setTimeout(() => {
            this.selectedAll = false;
            this.select();
            this.filtersForm.setValue({
                type: this.filtersForm.value.type,
                policyName: '',
                owner: '',
                tokens: false,
                vcDocuments: false,
                vpDocuments: false,
                tokensCount: 1,
                vcDocumentsCount: 1,
                vpDocumentsCount: 1
            })
            this.load();
        }, 0);
    }

    public clearFilters(): void {
        this.selectedAll = false;
        this.filtersForm.setValue({
            policyName: '',
            type: this.filtersForm.value.type,
            owner: '',
            tokens: false,
            vcDocuments: false,
            vpDocuments: false,
            tokensCount: 1,
            vcDocumentsCount: 1,
            vpDocumentsCount: 1
        })
        this.select();
        this.load();
    }

    public showFilters(): void {
        this.showMoreFilters = !this.showMoreFilters;
    }

    public applyFilters(): void {
        this.load();
    }

    public onSelectAll() {
        this.selectedAll = !this.selectedAll;
        if (this.list) {
            for (const item of this.list) {
                item._select = this.selectedAll;
            }
        }
        this.select();
    }

    public onSelect(item: any) {
        item._select = !item._select;
        this.select();
    }

    public select() {
        this.count = 0;
        if (this.list) {
            for (const item of this.list) {
                if (item._select) {
                    this.count++;
                }
            }
        }
        this.selectedAll = this.count === this.list.length && this.list.length > 0;
        if (this.policy) {
            this.count++;
        }
    }

    public importPolicy(item: any) {
        this.loading = true;
        this.policyEngineService
            .pushImportByMessage(item.messageId)
            .subscribe((result) => {
                const { taskId, expectation } = result;
                this.router.navigate(['task', taskId], {
                    queryParams: {
                        last: btoa(location.href),
                    },
                });
                this.loading = false;
                this.ref.close(null);
            }, (e) => {
                this.loading = false;
            });
    }
}

import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AnalyticsService } from 'src/app/services/analytics.service';

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
    public filtersForm = new FormGroup({
        policyName: new FormControl(''),
        type: new FormControl('Owned'),
        owner: new FormControl(''),
        tokens: new FormControl(false),
        vcDocuments: new FormControl(false),
        vpDocuments: new FormControl(false),
        tokensCount: new FormControl(0),
        vcDocumentsCount: new FormControl(0),
        vpDocumentsCount: new FormControl(0),
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

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private analyticsService: AnalyticsService
    ) {
        this.policy = this.config.data.policy;
    }

    ngOnInit() {
        this.load();
    }

    public load() {
        this.loading = true;
        this.count = this.policy ? 1 : 0;

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
        }
        if (filters.owner) {
            options.owner = filters.owner;
        }
        if (filters.tokens) {
            options.minTokensCount = filters.tokensCount || 0;
        }
        if (filters.vcDocuments) {
            options.minVcCount = filters.vcDocumentsCount || 0;
        }
        if (filters.vpDocuments) {
            options.minVpCount = filters.vpDocumentsCount || 0;
        }
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
                }
                this.loading = false;
                this.select();
            }, ({ message }) => {
                this.loading = false;
                console.error(message);
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
                        name: this.policy.name,
                        value: this.policy.id
                    })
                }
            }
        }
        this.ref.close(items);
    }

    public changeType(): void {
        setTimeout(() => {
            this.filtersForm.setValue({
                type: this.filtersForm.value.type,
                policyName: '',
                owner: '',
                tokens: false,
                vcDocuments: false,
                vpDocuments: false,
                tokensCount: 0,
                vcDocumentsCount: 0,
                vpDocumentsCount: 0
            })
            this.load();
        }, 0);
    }

    public clearFilters(): void {
        this.filtersForm.setValue({
            policyName: '',
            type: this.filtersForm.value.type,
            owner: '',
            tokens: false,
            vcDocuments: false,
            vpDocuments: false,
            tokensCount: 0,
            vcDocumentsCount: 0,
            vpDocumentsCount: 0
        })
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
        this.count = 1;
        if (this.list) {
            for (const item of this.list) {
                if (item._select) {
                    this.count++;
                }
            }
        }
        this.selectedAll = this.count === this.list.length;
    }
}

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
    selector: 'search-label-dialog',
    templateUrl: './search-label-dialog.component.html',
    styleUrls: ['./search-label-dialog.component.scss']
})
export class SearchLabelDialog {
    public loading = false;
    public filtersForm = new UntypedFormGroup({
        name: new UntypedFormControl(''),
        type: new UntypedFormControl('local'),
        itemType: new UntypedFormControl('all'),
        owner: new UntypedFormControl(''),
    });
    public types = [{
        name: 'Local Guardian search',
        value: 'local'
    }, {
        name: 'Global search',
        value: 'global'
    }];
    public options = [{
        name: 'All',
        value: 'all'
    }, {
        name: 'Label',
        value: 'label'
    }, {
        name: 'Statistic',
        value: 'statistic'
    }];
    public showMoreFilters = false;
    public list: any[] = [];
    public selectedAll: boolean = false;
    public count: number = 0;
    public filtersCount: number = 0;
    public error: string | null = null;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private analyticsService: AnalyticsService,
        private policyEngineService: PolicyEngineService,
        private router: Router
    ) {

    }

    ngOnInit() {
        this.load();
    }

    public load() {
        this.loading = true;

        this.filtersCount = 0;
        const filters = this.filtersForm.value;

        const options: any = {};
        options.type = filters.type;
        if (filters.name) {
            options.text = filters.name;
            this.filtersCount++;
        }
        if (filters.owner) {
            options.owner = filters.owner;
            this.filtersCount++;
        }
        if (filters.itemType) {
            options.type = filters.itemType;
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
                    item._type = 'label';
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
        const items = this.list.filter((e) => e._select);
        this.ref.close(items);
    }

    public changeType(): void {
        // this.loading = true;
        // setTimeout(() => {
        //     this.selectedAll = false;
        //     this.select();
        //     this.filtersForm.setValue({
        //         type: this.filtersForm.value.type,
        //         policyName: '',
        //         owner: '',
        //         tokens: false,
        //         vcDocuments: false,
        //         vpDocuments: false,
        //         tokensCount: 1,
        //         vcDocumentsCount: 1,
        //         vpDocumentsCount: 1
        //     })
        //     this.load();
        // }, 0);
    }

    public clearFilters(): void {
        this.selectedAll = false;
        this.filtersForm.setValue({
            name: '',
            type: this.filtersForm.value.type,
            owner: '',
            itemType: 'all',
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
    }
}
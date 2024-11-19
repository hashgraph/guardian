import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';

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
        text: new UntypedFormControl(''),
        type: new UntypedFormControl('local'),
        components: new UntypedFormControl('all'),
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
        private policyLabelsService: PolicyLabelsService
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

        if (filters.text) {
            options.text = filters.text;
            this.filtersCount++;
        }
        if (filters.owner) {
            options.owner = filters.owner;
            this.filtersCount++;
        }
        if (filters.components) {
            options.components = filters.components;
            if(filters.components !== 'all') {
                this.filtersCount++;
            }
        }

        this.error = null;
        this.policyLabelsService.searchComponents(options)
            .subscribe((data) => {
                this.loading = false;
                if (!data) {
                    return;
                }
                const { labels, statistics } = data;
                this.list = [];
                if (Array.isArray(labels)) {
                    for (const item of labels) {
                        item._type = 'label';
                        item._icon = 'circle-check';
                        this.list.push(item);
                    }
                }
                if (Array.isArray(statistics)) {
                    for (const item of statistics) {
                        item._type = 'statistic';
                        item._icon = 'stats';
                        this.list.push(item);
                    }
                }

                this.list.forEach((_i)=>_i.messageId = Math.random())
                
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
        this.loading = true;
        setTimeout(() => {
            this.selectedAll = false;
            this.select();
            this.filtersForm.setValue({
                type: this.filtersForm.value.type,
                text: '',
                owner: '',
                components: 'all',
            })
            this.load();
        }, 0);
    }

    public clearFilters(): void {
        this.selectedAll = false;
        this.filtersForm.setValue({
            type: this.filtersForm.value.type,
            text: '',
            owner: '',
            components: 'all',
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
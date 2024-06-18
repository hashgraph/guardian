import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { CompareStorage } from 'src/app/services/compare-storage.service';
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
    public filtersForm = new FormGroup({
        policyName: new FormControl(''),
        type: new FormControl('Owned'),
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
        const options: any = {};
        options.type = filters.type;
        if (this.policy) {
            options.policyId = this.policy.id;
        }
        if(filters.policyName) {
            options.text = filters.policyName;
        }

        // const options = {
        //     policyId,
        //     type: 'Global',
        //     // text,
        //     // owner,
        //     // minVcCount,
        //     // minVpCount,
        //     // minTokensCount,
        //     // threshold
        // }
        this.analyticsService.searchPolicies(options)
            .subscribe((data) => {
                this.loading = false;
                if (!data || !data.result) {
                    return;
                }
                const { target, result } = data;
                this.list = result;
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
        // if (!this.items.length) {
        //     return;
        // }
        // const items = [];
        // if (this.first) {
        //     items.push({
        //         type: this.first.type,
        //         value: this.first.value
        //     })
        // }
        // for (const item of this.items) {
        //     items.push({
        //         type: item.type,
        //         value: item.value
        //     })
        // }
        // this.ref.close(items);
    }

    public clearFilters(): void {

    }

    public showFilters(): void {
        this.showMoreFilters = !this.showMoreFilters;
    }

    public applyFilters(): void {
        this.showMoreFilters = false;
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



    // public onOk(): void {
    //     this.dialogRef.close();
    // }



    // public onCompare() {
    //     if (!this.list || this.count < 2) {
    //         return;
    //     }
    //     const policies = this.list.filter(item => item._select);
    //     const policyIds = policies.map(p => p.id);
    //     policyIds.unshift(this.policyId);
    //     if (policyIds.length > 1) {
    //         this.dialogRef.close();
    //         const items = btoa(JSON.stringify({
    //             parent: null,
    //             items: policyIds.map((id) => {
    //                 return {
    //                     type: 'id',
    //                     value: id
    //                 }
    //             })
    //         }));
    //         this.router.navigate(['/compare'], {
    //             queryParams: {
    //                 type: 'policy',
    //                 items
    //             }
    //         });
    //     }
    // }



    // public onSearch(event: any) {
    //     const value = (event?.target?.value || '').toLowerCase();
    //     if (this.list && value) {
    //         this._list = this.list
    //             .filter(p => p._search.indexOf(value) !== -1);
    //     } else {
    //         this._list = this.list;
    //     }
    // }

    // public onSelectAll() {
    //     this.selectedAll = !this.selectedAll;
    //     if (this.list) {
    //         for (const item of this.list) {
    //             item._select = this.selectedAll;
    //         }
    //     }
    //     this.onSelect();
    // }

    // public onNewPage() {
    //     this.dialogRef.close();
    //     this.router.navigate(['/search'], {
    //         queryParams: {
    //             type: 'policy',
    //             policyId: this.policyId,
    //         }
    //     });
    // }
}

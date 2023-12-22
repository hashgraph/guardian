import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyCategoryType } from '@guardian/interfaces';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { IPolicyCategory } from 'src/app/modules/policy-engine/structures';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { TagsService } from 'src/app/services/tag.service';

interface PolicyResult {
    id: string;
    name: string;
    description: string;
    detailsUrl: string;
}

/**
 * The page with guided policy search
 */
@Component({
    selector: 'app-policy-guided-search',
    templateUrl: './policy-guided-search.component.html',
    styleUrls: ['./policy-guided-search.component.scss'],
})
export class PolicyGuidedSearchComponent implements OnInit {
    loading: boolean = false;

    selectedCategoryIds: string[] = [];
    searchFilter = new FormControl({value: '', disabled: true});

    policyScale: string;
    categories: IPolicyCategory[] = [];
    results: PolicyResult[] = [];

    appliedTechnologyTypeOptions: IPolicyCategory[] = [];
    migrationActivityTypeOptions: IPolicyCategory[] = [];
    projectScaleOptions: IPolicyCategory[] = [];
    sectoralScopeOptions: IPolicyCategory[] = [];
    subTypeOptions: IPolicyCategory[] = [];

    constructor(
        public tagsService: TagsService,
        public dialog: MatDialog,
        private policyEngineService: PolicyEngineService
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.policyEngineService.getPolicyCategories().subscribe((data: any) => {
            this.loading = false;
            this.categories = data;
            this.policyScale = '';

            this.appliedTechnologyTypeOptions = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
            this.migrationActivityTypeOptions = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.MITIGATION_ACTIVITY_TYPE);
            this.projectScaleOptions = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.PROJECT_SCALE);
            this.sectoralScopeOptions = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.SECTORAL_SCOPE);
            this.subTypeOptions = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.SUB_TYPE);

            // this.loadData();
        })

        this.searchFilter.valueChanges.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(() => {
            this.loadData();
        })
    }

    loadData() {
        this.loading = true;

        const filterCategories = [...this.selectedCategoryIds];
        if (this.policyScale) {
            filterCategories.push(this.policyScale)
        }

        this.policyEngineService.getFilteredPolicies(filterCategories, this.searchFilter.value || '').subscribe((data: any) => {
            this.results = data;
            this.loading = false;
        })
    }

    ngOnDestroy(): void {
    }

    canDisplayResults(): boolean {
        return !this.loading && ((!!this.policyScale || this.policyScale === '') || this.selectedCategoryIds && this.selectedCategoryIds.length > 0);
    }

    isOptionSelected(categoryId: string): boolean {
        return this.selectedCategoryIds.some(id => categoryId === id);
    }

    onRadioSelect(): void {
        this.searchFilter.enable();
        this.loadData();
    }

    onSelectCategory(categoryId: string): void {
        const exists = this.selectedCategoryIds.some(id => categoryId === id);
        if (exists) {
            this.selectedCategoryIds = this.selectedCategoryIds.filter(id => categoryId !== id);
        } else {
            this.selectedCategoryIds = [...this.selectedCategoryIds, categoryId];
        }

        this.searchFilter.enable();
        this.loadData();
    }

    clearOptions() {
        this.searchFilter.reset();
        this.policyScale = '';
        this.selectedCategoryIds = [];
        this.loadData();
    }
}

import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { PolicyCategoryType } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { ProjectComparisonService } from 'src/app/services/project-comparison.service';
import { IPolicyCategory, IProject } from '../../structures';

enum SortBy {
    DATE_REGISTRATION_ASC,
    DATE_REGISTRATION_DESC,
    TITLE_FROM_A_TO_Z,
    TITLE_FROM_Z_TO_A,
    COMPANY_FROM_A_TO_Z,
    COMPANY_FROM_Z_TO_A,
}

interface SortByOption {
    id: SortBy;
    name: string;
}

const SORT_BY_OPTION: SortByOption[] = [
    {
        id: SortBy.DATE_REGISTRATION_ASC,
        name: 'Registration date (new)'
    },
    {
        id: SortBy.DATE_REGISTRATION_DESC,
        name: 'Registration date (old)'
    },
    {
        id: SortBy.TITLE_FROM_A_TO_Z,
        name: 'Title (a-z)'
    },
    {
        id: SortBy.TITLE_FROM_Z_TO_A,
        name: 'Title (z-a)'
    },
    {
        id: SortBy.COMPANY_FROM_A_TO_Z,
        name: 'Company (a-z)'
    },
    {
        id: SortBy.COMPANY_FROM_Z_TO_A,
        name: 'Company (z-a)'
    },
];

@Component({
    selector: 'app-projects-overview',
    templateUrl: './projects-overview.component.html',
    styleUrls: ['./projects-overview.component.scss']
})
export class ProjectsOverviewComponent implements OnInit {

    loading: boolean = true;
    loadingProjects: boolean = false;

    categories: IPolicyCategory[] = [];
    results: any[] = [];

    sortByOption: SortByOption[] = SORT_BY_OPTION;
    selectedSortByOption: SortByOption = this.sortByOption[0];

    sectoralScopesList: IPolicyCategory[] = [];
    activityScalesList: IPolicyCategory[] = [];
    appliedTechnologiesList: IPolicyCategory[] = [];
    projectScalesList: IPolicyCategory[] = [];
    subTypesList: IPolicyCategory[] = [];

    methodologiesUsedList: any;
    allProjects: IProject[] = [];
    preparedProjects: IProject[] = [];
    projectsToComparing: IProject[] = [];

    selectedProjectsCount: number = 0;

    filterFormGroup = new FormGroup({
        sectoralScopes: new FormControl(null),
        activityScales: new FormControl(null),
        appliedTechnologies: new FormControl(null),
        projectScales: new FormControl(null),
        subTypes: new FormControl(null),
        methodologiesUsed: new FormControl(null),
        search: new FormControl(null),
        amountOfReductionsFrom: new FormControl(null),
        amountOfReductionsTo: new FormControl(null),
        feeLevelFrom: new FormControl(null),
        feeLevelTo: new FormControl(null),
    });

    constructor(
        private projectComparisonService: ProjectComparisonService,
        private router: Router
    ) {
    }

    get selectedCategoryIds(): string[] {
        const { sectoralScopes, activityScales, appliedTechnologies, projectScales, subTypes } = this.filterFormGroup.value;
        return [
            ...(Array.isArray(sectoralScopes) ? sectoralScopes : []),
            ...(Array.isArray(activityScales) ? activityScales : []),
            ...(Array.isArray(appliedTechnologies) ? appliedTechnologies : []),
            ...(Array.isArray(projectScales) ? projectScales : []),
            ...(Array.isArray(subTypes) ? subTypes : [])
        ];
    }

    get selectedMethodologyIds(): string[] {
        const { methodologiesUsed } = this.filterFormGroup.value;
        return [...(Array.isArray(methodologiesUsed) ? methodologiesUsed : []),];
    }

    get projectsWithSelected(): IProject[] {
        const selectedProjects = this.projectsToComparing.filter(proj => !this.allProjects.some(p => p.id === proj.id));
        return [...this.preparedProjects, ...selectedProjects];
    }

    ngOnInit(): void {

        forkJoin([
            this.projectComparisonService.getPolicyCategories(),
            this.projectComparisonService.getMethodologies()
        ]).subscribe(([policyCategories, methodologies]) => {
            this.loading = false;
            this.categories = policyCategories;

            this.sectoralScopesList = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.MITIGATION_ACTIVITY_TYPE);
            this.activityScalesList = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.SECTORAL_SCOPE);

            this.appliedTechnologiesList = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
            this.projectScalesList = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.PROJECT_SCALE);
            this.subTypesList = this.categories.filter((item: IPolicyCategory) => item.type === PolicyCategoryType.SUB_TYPE);

            this.methodologiesUsedList = methodologies;

            this.trackFilterChanges();
            this.recoverData();
        });
    }

    compareExecute() {
        const projectIds = this.projectsToComparing.map(project => project.id);
        this.router.navigate(['/projects/comparison'], { queryParams: { projectIds: projectIds.join(',') } });
    }

    searchByFilter() {
        this.loadingProjects = true;
        this.projectComparisonService.getFilteredProjects(this.selectedCategoryIds, this.selectedMethodologyIds)
            .subscribe((result: any) => {
                this.allProjects = result;
                this.filterByInput();
                const activeProjects = localStorage.getItem('active-projects');
                if (activeProjects) {
                    const projectIds = JSON.parse(activeProjects) as string[];
                    if (projectIds) {
                        this.projectsToComparing = this.allProjects.filter(f => projectIds.includes(f.id));
                        this.selectedProjectsCount = this.projectsToComparing.length;
                        localStorage.removeItem('active-projects');
                    }
                }
                this.loadingProjects = false
            });
    }

    clearFilters() {
        this.filterFormGroup.reset();
        this.allProjects = [];
        this.preparedProjects = this.allProjects;
    }

    alreadyInCompare(project: IProject): boolean {
        return this.projectsToComparing.some((proj) => proj.id === project.id)
    }

    addToCompare(project: IProject) {
        this.selectedProjectsCount++;
        this.projectsToComparing.push(project);
    }

    removeFromCompare(project: IProject) {
        this.selectedProjectsCount--;
        this.projectsToComparing = this.projectsToComparing.filter(proj => proj.id !== project.id);
    }

    filterByInput() {
        const str = this.filterFormGroup.controls['search'].value;
        if (str && str.length > 0) {
            this.preparedProjects = this.allProjects
                .filter(f => f.title && typeof f.title === 'string' || f.companyName && typeof f.companyName === 'string')
                .filter(f => f.title && f.title.toLowerCase().includes(str) || f.companyName && f.companyName.toLowerCase().includes(str));
        } else {
            this.preparedProjects = this.allProjects;
        }
        this.sortData();
    }

    ngOnDestroy() {
        const savedFilter = JSON.stringify(this.filterFormGroup.value);
        const savedSorter = JSON.stringify(this.selectedSortByOption);
        localStorage.setItem('project-comparison-state-filter', savedFilter);
        localStorage.setItem('project-comparison-state-sorter', savedSorter);
    }

    sortData() {
        this.preparedProjects = this.preparedProjects.sort((a, b) => {
            if (this.selectedSortByOption.id === SortBy.TITLE_FROM_A_TO_Z ||
                this.selectedSortByOption.id === SortBy.TITLE_FROM_Z_TO_A
            ) {
                if (!a.title || !b.title || typeof a.title !== 'string' || typeof b.title !== 'string') {
                    return -1;
                }
            }
            if (this.selectedSortByOption.id === SortBy.COMPANY_FROM_A_TO_Z ||
                this.selectedSortByOption.id === SortBy.COMPANY_FROM_Z_TO_A
            ) {
                if (!a.companyName || !b.companyName || typeof a.companyName !== 'string' || typeof b.companyName !== 'string') {
                    return -1;
                }
            }
            switch (this.selectedSortByOption.id) {
                default:
                case SortBy.DATE_REGISTRATION_ASC:
                    return new Date(b.registered).getDate() - new Date(a.registered).getDate() < 0 ? 1 : -1;
                case SortBy.DATE_REGISTRATION_DESC:
                    return new Date(b.registered).getDate() - new Date(a.registered).getDate() < 0 ? -1 : 1;
                case SortBy.TITLE_FROM_A_TO_Z:
                    return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
                case SortBy.TITLE_FROM_Z_TO_A:
                    return a.title.toLowerCase() < b.title.toLowerCase() ? 1 : -1;
                case SortBy.COMPANY_FROM_A_TO_Z:
                    return a.companyName.toLowerCase() < b.companyName.toLowerCase() ? -1 : 1;
                case SortBy.COMPANY_FROM_Z_TO_A:
                    return a.companyName.toLowerCase() < b.companyName.toLowerCase() ? 1 : -1;
            }
        });
    }

    private recoverData() {
        const filter = localStorage.getItem('project-comparison-state-filter');
        const sorter = localStorage.getItem('project-comparison-state-sorter');

        if (filter) {
            this.filterFormGroup.patchValue(JSON.parse(filter));
            this.filterFormGroup.controls['search'].patchValue(null);
            localStorage.removeItem('project-comparison-state-filter');
            this.searchByFilter();
            this.filterByInput();
        }
        if (sorter) {
            this.selectedSortByOption = JSON.parse(sorter);
            localStorage.removeItem('project-comparison-state-sorter');
            this.sortData();
        }

    }

    private trackFilterChanges() {
        this.filterFormGroup.valueChanges.subscribe(() => {
            const { sectoralScopes, activityScales, appliedTechnologies, projectScales, subTypes } = this.filterFormGroup.value;
            const categoryIds: string[] = [
                ...(Array.isArray(sectoralScopes) ? sectoralScopes : []),
                ...(Array.isArray(activityScales) ? activityScales : []),
                ...(Array.isArray(appliedTechnologies) ? appliedTechnologies : []),
                ...(Array.isArray(projectScales) ? projectScales : []),
                ...(Array.isArray(subTypes) ? subTypes : [])
            ];
            this.projectComparisonService.getMethodologies(categoryIds)
                .subscribe(result => {
                    this.methodologiesUsedList = result;
                });
        });
    }
}

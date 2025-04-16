import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, ISchema, PolicyType, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { FormulasService } from 'src/app/services/formulas.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { SchemaService } from 'src/app/services/schema.service';

interface IColumn {
    id: string;
    title: string;
    type: string;
    size: string;
    tooltip: boolean;
    permissions?: (user: UserPermissions) => boolean;
    canDisplay?: () => boolean;
}

@Component({
    selector: 'app-project-data-export',
    templateUrl: './project-data-export.component.html',
    styleUrls: ['./project-data-export.component.scss'],
})
export class ProjectDataExportComponent implements OnInit {
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];
    public allPolicies: any[] = [];
    public currentPolicy: any = null;

    public filtersCount: number = 0;
    public showMoreFilters = true;

    public schemas: ISchema[] = [];
    public owners: ISchema[] = [];
    public tokens: ISchema[] = [];

    public selectedSchemas!: ISchema[];
    public selectedOwners!: ISchema[];
    public selectedTokens!: ISchema[];

    private subscription = new Subscription();

    public filtersForm = new UntypedFormGroup({
        textSearch: new UntypedFormControl(''),
        schemas: new UntypedFormControl([]),
        owners: new UntypedFormControl([]),
        tokens: new UntypedFormControl([]),
        related: new UntypedFormControl(''),
    });
    
    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private schemaService: SchemaService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [
            {
                id: 'documentFileId',
                title: 'File Id',
                type: 'text',
                size: '200',
                tooltip: true
            },
            {
                id: 'issuanceDate',
                title: 'Date',
                type: 'text',
                size: '200',
                tooltip: true
            },
            {
                id: 'schemaName',
                title: 'Schema Name',
                type: 'text',
                size: '200',
                tooltip: true
            },
            {
                id: 'owner',
                title: 'Owner',
                type: 'text',
                size: 'auto',
                tooltip: true
            },
            {
                id: 'operations',
                title: ' ',
                type: 'text',
                size: '220',
                tooltip: false
            }
        ]
    }

    public options = [{
        name: 'Not selected',
        value: false
    }, {
        name: 'Yes',
        value: true
    }];

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadFiltersData() {
        this.schemaService.getSchemasByPolicy(this.currentPolicy.id).subscribe(data => {
            if (data) {
                this.schemas = data;
            }
            this.loadData();
        });
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.all(),
        ]).subscribe(([profile, policies]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            
            this.allPolicies = policies || [];
            this.allPolicies.unshift({
                name: 'All',
                id: null
            });
            this.allPolicies.forEach((p: any) => p.label = p.name);

            const policy = this.route.snapshot.params['id'];
            if(policy) {
                this.currentPolicy = this.allPolicies.find((p) => p.id === policy);
            }
            
            if(!this.currentPolicy) {
                this.currentPolicy = this.allPolicies[0];
            }

            if (this.isConfirmed) {
                this.loadFiltersData();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadData() {
        this.filtersCount = 0;
        const filters = this.filtersForm.value;
        const options: any = {};

        if (filters.textSearch) {
            options.textSearch = filters.textSearch;
        }
        if (filters.schemas && filters.schemas.length > 0) {
            options.schemas = filters.schemas;
            this.filtersCount++;
        }
        if (filters.owners && filters.owners.length > 0) {
            options.owners = filters.owners;
            this.filtersCount++;
        }
        if (filters.tokens && filters.tokens.length > 0) {
            options.tokens = filters.tokens;
            this.filtersCount++;
        }
        if (filters.related) {
            options.related = filters.related;
            this.filtersCount++;
        }

        console.log(options);
        

        this.loading = true;

        this.policyEngineService
            .documentsExport(
                this.currentPolicy.id,
                options,
                this.pageIndex,
                this.pageSize
            )
            .subscribe({
                next: (response) => {
                    const { page, count } = this.policyEngineService.parsePage(response);

                    this.page = page;
                    this.pageCount = count;
            
                    for (const item of this.page) {
                        item.issuanceDate = item.document?.issuanceDate;
                        item.schemaName = this.schemas.find(schema => schema.iri == item.schema)?.description || item.schema;
                    }
                    console.log(this.page);
                    
            
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                error: (e) => {
                    this.loading = false;
                }
            });
    }

    public onBack() {
        this.router.navigate(['/policy-viewer']);
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public onFilter(event: any) {
        if (event.value === null) {
            this.currentPolicy = this.allPolicies[0];
        }
        this.pageIndex = 0;
        const policy = this.currentPolicy?.id || 'all'
        this.router.navigate(['/formulas'], { queryParams: { policy } });
        this.loadData();
    }

    public onExport(item: any) {
    }

    public onDelete(item: any) {
    }

    public clearFilters(): void {
        this.filtersForm.setValue({
            textSearch: '',
            schemas: [],
            owners: [],
            tokens: [],
            related: '',
        })
        this.loadData();
    }

    public showFilters(): void {
        this.showMoreFilters = !this.showMoreFilters;
    }

    public applyFilters(): void {
        this.loadData();
    }

    public setRelated(item: any): void {
        const relatedId = item.messageId;
        if (relatedId) {
            this.filtersForm.get('related')?.setValue(relatedId);
            this.loadData();
        }
    }
}
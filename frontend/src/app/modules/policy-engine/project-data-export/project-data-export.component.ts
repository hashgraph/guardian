import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ISchema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, of, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
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
    public policyId: string;

    public filtersCount: number = 0;
    public showMoreFilters = false;

    public schemas: ISchema[] = [];
    public owners: string[] = [];
    public tokens: string[] = [];
    
    public selectedRows: any[] = [];

    public selectedAll: boolean = false;

    private subscription = new Subscription();

    private params: Params;

    public filtersForm = new UntypedFormGroup({
        textSearch: new UntypedFormControl(''),
        schemas: new UntypedFormControl([]),
        owners: new UntypedFormControl([]),
        tokens: new UntypedFormControl([]),
        related: new UntypedFormControl([]),
    });
    
    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private schemaService: SchemaService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [
            {
                id: 'select',
                title: '',
                type: 'checkbox',
                size: '64',
                tooltip: true
            },
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
            this.route.queryParams.subscribe((params) => {
                this.params = params;
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
    
    public get related(): string[] {
        return this.filtersForm?.get('related')?.value || [];
    }

    public isRelated(row: any): boolean {
        return this.related?.some((id) => row.messageId == id);
    }

    public onClearRelatedFilter() {
        this.filtersForm?.get('related')?.setValue([]);
        this.applyFilters();
    }

    private loadFiltersData() {
        forkJoin([
            this.user.SCHEMAS_SCHEMA_READ
                ? this.schemaService.getSchemasByPolicy(this.policyId)
                : of([]),
            this.policyEngineService.getPolicyDocumentOwners(this.policyId),
            this.policyEngineService.getPolicyTokens(this.policyId),
        ]).subscribe((value) => {
            const schemas: ISchema[] = value[0] || [];
            const owners: string[] = value[1] || [];
            const tokens: string[] = value[2] || [];

            if (schemas) {
                this.schemas = schemas;
            }
            if (owners) {
                this.owners = owners;
            }
            if (tokens) {
                this.tokens = tokens;
            }
            
            this.setFiltersFromQueryParams(this.params);
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

            this.policyId = this.route.snapshot.params['id'];
            if(this.policyId) {
                this.currentPolicy = this.allPolicies.find((p) => p.id === this.policyId);
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
        if (filters.related && filters.related.length > 0) {
            options.related = filters.related;
            this.filtersCount++;
        }
        if (this.filtersCount > 0) {
            this.showMoreFilters = true;
        }

        if (!this.user.STANDARD_REGISTRY) {
            const control = this.filtersForm.get('owners');
            if (control) {
                control.setValue([this.user.did]);
                control.disable();
            }
            options.owners = [this.user.did];
        }

        if (!this.user.SCHEMAS_SCHEMA_READ) {
            const control = this.filtersForm.get('schemas');
            if (control) {
                control.disable();
            }
        }

        this.loading = true;
        this.policyEngineService
            .searchDocuments(
                this.policyId,
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
                        item.issuanceDate = item.document?.issuanceDate || item.createDate;
                        item.schemaName = this.schemas.find(schema => schema.iri == item.schema)?.name || item.schema || 'NONE';

                        if (this.related.some(id => id === item.messageId)) {
                            this.selectedRows.push(item);
                        }
                    }
            
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

    public clearFilters(): void {
        this.filtersForm.setValue({
            textSearch: '',
            schemas: [],
            owners: [],
            tokens: [],
            related: '',
        })
        this.applyFilters();
    }

    public showFilters(): void {
        this.showMoreFilters = !this.showMoreFilters;
    }

    get selectedSchemas() {
        return this.filtersForm?.get('schemas')?.value;
    }

    get selectedOwners() {
        return this.filtersForm?.get('owners')?.value;
    }

    get selectedTokens() {
        return this.filtersForm?.get('tokens')?.value;
    }

    private setFiltersFromQueryParams(params: any) {
        this.filtersForm?.get('schemas')?.setValue(params.schemas ? this.schemas.filter(schema => params.schemas.split(',')?.some((iri: string) => schema.iri === iri)) || [] : []);
        this.filtersForm?.get('owners')?.setValue(params.owners ? params.owners.split(',') : []);
        this.filtersForm?.get('tokens')?.setValue(params.tokens ? params.tokens.split(',') : []);
        this.filtersForm?.get('related')?.setValue(params.related ? params.related.split(',') : []);

        this.filtersForm.patchValue({
            schemas: params.schemas ? params.schemas.split(',') : [],
            owners: params.owners ? params.owners.split(',') : [],
            tokens: params.tokens ? params.tokens.split(',') : [],
            related: params.related ? params.related.split(',') : [],
        });
    }

    public applyFilters(): void {
        const filters = this.filtersForm.value;

        this.selectedAll = false;

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                tab: 1,
                schemas: (filters?.schemas?.length > 0 && filters?.schemas.join(',')) || null,
                owners: (filters?.owners?.length > 0 && filters?.owners.join(',')) || null,
                tokens: (filters?.tokens?.length > 0 && filters?.tokens.join(',')) || null,
                related: (filters?.related?.length > 0 && filters?.related.join(',')) || null
            },
            queryParamsHandling: 'merge',
        });
    }

    public onFindRelated() {
        if (this.selectedRows && this.selectedRows.length >= 0) {
            const messageIds: string[] = [];
            for (const row of this.selectedRows) {
                if (row.messageId) {
                    messageIds.push(row.messageId);
                }
            }

            if (messageIds.length > 0) {
                this.filtersForm.get('related')?.setValue(messageIds);
                this.applyFilters();
            }

            this.selectedRows = [];
        }
    }

    public onExport() {
        this.filtersCount = 0;
        const filters = this.filtersForm.value;
        const options: any = {};

        if (this.selectedRows && this.selectedRows.length > 0) {
            options.ids = this.selectedRows.map(row => row.id);
        }
        else {
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
            if (filters.related && filters.related.length > 0) {
                options.related = filters.related;
                this.filtersCount++;
            }
        }

        this.loading = true;
        this.policyEngineService
            .exportDocuments(
                this.currentPolicy.id,
                options,
            )
            .subscribe({
                next: (fileBuffer) => {
                    if (fileBuffer) {
                        this.downloadObject(fileBuffer);
                    }
            
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                error: (e) => {
                    this.loading = false;
                    console.error(e);
                }
            });
    }

    private downloadObject(fileBuffer: ArrayBuffer) {
        const downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(
            new Blob([new Uint8Array(fileBuffer)], {
                type: 'application/guardian-formula'
            })
        );
        downloadLink.setAttribute('download', `${this.currentPolicy.name}_${this.currentPolicy.version}.zip`);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
    }

    public canShowFindRelatedButton(): boolean {
        return this.selectedRows && this.selectedRows.length > 0 && this.selectedRows.filter(row => row.messageId).length > 0;
    }

    public selectRow() {
        this.selectedAll = false;
    }

    public selectAllRows($event: any) {
        if ($event.checked) {
            this.selectedRows = this.page;
        } else {
            this.selectedRows = [];
        }
    }
}
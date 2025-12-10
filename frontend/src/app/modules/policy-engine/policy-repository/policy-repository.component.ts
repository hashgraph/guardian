import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subject, Subscription, takeUntil } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';
import { VCFullscreenDialog } from '../../schema-engine/vc-fullscreen-dialog/vc-fullscreen-dialog.component';
import { SchemaService } from 'src/app/services/schema.service';
import { PolicyRepositoryService } from 'src/app/services/policy-repository.service';

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
    selector: 'app-policy-repository',
    templateUrl: './policy-repository.component.html',
    styleUrls: ['./policy-repository.component.scss'],
})
export class PolicyRepositoryComponent implements OnInit {
    public readonly title: string = 'Policy Workflow Repository';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public policyId!: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];
    public schemas: any[];
    public users: any[];
    public currentSchema?: string = '';
    public currentUser?: string = '';

    private _destroy$ = new Subject<void>();
    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyRepositoryService: PolicyRepositoryService,
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [{
            id: 'id',
            title: 'ID',
            type: 'text',
            size: '250',
            tooltip: true
        }, {
            id: 'messageId',
            title: 'Message ID',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'schema',
            title: 'Schema',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'owner',
            title: 'Owner',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'view',
            title: 'View',
            type: 'text',
            size: '250',
            tooltip: false
        }]
    }

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
        this._destroy$.next();
        this._destroy$.unsubscribe();
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        const policyId = this.route.snapshot.params['id'];
        if (policyId && this.policyId == policyId) {
            return;
        }
        this.policyId = policyId;

        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyRepositoryService.getSchemas(this.policyId),
            this.policyRepositoryService.getUsers(this.policyId),
        ])
            .pipe(takeUntil(this._destroy$))
            .subscribe(([profile, schemas, users]) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;

                if (!this.isConfirmed) {
                    this.loading = false;
                    return;
                }

                this.schemas = schemas || [];
                this.users = users || [];

                this.schemas.unshift({
                    name: 'All',
                    iri: ''
                })
                this.users.unshift({
                    label: 'All',
                    value: ''
                })

                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    private loadData() {
        const filters: any = this.getFilter();
        this.loading = true;
        this.policyRepositoryService
            .getDocuments(
                this.policyId,
                filters,
                this.pageIndex,
                this.pageSize
            )
            .pipe(takeUntil(this._destroy$))
            .subscribe((response) => {
                const { page, count } = this.policyEngineService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
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

    public getUser(did: string) {
        if (this.users) {
            for (const user of this.users) {
                if (user.value === did) {
                    return user.label;
                }
            }
        }
        return did;
    }

    public getSchema(iri: string) {
        if (this.schemas) {
            for (const schema of this.schemas) {
                if (schema.iri === iri) {
                    return schema.name;
                }
            }
        }
        return iri;
    }

    public onView(row: any) {
        const schema = this.getSchema(row.schema);
        const dialogRef = this.dialogService.open(VCFullscreenDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            maskStyleClass: 'guardian-fullscreen-dialog',
            data: {
                type: 'VC',
                backLabel: 'Back to Policy',
                title: schema,
                viewDocument: true,
                dryRun: !!row.dryRunId,
                id: row.id,
                row: row,
                document: row.document,
                exportDocument: false,
                key: true,
                comments: true,
                commentsReadonly: true,
                destroy: this._destroy$
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onFilter($event: any) {
        this.loadData();
    }

    private getFilter() {
        const filters: any = { 
            type: 'VC',
            comments: true
        };
        if (this.currentSchema) {
            filters.schema = this.currentSchema;
        }
        if (this.currentUser) {
            filters.owner = this.currentUser;
        }
        return filters;
    }
}
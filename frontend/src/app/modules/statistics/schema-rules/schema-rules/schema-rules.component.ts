import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { CustomConfirmDialogComponent } from '../../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { NewSchemaRuleDialog } from '../dialogs/new-schema-rule-dialog/new-schema-rule-dialog.component';
import { IImportEntityResult, ImportEntityDialog, ImportEntityType } from '../../../common/import-entity-dialog/import-entity-dialog.component';

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
    selector: 'app-schema-rules',
    templateUrl: './schema-rules.component.html',
    styleUrls: ['./schema-rules.component.scss'],
})
export class SchemaRulesComponent implements OnInit {
    public readonly title: string = 'Schema Rules';

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

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private schemaRulesService: SchemaRulesService,
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [{
            id: 'name',
            title: 'Name',
            type: 'text',
            size: 'auto',
            tooltip: true
        }, {
            id: 'policy',
            title: 'Policy',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'status',
            title: 'Status',
            type: 'text',
            size: '180',
            tooltip: false
        }, {
            id: 'edit',
            title: '',
            type: 'text',
            size: '56',
            tooltip: false
        }, {
            id: 'export',
            title: '',
            type: 'text',
            size: '56',
            tooltip: false
        }, {
            id: 'delete',
            title: '',
            type: 'text',
            size: '64',
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
        this.subscription.unsubscribe();
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
            this.allPolicies = this.allPolicies.filter((p) => p.status === PolicyStatus.PUBLISH);
            this.allPolicies.unshift({
                name: 'All',
                instanceTopicId: null
            });
            this.allPolicies.forEach((p: any) => p.label = p.name);

            const topic = this.route.snapshot.queryParams['topic'];
            this.currentPolicy =
                this.allPolicies.find((p) => p.instanceTopicId === topic) ||
                this.allPolicies[0];

            if (this.isConfirmed) {
                this.loadData();
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
        const filters: any = {};
        if (this.currentPolicy?.instanceTopicId) {
            filters.policyInstanceTopicId = this.currentPolicy?.instanceTopicId;
        }
        this.loading = true;
        this.schemaRulesService
            .getRules(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.schemaRulesService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                for (const item of this.page) {
                    item.policy = this.allPolicies.find((p) => p.id && p.id === item.policyId)?.name;
                }
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

    public onFilter(event: any) {
        if (event.value === null) {
            this.currentPolicy = this.allPolicies[0];
        }
        this.pageIndex = 0;
        const topic = this.currentPolicy?.instanceTopicId || 'all'
        this.router.navigate(['/schema-rules'], { queryParams: { topic } });
        this.loadData();
    }

    public onCreate() {
        const dialogRef = this.dialogService.open(NewSchemaRuleDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Create New',
                policies: this.allPolicies,
                policy: this.currentPolicy,
                action: 'Create'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.schemaRulesService
                    .createRules(result)
                    .subscribe((newItem) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onEdit(item: any) {
        this.router.navigate(['/schema-rule', item.id]);
    }

    public onImport() {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.SchemaRule,
            }
        });
        dialogRef.onClose.subscribe(async (result: IImportEntityResult | null) => {
            if (result) {
                this.importDetails(result);
            }
        });
    }

    private importDetails(result: IImportEntityResult) {
        const { type, data, rule } = result;
        const dialogRef = this.dialogService.open(NewSchemaRuleDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Preview',
                action: 'Import',
                policies: this.allPolicies,
                policy: this.currentPolicy,
                rule
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result && result.policyId) {
                this.loading = true;
                this.schemaRulesService
                    .import(result.policyId, data)
                    .subscribe((newItem) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onExport(item: any) {
        this.loading = true;
        this.schemaRulesService.export(item.id)
            .subscribe((fileBuffer) => {
                const downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-rules'
                    })
                );
                downloadLink.setAttribute('download', `${item.name}_${Date.now()}.rules`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (error) => {
                this.loading = false;
            });
    }

    public onDelete(item: any) {
        if (item.status === EntityStatus.ACTIVE) {
            return;
        }
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete Rules',
                text: `Are you sure want to delete rules (${item.name})?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.loading = true;
                this.schemaRulesService
                    .deleteRule(item.id)
                    .subscribe((result) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onActive($event: any, row: any) {
        const active = $event === EntityStatus.ACTIVE;
        this.loading = true;
        this.schemaRulesService
            .activateRule(row, active)
            .subscribe((result) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }
}
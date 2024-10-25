import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, IStatistic, PolicyType, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { NewPolicyStatisticsDialog } from '../dialogs/new-policy-statistics-dialog/new-policy-statistics-dialog.component';
import { CustomCustomDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { IImportEntityResult, ImportEntityDialog, ImportEntityType } from '../../common/import-entity-dialog/import-entity-dialog.component';


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
    selector: 'app-statistic-definitions',
    templateUrl: './statistic-definitions.component.html',
    styleUrls: ['./statistic-definitions.component.scss'],
})
export class StatisticDefinitionsComponent implements OnInit {
    public readonly title: string = 'Statistics';

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
    public statuses = [{
        label: 'Draft',
        value: EntityStatus.DRAFT,
        description: 'Return to editing.',
        disable: true
    }, {
        label: 'Published',
        value: EntityStatus.PUBLISHED,
        description: 'Release version into public domain.',
        disable: (value: string): boolean => {
            return !(value === EntityStatus.DRAFT || value === EntityStatus.ERROR);
        }
    }, {
        label: 'Error',
        value: EntityStatus.ERROR,
        description: '',
        disable: true
    }]

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyStatisticsService: PolicyStatisticsService,
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
            id: 'topicId',
            title: 'Topic',
            type: 'text',
            size: '135',
            tooltip: false
        }, {
            id: 'status',
            title: 'Status',
            type: 'text',
            size: '180',
            tooltip: false
        }, {
            id: 'documents',
            title: 'Documents',
            type: 'text',
            size: '125',
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
            id: 'options',
            title: '',
            type: 'text',
            size: '210',
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
        // this.loadProfile();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        // const policyId = this.route.snapshot.params['policyId'];
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
            this.allPolicies = this.allPolicies.filter((p) => p.status === PolicyType.PUBLISH);
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
        this.policyStatisticsService
            .getDefinitions(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.policyStatisticsService.parsePage(response);
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
        this.router.navigate(['/policy-statistics'], { queryParams: { topic } });
        this.loadData();
    }

    public onCreate() {
        const dialogRef = this.dialogService.open(NewPolicyStatisticsDialog, {
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
                this.create(result)
            }
        });
    }

    private create(item: any) {
        this.loading = true;
        this.policyStatisticsService
            .createDefinition(item)
            .subscribe((newItem) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    public onImport() {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.Statistic,
            }
        });
        dialogRef.onClose.subscribe(async (result: IImportEntityResult | null) => {
            if (result) {
                this.importDetails(result);
            }
        });
    }

    private importDetails(result: IImportEntityResult) {
        const { type, data, statistic } = result;
        const dialogRef = this.dialogService.open(NewPolicyStatisticsDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Preview',
                action: 'Import',
                policies: this.allPolicies,
                policy: this.currentPolicy,
                statistic
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.policyStatisticsService
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
        this.policyStatisticsService.export(item.id)
            .subscribe((fileBuffer) => {
                const downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-statistic'
                    })
                );
                downloadLink.setAttribute('download', `${item.name}_${Date.now()}.statistic`);
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

    public onEdit(item: any) {
        this.router.navigate(['/policy-statistics', item.id]);
    }

    public onChangeStatus($event: string, row: any): void {
        this.publish(row)
    }

    public onCreateInstance(item: any): void {
        if (item.status !== 'PUBLISHED') {
            return;
        }
        this.router.navigate(['/policy-statistics', item.id, 'assessment']);
    }

    public onOpenInstances(item: any): void {
        if (item.status !== 'PUBLISHED') {
            return;
        }
        this.router.navigate(['/policy-statistics', item.id, 'assessments']);
    }

    public onDelete(item: any) {
        if (item.status === 'PUBLISHED') {
            return;
        }
        const dialogRef = this.dialogService.open(CustomCustomDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete Statistic',
                text: `Are you sure want to delete statistic (${item.name})?`,
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
                this.policyStatisticsService
                    .deleteDefinition(item)
                    .subscribe((newItem) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    private publish(row: IStatistic) {
        const rules = row?.config?.rules || [];
        const main = rules.find((r) => r.type === 'main');
        if (!main) {
            const dialogRef = this.dialogService.open(CustomCustomDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'guardian-dialog',
                data: {
                    header: 'Publish Statistic',
                    text: 'Statistics cannot be published. Please select main schema.',
                    buttons: [{
                        name: 'Close',
                        class: 'secondary'
                    }]
                },
            });
            dialogRef.onClose.subscribe((result) => { });
        } else {
            const dialogRef = this.dialogService.open(CustomCustomDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'guardian-dialog',
                data: {
                    header: 'Publish Statistic',
                    text: `Are you sure want to publish statistic (${row.name})?`,
                    buttons: [{
                        name: 'Close',
                        class: 'secondary'
                    }, {
                        name: 'Publish',
                        class: 'primary'
                    }]
                },
            });
            dialogRef.onClose.subscribe((result: string) => {
                if (result === 'Publish') {
                    this.loading = true;
                    this.policyStatisticsService
                        .publishDefinition(row)
                        .subscribe((response) => {
                            this.loadData();
                        }, (e) => {
                            this.loading = false;
                        });
                }
            });
        }
    }
}
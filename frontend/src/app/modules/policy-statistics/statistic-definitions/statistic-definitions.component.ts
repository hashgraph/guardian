import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { NewPolicyStatisticsDialog } from '../dialogs/new-policy-statistics-dialog/new-policy-statistics-dialog.component';

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
            size: 'auto',
            tooltip: false
        }, {
            id: 'status',
            title: 'Status',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'docs',
            title: 'Documents',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'edit',
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
            filters.topicId = this.currentPolicy?.instanceTopicId;
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
            header: 'Create New',
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                policies: this.allPolicies,
                policy: this.currentPolicy,
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

    public onEdit(item: any) {
        this.router.navigate(['/policy-statistics', item.id]);
    }

    public onChangeStatus($event: string, row: any): void {
        this.loading = true;
        this.policyStatisticsService
            .publishDefinition(row)
            .subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    public onCreateInstance(item: any): void {
        this.router.navigate(['/policy-statistics', item.id, 'assessment']);
    }

    public onOpenInstances(item: any): void {
        this.router.navigate(['/policy-statistics', item.id, 'assessments']);
    }

    public onDelete(item: any) {
        this.loading = true;
        this.policyStatisticsService
            .deleteDefinition(item)
            .subscribe((newItem) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }
}
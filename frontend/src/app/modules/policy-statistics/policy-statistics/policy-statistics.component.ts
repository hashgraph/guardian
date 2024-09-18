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
    selector: 'app-policy-statistics',
    templateUrl: './policy-statistics.component.html',
    styleUrls: ['./policy-statistics.component.scss'],
})
export class PolicyStatisticsComponent implements OnInit {
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
        disable: (value: string): boolean => {
            return !(value === EntityStatus.ERROR);
        }
    }, {
        label: 'Published',
        value: EntityStatus.PUBLISHED,
        description: 'Release version into public domain.',
        disable: (value: string): boolean => {
            return !(value === EntityStatus.DRAFT);
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
            id: 'topic',
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
            id: 'method',
            title: 'Trigger',
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
            id: 'options',
            title: '',
            type: 'text',
            size: 'auto',
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
            .page(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.policyStatisticsService.parsePage(response);
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
            .create(item)
            .subscribe((newItem) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    public onEdit(item: any) {
        this.router.navigate(['/policy-statistics', item.id]);
    }

    public onChangeStatus($event: string): void {
        debugger
    }
}

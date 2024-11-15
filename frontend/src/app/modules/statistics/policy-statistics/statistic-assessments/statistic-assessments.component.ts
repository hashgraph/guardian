import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';

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
    selector: 'app-statistic-assessments',
    templateUrl: './statistic-assessments.component.html',
    styleUrls: ['./statistic-assessments.component.scss'],
})
export class StatisticAssessmentsComponent implements OnInit {
    public readonly title: string = 'Assessments';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public definitionId: string;
    public definition: any;
    public columns: IColumn[];
    public policy: any;
    public schemas: any[];

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyStatisticsService: PolicyStatisticsService,
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [ {
            id: 'definition',
            title: 'Definition',
            type: 'text',
            size: 'auto',
            tooltip: false
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
            size: '150',
            tooltip: false
        }, {
            id: 'target',
            title: 'Target',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'messageId',
            title: 'Message ID',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'options',
            title: '',
            type: 'text',
            size: '135',
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
        this.definitionId = this.route.snapshot.params['definitionId'];
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyStatisticsService.getDefinition(this.definitionId),
            this.policyStatisticsService.getRelationships(this.definitionId)
        ]).subscribe(([profile, definition, relationships]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            this.definition = definition;
            this.policy = relationships?.policy || {};
            this.schemas = relationships?.schemas || [];
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
        this.loading = true;
        this.policyStatisticsService
            .getAssessments(
                this.definitionId,
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.policyStatisticsService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                for (const item of this.page) {
                    item.definition = this.definition?.name;
                    item.policy = this.policy?.name;
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
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

    public onBack() {
        this.router.navigate(['/policy-statistics']);
    }

    public onOpen(row: any) {
        this.router.navigate([
            '/policy-statistics',
            this.definitionId,
            'assessment',
            row.id
        ]);
    }
}

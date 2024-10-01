import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { NewPolicyStatisticsDialog } from '../dialogs/new-policy-statistics-dialog/new-policy-statistics-dialog.component';

@Component({
    selector: 'app-statistic-assessments',
    templateUrl: './statistic-assessments.component.html',
    styleUrls: ['./statistic-assessments.component.scss'],
})
export class StatisticAssessmentsComponent implements OnInit {
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public definitionId: string;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyStatisticsService: PolicyStatisticsService,
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {

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
        this.profileService
            .getProfile()
            .subscribe((profile) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;

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
        this.definitionId = this.route.snapshot.params['definitionId'];
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
}

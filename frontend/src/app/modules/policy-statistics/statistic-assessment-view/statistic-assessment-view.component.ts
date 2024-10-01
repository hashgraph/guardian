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
    selector: 'app-statistic-assessment-view',
    templateUrl: './statistic-assessment-view.component.html',
    styleUrls: ['./statistic-assessment-view.component.scss'],
})
export class StatisticAssessmentViewComponent implements OnInit {
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public definitionId: string;
    public assessmentId: string;

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
        this.definitionId = this.route.snapshot.params['definitionId'];
        this.assessmentId = this.route.snapshot.params['assessmentId'];
        this.loading = true;
        forkJoin([
            this.policyStatisticsService.getDefinition(this.definitionId),
            this.policyStatisticsService.getRelationships(this.definitionId),
            this.policyStatisticsService.getAssessment(this.definitionId, this.assessmentId),
        ]).subscribe(([definition, relationships, assessment]) => {

        }, (e) => {
            this.loading = false;
        });
    }
}

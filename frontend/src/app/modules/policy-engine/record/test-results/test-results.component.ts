import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Component for show test results
 */
@Component({
    selector: 'app-test-results',
    templateUrl: './test-results.component.html',
    styleUrls: ['./test-results.component.scss']
})
export class TestResultsComponent implements OnInit {
    public loading: boolean = true;
    public testId: string;
    public policyId: string;
    public owner: any;
    public results: any;

    constructor(
        private policyEngineService: PolicyEngineService,
        public profileService: ProfileService,
        public route: ActivatedRoute,
        public router: Router,
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.route.queryParams.subscribe(queryParams => {
            this.loadData();
        });
    }

    private loadData() {
        this.loading = true;
        this.testId = this.route.snapshot.queryParams.testId;
        this.policyId = this.route.snapshot.queryParams.policyId;

        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.getTestDetails(this.policyId, this.testId)
        ]).subscribe(([profile, results]) => {
            this.owner = profile?.did;
            this.results = results;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
            console.error(e);
        });
    }
}

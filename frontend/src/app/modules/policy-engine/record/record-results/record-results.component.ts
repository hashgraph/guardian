import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';
import { forkJoin } from 'rxjs';
import { RecordService } from 'src/app/services/record.service';

/**
 * Component for show record results
 */
@Component({
    selector: 'app-record-results',
    templateUrl: './record-results.component.html',
    styleUrls: ['./record-results.component.scss']
})
export class RecordResultsComponent implements OnInit {
    public loading: boolean = true;
    public policyId: string;
    public owner: any;
    public results: any;

    constructor(
        public recordService: RecordService,
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
        this.policyId = this.route.snapshot.queryParams.policyId;

        forkJoin([
            this.profileService.getProfile(),
            this.recordService.getRecordDetails(this.policyId)
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

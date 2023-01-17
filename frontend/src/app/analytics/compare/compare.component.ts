import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from 'src/app/services/analytics.service';

@Component({
    selector: 'app-compare',
    templateUrl: './compare.component.html',
    styleUrls: ['./compare.component.css']
})
export class CompareComponent implements OnInit {
    loading: boolean = true;
    type: any;
    policyId1: any;
    policyId2: any;
    schemaId1: any;
    schemaId2: any;
    result: any;

    eventsLvl = '1';
    propLvl = '2';
    childrenLvl = '2';
    idLvl = '0';

    constructor(
        private auth: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private analyticsService: AnalyticsService
    ) {
    }

    ngOnInit() {
        this.route.queryParams.subscribe(queryParams => {
            this.loadData();
        });
        // this.loadData();
    }

    loadData() {
        this.loading = true;
        this.type = this.route.snapshot.queryParams['type'] || '';
        this.policyId1 = this.route.snapshot.queryParams['policyId1'] || '';
        this.policyId2 = this.route.snapshot.queryParams['policyId2'] || '';
        this.schemaId1 = this.route.snapshot.queryParams['schemaId1'] || '';
        this.schemaId2 = this.route.snapshot.queryParams['schemaId2'] || '';
        this.result = null;
        if (this.type === 'policy') {
            this.loadPolicy();
        } else if (this.type === 'schema') {
            this.loadSchema();
        } else {
            this.loading = false;
        }
    }

    loadPolicy() {
        this.analyticsService.comparePolicy(
            this.policyId1,
            this.policyId2,
            this.eventsLvl,
            this.propLvl,
            this.childrenLvl,
            this.idLvl
        ).subscribe((value) => {
            this.result = value;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    loadSchema() {
        this.analyticsService.compareSchema(
            this.schemaId1,
            this.schemaId2,
            this.idLvl
        ).subscribe((value) => {
            this.result = value;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    onChange(event: any) {
        if (event.type === 'params') {
            this.onFilters(event)
        } else if (event.type === 'schema') {
            this.compareSchema(event)
        }
    }

    onFilters(event: any) {
        this.eventsLvl = event.eventsLvl;
        this.propLvl = event.propLvl;
        this.childrenLvl = event.childrenLvl;
        this.idLvl = event.idLvl;
        this.loadData();
    }

    compareSchema(event: any) {
        this.router.navigate(['/compare'], {
            queryParams: {
                type: 'schema',
                policyId1: undefined,
                policyId2: undefined,
                schemaId1: event.schemaId1,
                schemaId2: event.schemaId2
            }
        });
    }
}

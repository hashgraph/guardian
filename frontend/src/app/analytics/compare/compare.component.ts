import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuditService } from 'src/app/services/audit.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { HttpResponse } from '@angular/common/http';

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
    result: any;

    eventsLvl = '1';
    propLvl = '2';
    childrenLvl = '2';

    constructor(
        private auth: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private policyEngineService: PolicyEngineService
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.type = this.route.snapshot.queryParams['type'] || '';
        this.policyId1 = this.route.snapshot.queryParams['policyId1'] || '';
        this.policyId2 = this.route.snapshot.queryParams['policyId2'] || '';
        this.loadData();
    }

    loadData() {
        this.loading = true;
        if (this.type === 'policy') {
            this.loadPolicy();
        } else {
            this.loading = false;
        }

        this.policyEngineService.comparePolicy(
            this.policyId1, 
            this.policyId2,
            this.eventsLvl,
            this.propLvl,
            this.childrenLvl,
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

    loadPolicy() {

    }

    onFilters(event: any) {
        this.eventsLvl = event.eventsLvl;
        this.propLvl = event.propLvl;
        this.childrenLvl = event.childrenLvl;
        this.loadData();
    }
}

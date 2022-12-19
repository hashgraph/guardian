import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuditService } from 'src/app/services/audit.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { HttpResponse } from '@angular/common/http';

@Component({
    selector: 'app-compare-policy',
    templateUrl: './compare-policy.component.html',
    styleUrls: ['./compare-policy.component.css']
})
export class ComparePolicyComponent implements OnInit {
    @Input('value') value!: any;

    panelOpenState = false;

    type = 'tree';
    eventsLvl = '1';
    propLvl = '2';
    childrenLvl = '2';

    policy1: any;
    policy2: any;

    constructor() {
    }

    ngOnInit() {

    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.value) {
            this.onInit();
        }
    }

    onInit() {
        this.policy1 = this.value.policy1;
        this.policy2 = this.value.policy2;
        this.onRender();
    }

    onRender() {
        console.log(this.policy1);
    }
}

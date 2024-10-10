import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, IStatistic, Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { DialogService } from 'primeng/dynamicdialog';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';

@Component({
    selector: 'app-schema-rule-configuration',
    templateUrl: './schema-rule-configuration.component.html',
    styleUrls: ['./schema-rule-configuration.component.scss'],
})
export class SchemaRuleConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public ruleId: string;
    public item: IStatistic | undefined;
    public policy: any;
    public stepper = [true, false, false, false];
    public stepIndex = 0;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private schemaRulesService: SchemaRulesService,
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
        this.ruleId = this.route.snapshot.params['ruleId'];
        this.loading = true;
        forkJoin([
            this.schemaRulesService.getRule(this.ruleId),
            this.schemaRulesService.getRelationships(this.ruleId)
        ]).subscribe(([item, relationships]) => {
            this.updateMetadata(item, relationships)
        }, (e) => {
            this.loading = false;
        });
    }

    private updateMetadata(
        item: any,
        relationships: any
    ) {

    }

    public onBack() {
        this.router.navigate(['/policy-statistics']);
    }
}
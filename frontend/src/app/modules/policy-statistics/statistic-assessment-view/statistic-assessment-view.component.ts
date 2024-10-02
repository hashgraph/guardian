import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, IStatistic, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { IFormula, IOption, IScore, IVariable } from '../models/assessment';

@Component({
    selector: 'app-statistic-assessment-view',
    templateUrl: './statistic-assessment-view.component.html',
    styleUrls: ['./statistic-assessment-view.component.scss'],
})
export class StatisticAssessmentViewComponent implements OnInit {
    public readonly title: string = 'Assessment';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public definitionId: string;
    public assessmentId: string;
    public definition: any;
    public policy: any;
    public schemas: any[];
    public assessment: any;
    public stepper = [true, false, false];

    public preview: IVariable[];
    public scores: IScore[];
    public formulas: IFormula[];

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
            this.definition = definition;
            this.policy = relationships?.policy || {};
            this.schemas = relationships?.schemas || [];
            this.assessment = assessment || {};
            this.updateMetadata();

            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    public onBack() {
        this.router.navigate([
            '/policy-statistics',
            this.definitionId,
            'assessments'
        ]);
    }

    private updateMetadata() {
        const config = this.definition.config || {};
        const variables = config.variables || [];
        const formulas = config.formulas || [];
        const scores = config.scores || [];
        const preview = new Map<string, IVariable>();

        this.preview = [];
        this.scores = [];
        this.formulas = [];

        let document: any = this.assessment?.document?.credentialSubject;
        if (Array(document)) {
            document = document[0];
        }
        if (!document) {
            document = {};
        }

        for (const variable of variables) {
            const path = [...(variable.path || '').split('.')];
            const fullPath = [variable.schemaId, ...path];
            const field: IVariable = {
                id: variable.id,
                description: variable.fieldDescription || '',
                schemaId: variable.schemaId,
                path: path,
                fullPath: fullPath,
                value: document[variable.id],
                isArray: false
            }
            this.preview.push(field);
            preview.set(variable.id, field);
        }

        for (const score of scores) {
            const relationships: IVariable[] = [];
            if (score.relationships) {
                for (const ref of score.relationships) {
                    const field = preview.get(ref);
                    if (field) {
                        relationships.push(field);
                    }
                }
            }
            const options: IOption[] = [];
            if (score.options) {
                for (const option of score.options) {
                    options.push({
                        id: GenerateUUIDv4(),
                        description: option.description,
                        value: option.value
                    });
                }
            }
            this.scores.push({
                id: score.id,
                description: score.description,
                value: document[score.id],
                relationships,
                options
            });
        }

        for (const formula of formulas) {
            this.formulas.push({
                id: formula.id,
                description: formula.description,
                value: document[formula.id],
                formula: formula.formula,
                type: formula.type
            });
        }
    }

    public onStep(index: number) {
        for (let i = 0; i < this.stepper.length; i++) {
            this.stepper[i] = false;
        }
        this.stepper[index] = true;
    }
}

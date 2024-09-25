import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { DialogService } from 'primeng/dynamicdialog';
import { IStatistic } from '../policy-statistics-configuration/models/data';
import { FormGroup } from '@angular/forms';

interface IOption {
    id: string;
    description: string;
    value: any;
}

interface IVariable {
    id: string;
    description: string;
    value: any;
}

interface IScore {
    id: string;
    description: string;
    value: any;
    relationships: IVariable[];
    options: IOption[]
}

interface IFormula {
    id: string;
    description: string;
    value: any;
    formula: string;
}

@Component({
    selector: 'app-policy-report-configuration',
    templateUrl: './policy-report-configuration.component.html',
    styleUrls: ['./policy-report-configuration.component.scss'],
})
export class PolicyReportsConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public id: string;
    public item: IStatistic;
    public policy: any;
    public schemas: Schema[];
    public stepper = [true, false, false, false];
    public stepIndex = 0;
    public documents: any[];
    public document: any;
    public preview: IVariable[];
    public scores: IScore[];
    public formulas: IFormula[];
    public scoresValid: boolean = false;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyStatisticsService: PolicyStatisticsService,
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
        this.id = this.route.snapshot.params['id'];
        this.loading = true;
        forkJoin([
            this.policyStatisticsService.getItem(this.id),
            this.policyStatisticsService.getRelationships(this.id),
            this.schemaService.properties()
        ]).subscribe(([item, relationships, properties]) => {
            this.item = item;
            this.policy = relationships?.policy || {};
            const schemas = relationships?.schemas || [];
            this.schemas = [];
            for (const schema of schemas) {
                try {
                    this.schemas.push(new Schema(schema));
                } catch (error) {
                    console.log(error);
                }
            }
            this.documents = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
            this.document = null;
            this.update();
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, (e) => {
            this.loading = false;
        });
    }

    private update() {
        const config = this.item.config || {};
        const variables = config.variables || [];
        const formulas = config.formulas || [];
        const scores = config.scores || [];
        const preview = new Map<string, IVariable>();

        this.preview = [];
        this.scores = [];
        this.formulas = [];

        for (const variable of variables) {
            const field: IVariable = {
                id: variable.id,
                description: variable.fieldDescription,
                value: this.getFieldValue(this.document, variable)
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
                value: undefined,
                relationships,
                options
            });
        }

        for (const formula of formulas) {
            this.formulas.push({
                id: formula.id,
                description: formula.description,
                value: undefined,
                formula: formula.formula
            });
        }

        this.updateScore();
    }

    public onBack() {
        this.router.navigate(['/policy-statistics']);
    }

    public onStep(index: number) {
        this.stepIndex = index;
        this.stepIndex = Math.min(Math.max(this.stepIndex, 0), 3);
        this.stepper.fill(false);
        this.stepper[this.stepIndex] = true;
    }

    public onPrev() {
        this.onStep(this.stepIndex - 1);
    }

    private getFieldValue(document: any, variable: any): string {
        return 'test';
    }

    public onNextStep1() {
        this.onStep(1);
    }

    public onNextStep2() {
        this.onStep(2);
    }

    public onNextStep3() {
        this.onStep(3);
        this.calculate();
    }

    public onCreate() {

    }

    public onSelectDocument(item: any) {
        this.document = item;
    }

    public updateScore() {
        for (const score of this.scores) {
            if(!score.value) {
                this.scoresValid = false;
                return;
            }
        }
        this.scoresValid = true;
    }

    private calculate() {
        const result: any = {};

        for (const field of this.preview) {
            result[field.id] = field.value;
        }

        for (const score of this.scores) {
            result[score.id] = score.value;
        }

        for (const formula of this.formulas) {
            formula.value = this.calcFormula(formula, result);
            result[formula.id] = formula.value;
        }
    }

    private calcFormula(formula: IFormula, state: any) {
        return formula.formula;
    }
}
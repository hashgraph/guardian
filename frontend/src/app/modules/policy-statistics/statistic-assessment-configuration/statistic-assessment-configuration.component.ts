import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, IStatistic, IVCDocument, Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { DialogService } from 'primeng/dynamicdialog';
import { Formula } from 'src/app/utils';
import { IDocument, IFormula, IOption, IScore, IVariable } from '../../common/models/assessment';
import { IColumn } from '../../common/models/grid';

@Component({
    selector: 'app-statistic-assessment-configuration',
    templateUrl: './statistic-assessment-configuration.component.html',
    styleUrls: ['./statistic-assessment-configuration.component.scss'],
})
export class StatisticAssessmentConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public definitionId: string;
    public item: IStatistic | undefined;
    public policy: any;
    public stepper = [true, false, false, false];
    public stepIndex = 0;
    public documents: IDocument[];
    public document: IDocument | null;
    public preview: IVariable[];
    public scores: IScore[];
    public formulas: IFormula[];
    public scoresValid: boolean = false;
    public documentsCount: number;
    public pageIndex: number;
    public pageSize: number;
    public columns: IColumn[];
    public defaultColumns: IColumn[] = [{
        id: 'checkbox',
        title: '',
        type: 'text',
        size: '56',
        minSize: '56',
        tooltip: false
    }, {
        id: 'schema',
        title: 'SCHEMA',
        type: 'text',
        size: '150',
        minSize: '150',
        tooltip: false
    }, {
        id: 'id',
        title: 'ID',
        type: 'text',
        size: 'auto',
        minSize: '150',
        tooltip: false
    }];
    public userColumns: any[] = [];
    public schemas = new Map<string, Schema>();

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyStatisticsService: PolicyStatisticsService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [];
    }

    ngOnInit() {
        this.documents = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.documentsCount = 0;
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
        this.loading = true;
        forkJoin([
            this.policyStatisticsService.getDefinition(this.definitionId),
            this.policyStatisticsService.getRelationships(this.definitionId)
        ]).subscribe(([item, relationships]) => {
            this.updateMetadata(item, relationships)
            this.loadDocuments();
        }, (e) => {
            this.loading = false;
        });
    }

    private loadDocuments() {
        this.loading = true;
        this.policyStatisticsService
            .getDocuments(this.definitionId)
            .subscribe((documents) => {
                const { page, count } = this.policyStatisticsService.parsePage(documents);
                this.documents = page;
                this.document = null;
                this.documentsCount = count;
                this.updateDocuments();
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }


    public onCreate() {
        const report = this.generateVcDocument();
        this.loading = true;
        this.policyStatisticsService
            .createAssessment(this.definitionId, report)
            .subscribe((assessment) => {
                this.router.navigate([
                    '/policy-statistics',
                    this.definitionId,
                    'assessment',
                    assessment.id
                ]);
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
        this.loadDocuments();
    }

    private updateMetadata(
        item: IStatistic,
        relationships: any
    ) {
        this.item = item;
        this.policy = relationships?.policy || {};
        const schemas = relationships?.schemas || [];
        this.schemas.clear();
        for (const item of schemas) {
            try {
                const schema = new Schema(item);
                this.schemas.set(schema.iri || schema.id, schema);
            } catch (error) {
                console.log(error);
            }
        }

        const config = this.item.config || {};
        const variables = config.variables || [];
        const formulas = config.formulas || [];
        const scores = config.scores || [];
        const preview = new Map<string, IVariable>();

        this.preview = [];
        this.scores = [];
        this.formulas = [];

        for (const variable of variables) {
            const path = [...(variable.path || '').split('.')];
            const fullPath = [variable.schemaId, ...path];
            const field: IVariable = {
                id: variable.id,
                description: variable.fieldDescription || '',
                schemaId: variable.schemaId,
                path: path,
                fullPath: fullPath,
                value: null,
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
                formula: formula.formula,
                type: formula.type
            });
        }

        this.updateScore();

        for (const item of this.preview) {
            this.userColumns.push({
                id: item.fullPath,
                title: item.description,
                type: 'text',
                size: 'auto',
                minSize: '200',
                tooltip: false,
                selected: true
            })
        }

        this.columns = [
            ...this.userColumns.filter((c) => c.selected)
        ];
    }

    public updateDocuments() {
        for (const doc of this.documents) {
            doc.__id = doc.targetDocument.id;
            doc.__schemaId = doc.targetDocument.schema || '';
            doc.__schemaName = this.schemas.get(doc.__schemaId)?.name || doc.__schemaId;
            doc.__cols = new Map<IColumn, any>();
        }
    }

    public getCellValue(row: IDocument, column: IColumn): any {
        if (row.__cols.has(column)) {
            return row.__cols.get(column);
        } else {
            let value: any = (typeof column.id === 'string') ?
                ((row.targetDocument as any)[column.id]) :
                (this.getFieldValue(row, column.id));
            if (Array.isArray(value)) {
                value = `[${value.join(',')}]`;
            }
            row.__cols.set(column, value);
            return value;
        }
    }

    private getFieldValue(document: IDocument, fullPath: string[]): any {
        if (!document) {
            return null;
        }
        const schemaId = fullPath[0];
        if (document.targetDocument.schema === schemaId) {
            return this.getFieldValueByPath(document.targetDocument, fullPath);
        }
        const result: any[] = [];
        for (const doc of document.relatedDocuments) {
            if (doc.schema === schemaId) {
                result.push(this.getFieldValueByPath(doc, fullPath))
            }
        }
        for (const doc of document.unrelatedDocuments) {
            if (doc.schema === schemaId) {
                result.push(this.getFieldValueByPath(doc, fullPath))
            }
        }
        if (result.length > 1) {
            return result;
        } else if (result.length === 1) {
            return result[0];
        } else {
            return undefined;
        }
    }

    private getFieldValueByPath(document: IVCDocument, path: string[]): any {
        if (document.schema === path[0]) {
            let value: any = document?.document?.credentialSubject;
            if (Array.isArray(value)) {
                value = value[0];
            }
            for (let i = 1; i < path.length; i++) {
                if (value) {
                    value = value[path[i]]
                } else {
                    return undefined;
                }
            }
            return value;
        } else {
            return undefined;
        }
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

    public onNextPreview() {
        if (!this.document) {
            return;
        }
        for (const item of this.preview) {
            item.value = this.getFieldValue(this.document, item.fullPath);
            item.isArray = Array.isArray(item.value);
        }
        this.onStep(1);
    }

    public onNextScores() {
        if (!this.document) {
            return;
        }
        if (this.scores && this.scores.length) {
            this.onStep(2);
        } else {
            this.onNextFinish();
        }
    }

    public onNextFinish() {
        if (!this.document) {
            return;
        }
        this.onStep(3);
        this.calculate();
    }

    public onSelectDocument(item: IDocument) {
        this.document = item;
    }

    public updateScore() {
        for (const score of this.scores) {
            if (!score.value) {
                this.scoresValid = false;
                return;
            }
        }
        this.scoresValid = true;
    }

    private calculate() {
        const document: any = {};

        for (const field of this.preview) {
            document[field.id] = field.value;
        }

        for (const score of this.scores) {
            document[score.id] = score.value;
        }

        for (const formula of this.formulas) {
            formula.value = this.calcFormula(formula, document);
            if (formula.value) {
                if (formula.type === 'string') {
                    formula.value = String(formula.value);
                } else {
                    formula.value = Number(formula.value);
                }
                document[formula.id] = formula.value;
            }
        }
    }

    private calcFormula(item: IFormula, scope: any): any {
        try {
            return Formula.evaluate(item.formula, scope);
        } catch (error) {
            return NaN;
        }
    }

    public changeCol(col: any) {
        col.selected = !col.selected;
        this.columns = [
            ...this.userColumns.filter((c) => c.selected)
        ];
    }

    private generateVcDocument() {
        if (!this.document) {
            return null;
        }
        const document: any = {};

        for (const field of this.preview) {
            if (field.value !== undefined) {
                document[field.id] = field.value;
            }
        }
        for (const score of this.scores) {
            const option = score.options.find((o) => o.value === score.value);
            document[score.id] = option?.description || String(score.value);
        }
        for (const formula of this.formulas) {
            document[formula.id] = formula.value;
        }

        const target = this.document.targetDocument.messageId;
        const relationships = new Set<string>();
        if (target) {
            relationships.add(target);
        }
        for (const doc of this.document.relatedDocuments) {
            if (doc.messageId) {
                relationships.add(doc.messageId);
            }
        }
        for (const doc of this.document.unrelatedDocuments) {
            if (doc.messageId) {
                relationships.add(doc.messageId);
            }
        }

        const report = {
            document,
            target,
            relationships: Array.from(relationships)
        };
        return report;
    }

    public getVariableValue(value: any): any {
        if (value === undefined) {
            return 'N/A';
        } else {
            return value;
        }
    }
}
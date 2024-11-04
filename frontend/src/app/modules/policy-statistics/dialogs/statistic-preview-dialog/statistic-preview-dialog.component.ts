import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IFormula, IVariable } from '../../../common/models/assessment';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { Formula } from 'src/app/utils';

@Component({
    selector: 'statistic-preview-dialog',
    templateUrl: './statistic-preview-dialog.component.html',
    styleUrls: ['./statistic-preview-dialog.component.scss'],
})
export class StatisticPreviewDialog {
    public loading = true;
    public item: any;
    public preview: any[];
    public scores: any[];
    public formulas: any[];
    
    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.item = this.config.data?.item || {};

        const configuration = this.item.config || {};
        const variables = configuration.variables || [];
        const formulas = configuration.formulas || [];
        const scores = configuration.scores || [];
        const preview = new Map<string, IVariable>();
        this.preview = [];
        this.scores = [];
        this.formulas = [];
        
        for (const variable of variables) {
            this.preview.push({
                id: variable.id,
                description: variable.fieldDescription || '',
                value: null
            });
        }

        for (const score of scores) {
            const options: any[] = [];
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
                value: null,
                options
            });
        }

        for (const formula of formulas) {
            this.formulas.push({
                id: formula.id,
                description: formula.description,
                value: null,
                formula: formula.formula,
                type: formula.type
            });
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit() {
        const document: any = {};

        for (const field of this.preview) {
            document[field.id] = field.value;
        }

        for (const score of this.scores) {
            document[score.id] = score.value;
        }

        for (const formula of this.formulas) {
            formula.value = this.calcFormula(formula, document);
            if (formula.type === 'string') {
                formula.value = String(formula.value);
            } else {
                formula.value = Number(formula.value);
            }
            document[formula.id] = formula.value;
        }
    }

    private calcFormula(item: IFormula, scope: any): any {
        try {
            return Formula.evaluate(item.formula, scope);
        } catch (error) {
            return NaN;
        }
    }
}

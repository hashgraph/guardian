import { NavItemType, IVariableData, IScoreData, IFormulaData, IRulesItemConfig, GenerateUUIDv4 } from '@guardian/interfaces';
import { IValidateStatus } from './interfaces/status';
import { ISubStep } from './interfaces/sub-step';
import { IValidatorStep } from './interfaces/step';
import { ValidateScore } from './score';
import { ValidateNamespace } from './namespace';
import { NodeItemValidator } from './item-node-validator';
import { FormulaValidator } from './variable-validator';
import { FieldRuleResult } from '../rule-validator/interfaces/status';
import { VariableData } from '../statistic-validator/variables';
import { ScoreData } from '../statistic-validator/score';
import { FormulaData } from '../statistic-validator/formula';

export class RuleItemValidator {
    public readonly type: NavItemType | null = NavItemType.Rules;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 3;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateStatus;

    private variables: VariableData[];
    private scores: ScoreData[];
    private formulas: FormulaData[];

    public prefix: string;

    constructor(item: IRulesItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';

        this.variables = VariableData.from(item.config?.variables);
        this.scores = ScoreData.from(item.config?.scores);
        this.formulas = FormulaData.from(item.config?.formulas);

        for (const score of this.scores) {
            score.setRelationships(this.variables);
        }
    }

    public get status(): boolean | undefined {
        return this.valid ? this.valid.valid : undefined;
    }

    public setData(namespace: ValidateNamespace) {
        this.namespace = namespace;
        this.scope = this.namespace.createScore(this.id, this.tag);
        for (const item of this.variables) {
            this.scope.setName(item.id);
        }
        for (const item of this.scores) {
            this.scope.setName(item.id);
        }
        for (const item of this.formulas) {
            this.scope.setName(item.id);
        }
    }

    public updateVariables() {
        for (const variable of this.variables) {
            const value = this.namespace.getField(variable.schemaId, variable.path);
            variable.setValue(value);
            this.scope.setVariable(variable.id, variable.value);
        }
    }

    public updateScores() {
        return;
    }

    public updateFormulas() {
        for (const score of this.scores) {
            this.scope.setVariable(score.id, score.value);
        }
        for (const formula of this.formulas) {
            const scope = this.getScore();
            const value = NodeItemValidator.calculateFormula(formula, scope);
            formula.value = value;
            this.scope.setVariable(formula.id, value);
        }
    }

    public validate(): IValidateStatus {
        this.valid = {
            id: this.id,
            valid: true
        };

        const scope = this.getScore();
        for (const formula of this.formulas) {
            const validator = new FormulaValidator(formula);
            const status = validator.validate(scope);
            formula.status = status;
            if (status === FieldRuleResult.Failure || status === FieldRuleResult.Error) {
                this.valid.valid = false;
                this.valid.error = 'Invalid condition';
                return this.valid;
            }
        }

        return this.valid;
    }

    private getScore(): any {
        const namespace = this.namespace.getNamespace();
        const scope = this.scope.getScore();
        return Object.assign(namespace, scope);
    }

    public getSteps(): IValidatorStep[] {
        const steps: IValidatorStep[] = [];
        const subIndex: ISubStep[] = [];

        if (this.variables?.length) {
            subIndex.push({
                index: subIndex.length + 1,
                name: 'Overview',
                selected: false
            });
        }
        if (this.scores?.length) {
            subIndex.push({
                index: subIndex.length + 1,
                name: 'Scores',
                selected: false
            });
        }
        if (this.formulas?.length) {
            subIndex.push({
                index: subIndex.length + 1,
                name: 'Statistics',
                selected: false
            });
        }

        if (this.variables?.length) {
            steps.push({
                item: this,
                name: 'Overview',
                title: this.title,
                prefix: this.prefix,
                auto: false,
                type: 'variables',
                config: this.variables,
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Overview' }; }),
                update: this.updateVariables.bind(this)
            });
        }
        if (this.scores?.length) {
            steps.push({
                item: this,
                name: 'Scores',
                title: this.title,
                prefix: this.prefix,
                auto: false,
                type: 'scores',
                config: this.scores,
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Scores' }; }),
                update: this.updateScores.bind(this)
            });
        }
        if (this.formulas?.length) {
            steps.push({
                item: this,
                name: 'Statistics',
                title: this.title,
                prefix: this.prefix,
                auto: false,
                type: 'formulas',
                config: this.formulas,
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Statistics' }; }),
                update: this.updateFormulas.bind(this)
            });
        }
        steps.push({
            item: this,
            name: this.title,
            title: this.title,
            prefix: this.prefix,
            auto: true,
            type: 'validate',
            config: null,
            update: this.validate.bind(this)
        });
        return steps;
    }

    public getNamespace(): ValidateNamespace {
        return this.namespace;
    }

    public getScope(): ValidateScore {
        return this.scope;
    }

    public getStatus(): IValidateStatus {
        return this.valid;
    }

    public getResult(): any {
        const document: any = {};
        for (const field of this.variables) {
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
        return document;
    }

    public setResult(result: any): void {
        return;
    }
}

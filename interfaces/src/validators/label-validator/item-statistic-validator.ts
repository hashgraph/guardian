import { IValidateStatus } from './interfaces/status.js';
import { ISubStep } from './interfaces/sub-step.js';
import { IValidatorStep } from './interfaces/step.js';
import { ValidateScore } from './score.js';
import { ValidateNamespace } from './namespace.js';
import { NodeItemValidator } from './item-node-validator.js';
import { VariableData } from '../statistic-validator/variables.js';
import { ScoreData } from '../statistic-validator/score.js';
import { FormulaData } from '../statistic-validator/formula.js';
import { IStatisticItemConfig, NavItemType } from '../../interface/index.js';
import { IStepDocument } from './interfaces/step-document.js';

export class StatisticItemValidator {
    public readonly type: NavItemType | null = NavItemType.Statistic;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 3;
    public readonly schema: string;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateStatus | undefined;

    private readonly variables: VariableData[];
    private readonly scores: ScoreData[];
    private readonly formulas: FormulaData[];

    public prefix: string;

    constructor(item: IStatisticItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';
        this.schema = item.schemaId || '';

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
            formula.setValue(value);
            this.scope.setVariable(formula.id, value);
        }
    }

    public validateVariables(): IValidateStatus {
        if (this.valid) {
            if (this.valid.valid === false) {
                return this.valid;
            }
        } else {
            this.valid = {
                id: this.id,
                valid: true
            };
        }

        for (const variable of this.variables) {
            const value = this.namespace.getField(variable.schemaId, variable.path);
            const status = variable.validate(value);
            this.scope.setVariable(variable.id, variable.value);
            if (!status) {
                this.valid.valid = false;
                this.valid.error = 'Invalid variable';
                return this.valid;
            }
        }
        return this.valid;
    }

    public validateScores(): IValidateStatus {
        if (this.valid) {
            if (this.valid.valid === false) {
                return this.valid;
            }
        } else {
            this.valid = {
                id: this.id,
                valid: true
            };
        }

        for (const score of this.scores) {
            const status = score.validate(score.value);
            if (!status) {
                this.valid.valid = false;
                this.valid.error = 'Invalid scores';
                return this.valid;
            }
        }
        return this.valid;
    }

    public validateFormulas(): IValidateStatus {
        if (this.valid) {
            if (this.valid.valid === false) {
                return this.valid;
            }
        } else {
            this.valid = {
                id: this.id,
                valid: true
            };
        }

        for (const score of this.scores) {
            this.scope.setVariable(score.id, score.value);
        }
        for (const formula of this.formulas) {
            const scope = this.getScore();
            const value = NodeItemValidator.calculateFormula(formula, scope);
            const status = formula.validate(value);
            this.scope.setVariable(formula.id, value);
            if (!status) {
                this.valid.valid = false;
                this.valid.error = 'Invalid formula';
                return this.valid;
            }
        }
        return this.valid;
    }

    public validate(): IValidateStatus {
        if (!this.valid) {
            this.valid = {
                id: this.id,
                valid: true,
            };
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
                update: this.updateVariables.bind(this),
                validate: this.validateVariables.bind(this)
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
                update: this.updateScores.bind(this),
                validate: this.validateScores.bind(this)
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
                update: this.updateFormulas.bind(this),
                validate: this.validateFormulas.bind(this)
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
            update: this.validate.bind(this),
            validate: this.validate.bind(this)
        });
        return steps;
    }

    public getNamespace(): ValidateNamespace {
        return this.namespace;
    }

    public getScope(): ValidateScore {
        return this.scope;
    }

    public getStatus(): IValidateStatus | undefined {
        return this.valid;
    }

    public getResult(): any {
        const document: any = {};
        for (const field of this.variables) {
            if (field.value !== undefined) {
                document[field.id] = field.getValue();
            }
        }
        for (const score of this.scores) {
            document[score.id] = score.getValue();
        }
        for (const formula of this.formulas) {
            document[formula.id] = formula.getValue();
        }
        return document;
    }

    public setResult(document: any): void {
        for (const field of this.variables) {
            field.setValue(document[field.id]);
        }
        for (const score of this.scores) {
            score.setValue(document[score.id]);
        }
        for (const formula of this.formulas) {
            formula.setValue(document[formula.id]);
        }
    }

    public clear(): void {
        this.valid = undefined;
    }

    public getVC(): IStepDocument | null {
        return {
            id: this.id,
            schema: this.schema,
            document: this.getResult()
        };
    }

    public setVC(vc: any): boolean {
        this.setResult(vc);
        return true;
    }
}

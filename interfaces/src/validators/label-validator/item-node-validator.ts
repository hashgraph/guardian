import { GroupItemValidator } from './item-group-validator.js';
import { LabelItemValidator } from './item-label-validator.js';
import { RuleItemValidator } from './item-rule-validator.js';
import { StatisticItemValidator } from './item-statistic-validator.js';
import { IValidator } from './interfaces/validator.js';
import { IValidateStatus } from './interfaces/status.js';
import { IValidatorStep } from './interfaces/step.js';
import { ValidateScore } from './score.js';
import { ValidateNamespace } from './namespace.js';
import { FormulaEngine } from '../utils/formula.js';
import { IFormulaData, INavItemConfig, NavItemType } from '../../interface/index.js';
import { IStepDocument } from './interfaces/step-document.js';

export class NodeItemValidator {
    public readonly type: NavItemType | null = null;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 0;
    public readonly isRoot: boolean = false;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateStatus | undefined;

    public prefix: string;

    constructor(item: any) {
        this.id = item.id;
        this.name = item.name;
        this.title = item.title;
        this.tag = item.tag;
    }

    public setData(namespace: ValidateNamespace) {
        this.namespace = namespace;
        this.scope = this.namespace.createScore(this.id, this.tag);
    }

    public get status(): boolean | undefined {
        return this.valid ? this.valid.valid : undefined;
    }

    public validate(): IValidateStatus {
        this.valid = {
            id: this.id,
            valid: false,
            error: 'Unidentified item'
        };
        return this.valid;
    }

    public getSteps(): IValidatorStep[] {
        return [{
            item: this,
            name: this.name,
            title: this.title,
            prefix: this.prefix,
            auto: true,
            type: 'validate',
            config: null,
            update: this.validate.bind(this),
            validate: this.validate.bind(this)
        }];
    }
    
    public getStatus(): IValidateStatus | undefined {
        return this.valid;
    }

    public getNamespace(): ValidateNamespace {
        return this.namespace;
    }

    public getScope(): ValidateScore {
        return this.scope;
    }

    public static calculateFormula(item: IFormulaData, scope: any): any {
        let value = FormulaEngine.evaluate(item.formula, scope);
        if (value) {
            if (item.type === 'string') {
                value = String(value);
            } else {
                value = Number(value);
            }
        }
        return value;
    }

    public static from(item: INavItemConfig): IValidator {
        switch (item.type) {
            case NavItemType.Group: {
                return new GroupItemValidator(item);
            }
            case NavItemType.Label: {
                return new LabelItemValidator(item);
            }
            case NavItemType.Rules: {
                return new RuleItemValidator(item);
            }
            case NavItemType.Statistic: {
                return new StatisticItemValidator(item);
            }
            default: {
                return new NodeItemValidator(item);
            }
        }
    }

    public static fromArray(items?: INavItemConfig[]): IValidator[] {
        const validators: IValidator[] = [];
        if (Array.isArray(items)) {
            for (const item of items) {
                validators.push(NodeItemValidator.from(item));
            }
        }
        return validators;
    }

    public getResult(): any {
        return null;
    }

    public setResult(result: any): void {
        return;
    }

    public clear(): void {
        this.valid = undefined;
    }

    public getVC(): IStepDocument | null {
        return null;
    }

    public setVC(vc: any): boolean {
        return false;
    }
}

import { NavItemType, IFormulaData, INavItemConfig } from '@guardian/interfaces';
import { GroupItemValidator } from './item-group-validator';
import { LabelItemValidator } from './item-label-validator';
import { RuleItemValidator } from './item-rule-validator';
import { StatisticItemValidator } from './item-statistic-validator';
import { IValidator } from './interfaces/validator';
import { IValidateStatus } from './interfaces/status';
import { IValidatorStep } from './interfaces/step';
import { ValidateScore } from './score';
import { ValidateNamespace } from './namespace';
import { Formula } from '../utils/formula';

export class NodeItemValidator {
    public readonly type: NavItemType | null = null;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 0;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateStatus;

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
            update: this.validate.bind(this)
        }];
    }

    public getStatus(): IValidateStatus {
        return this.valid;
    }

    public getNamespace(): ValidateNamespace {
        return this.namespace;
    }

    public getScope(): ValidateScore {
        return this.scope;
    }

    public static calculateFormula(item: IFormulaData, scope: any): any {
        let value: any;
        try {
            value = Formula.evaluate(item.formula, scope);
        } catch (error) {
            value = NaN;
        }
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
}

import {
    IFormulaData,
    IGroupItemConfig,
    ILabelItemConfig,
    INavImportsConfig,
    INavItemConfig,
    IPolicyLabelConfig,
    IRulesItemConfig,
    IScoreData,
    IStatisticItemConfig,
    IVariableData,
    NavItemType
} from "@guardian/interfaces";
import { Formula } from "src/app/utils";
import { FieldRuleResult, FormulaRuleValidator } from "./field-rule-validator";

type IValidator = GroupValidator | LabelValidator | RuleValidator | StatisticValidator | NodeValidator;

interface IValidateResult {
    id: string;
    valid: boolean;
    error?: any;
    children?: IValidateResult[];
}

class ValidateScore {
    public readonly name: string;

    private readonly score: any;

    constructor(name: string) {
        this.name = name;
        this.score = {};
    }

    public setVariable(name: string, value: any) {
        this.score[name] = value;
    }

    public getScore(): any {
        return this.score;
    }
}

class ValidateNamespace {
    public readonly name: string;

    private readonly documents: any[];
    private readonly children: ValidateNamespace[];
    private readonly scores: ValidateScore[];

    constructor(name: string, documents: any[]) {
        this.name = name;
        this.documents = documents;
        this.children = [];
        this.scores = [];
    }

    public createNamespaces(name: string): ValidateNamespace {
        const namespace = new ValidateNamespace(name, this.documents);
        this.children.push(namespace);
        return namespace;
    }

    public createScore(name: string): any {
        const score = new ValidateScore(name);
        this.scores.push(score);
        return score;
    }

    public getNamespace(): any {
        let namespace: any = {};
        for (const item of this.scores) {
            const values = item.getScore();
            const keys = Object.keys(values);
            for (const key of keys) {
                namespace[`${item.name}.${key}`] = values[key];
            }
        }
        return namespace;
    }

    public getField(schema: string, path: string): any {

    }
}

class NodeValidator {
    private readonly id: string;
    private readonly name: string;

    private namespaces: ValidateNamespace;
    private scope: ValidateScore;

    constructor(item: any) {
        this.id = item.id;
        this.name = item.name;
    }

    public setData(namespaces: ValidateNamespace) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
    }

    public validate(): IValidateResult {
        return {
            id: this.id,
            valid: false,
            error: 'Unidentified item'
        };
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
                return new GroupValidator(item);
            }
            case NavItemType.Label: {
                return new LabelValidator(item);
            }
            case NavItemType.Rules: {
                return new RuleValidator(item);
            }
            case NavItemType.Statistic: {
                return new StatisticValidator(item);
            }
            default: {
                return new NodeValidator(item);
            }
        }
    }

    public static fromArray(items?: INavItemConfig[]): IValidator[] {
        const validators: IValidator[] = [];
        if (Array.isArray(items)) {
            for (const item of items) {
                validators.push(NodeValidator.from(item));
            }
        }
        return validators;
    }
}

class GroupValidator {
    private readonly id: string;
    private readonly name: string;
    private readonly children: IValidator[];

    private namespaces: ValidateNamespace;
    private scope: ValidateScore;

    constructor(item: IGroupItemConfig) {
        this.id = item.id;
        this.name = item.name;
        this.children = NodeValidator.fromArray(item.children);
    }

    public setData(namespaces: ValidateNamespace) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
        for (const child of this.children) {
            child.setData(namespaces);
        }
    }

    public validate(): IValidateResult {
        const result: any = {
            id: this.id,
            valid: true,
            children: []
        };

        for (const child of this.children) {
            const childResult = child.validate();
            result.children.push(childResult);
            if (!childResult.valid) {
                return result;
            }
        }

        return result;
    }
}

class RuleValidator {
    private readonly id: string;
    private readonly name: string;

    private namespaces: ValidateNamespace;
    private scope: ValidateScore;

    private variables: IVariableData[];
    private scores: IScoreData[];
    private formulas: IFormulaData[];

    constructor(item: IRulesItemConfig) {
        this.id = item.id;
        this.name = item.name;

        this.variables = item.config?.variables || [];
        this.scores = item.config?.scores || [];
        this.formulas = item.config?.formulas || [];
    }

    public setData(namespaces: ValidateNamespace) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
    }

    public update() {
        for (const variable of this.variables) {
            const value = this.namespaces.getField(variable.schemaId, variable.path);
            (variable as any).value = value;
            this.scope.setVariable(variable.id, null); ``
        }
    }

    public calculation() {
        for (const score of this.scores) {
            this.scope.setVariable(score.id, null);
        }
        for (const formula of this.formulas) {
            const scope = this.getScore();
            const value = NodeValidator.calculateFormula(formula, scope);
            (formula as any).value = value;
            this.scope.setVariable(formula.id, value);
        }
    }

    public validate(): IValidateResult {
        const result: IValidateResult = {
            id: this.id,
            valid: true
        };

        const scope = this.getScore();
        for (const formula of this.formulas) {
            const validator = new FormulaRuleValidator(formula);
            const status = validator.validate(scope);
            (formula as any).status = status;
            if (status === FieldRuleResult.Failure || status === FieldRuleResult.Error) {
                result.valid = false;
                result.error = 'Invalid condition'
                return result;
            }
        }

        return result;
    }

    private getScore(): any {
        const namespace = this.namespaces.getNamespace();
        const scope = this.scope.getScore();
        return Object.assign(namespace, scope);
    }
}

class StatisticValidator {
    private readonly id: string;
    private readonly name: string;

    private namespaces: ValidateNamespace;
    private scope: ValidateScore;

    private variables: IVariableData[];
    private scores: IScoreData[];
    private formulas: IFormulaData[];

    constructor(item: IStatisticItemConfig) {
        this.id = item.id;
        this.name = item.name;
        this.variables = item.config?.variables || [];
        this.scores = item.config?.scores || [];
        this.formulas = item.config?.formulas || [];
    }

    public setData(namespaces: ValidateNamespace) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
    }

    public update() {
        for (const variable of this.variables) {
            const value = this.namespaces.getField(variable.schemaId, variable.path);
            (variable as any).value = value;
            this.scope.setVariable(variable.id, null); ``
        }
    }

    public calculation() {
        for (const score of this.scores) {
            this.scope.setVariable(score.id, null);
        }
        for (const formula of this.formulas) {
            const scope = this.getScore();
            const value = NodeValidator.calculateFormula(formula, scope);
            (formula as any).value = value;
            this.scope.setVariable(formula.id, value);
        }
    }

    public validate(): IValidateResult {
        const result: any = {
            id: this.id,
            valid: true,
        };
        return result;
    }

    private getScore(): any {
        const namespace = this.namespaces.getNamespace();
        const scope = this.scope.getScore();
        return Object.assign(namespace, scope);
    }
}

class LabelValidator {
    private readonly id: string;
    private readonly name: string;

    private namespaces: ValidateNamespace;
    private scope: ValidateScore;

    private imports: INavImportsConfig[];
    private children: INavItemConfig[];
    private root: GroupValidator;

    constructor(item: ILabelItemConfig) {
        this.id = item.id;
        this.name = item.name;

        const label: IPolicyLabelConfig = item.config || {};
        this.imports = label.imports || [];
        this.children = label.children || [];

        this.root = new GroupValidator({
            id: item.id,
            type: NavItemType.Group,
            name: item.name,
            rule: 'every',
            children: this.children
        });
    }

    public setData(namespaces: ValidateNamespace) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
        this.root.setData(namespaces);
    }

    public validate(): IValidateResult {
        return this.root.validate();
    }
}

export class LabelValidators {
    private readonly imports: INavImportsConfig[];
    private readonly children: INavItemConfig[];
    private readonly root: LabelValidator;

    constructor(label: IPolicyLabelConfig) {
        this.root = new LabelValidator({
            id: 'root',
            type: NavItemType.Label,
            name: 'root',
            config: label
        });
        debugger;
    }

    public validate(documents: any[]): any {
        const namespaces = new ValidateNamespace('root', documents);
        this.root.setData(namespaces);
        return this.root.validate();
    }
}

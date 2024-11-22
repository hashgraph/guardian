import { IGroupItemConfig, ILabelItemConfig, INavImportsConfig, INavItemConfig, IPolicyLabelConfig, IRulesItemConfig, IStatisticItemConfig, NavItemType } from "@guardian/interfaces";


type IValidator = GroupValidator | LabelValidator | RuleValidator | StatisticValidator | NodeValidator;

interface IValidateResult {
    id: string;
    valid: boolean;
    error?: any;
    children?: IValidateResult[];
}

class ValidateNamespaces {
    private readonly documents: any[];
    private readonly namespaces: Map<string, any>;
    private readonly children: ValidateNamespaces[];

    constructor(documents: any[]) {
        this.documents = documents;
        this.namespaces = new Map<string, any>();
        this.children = [];
    }

    public createScore(name: string): any {
        const score: any = {};
        for (const [namespace, subScore] of this.namespaces.entries()) {
            for (const fieldName of Object.keys(subScore)) {
                score[`${namespace}.${fieldName}`] = subScore[fieldName];
            }
        }
        this.namespaces.set(name, score);
        return score;
    }

    public createNamespaces(name: string): ValidateNamespaces {
        const namespace = new ValidateNamespaces(this.documents);
        this.children.push(namespace);
        return namespace;
    }
}

class NodeValidator {
    private readonly id: string;
    private readonly name: string;

    private namespaces: ValidateNamespaces;
    private scope: any;

    constructor(item: any) {
        this.id = item.id;
        this.name = item.name;
    }

    public setData(namespaces: ValidateNamespaces) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
    }

    public validate(scope: ValidateNamespaces): IValidateResult {
        return {
            id: this.id,
            valid: false,
            error: 'Unidentified item'
        };
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

    private namespaces: ValidateNamespaces;
    private scope: any;

    constructor(item: IGroupItemConfig) {
        this.id = item.id;
        this.name = item.name;
        this.children = NodeValidator.fromArray(item.children);
    }

    public setData(namespaces: ValidateNamespaces) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
        for (const child of this.children) {
            child.setData(namespaces);
        }
    }

    public validate(namespaces: ValidateNamespaces): IValidateResult {
        const result: any = {
            id: this.id,
            valid: true,
            children: []
        };

        const namespace = namespaces.createNamespaces(this.id);
        for (const child of this.children) {
            const childResult = child.validate(namespace);
            result.children.push(childResult);
            if (!childResult.valid) {
                return result;
            }
        }

        return result;
    }
}

class LabelValidator {
    private readonly id: string;
    private readonly name: string;

    private namespaces: ValidateNamespaces;
    private scope: any;

    constructor(item: ILabelItemConfig) {
        this.id = item.id;
        this.name = item.name;
    }

    public setData(namespaces: ValidateNamespaces) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
    }

    public validate(namespaces: ValidateNamespaces): IValidateResult {
        const result: any = {
            id: this.id,
            valid: true,
        };
        const scope = namespaces.createScore(this.id);
        return result;
    }
}


class RuleValidator {
    private readonly id: string;
    private readonly name: string;

    private namespaces: ValidateNamespaces;
    private scope: any;

    constructor(item: IRulesItemConfig) {
        this.id = item.id;
        this.name = item.name;
    }

    public setData(namespaces: ValidateNamespaces) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
    }

    public validate(namespaces: ValidateNamespaces): IValidateResult {
        const result: any = {
            id: this.id,
            valid: true,
        };
        const scope = namespaces.createScore(this.id);
        return result;
    }
}

class StatisticValidator {
    private readonly id: string;
    private readonly name: string;

    private namespaces: ValidateNamespaces;
    private scope: any;

    constructor(item: IStatisticItemConfig) {
        this.id = item.id;
        this.name = item.name;
    }

    public setData(namespaces: ValidateNamespaces) {
        this.namespaces = namespaces;
        this.scope = this.namespaces.createScore(this.id);
    }

    public validate(): IValidateResult {
        const result: any = {
            id: this.id,
            valid: true,
        };
        const scope = this.namespaces.createScore(this.id);

        // for (const field of this.preview) {
        //     document[field.id] = field.value;
        // }

        // for (const score of this.scores) {
        //     document[score.id] = score.value;
        // }

        // for (const formula of this.formulas) {
        //     formula.value = this.calcFormula(formula, document);
        //     if (formula.value) {
        //         if (formula.type === 'string') {
        //             formula.value = String(formula.value);
        //         } else {
        //             formula.value = Number(formula.value);
        //         }
        //         document[formula.id] = formula.value;
        //     }
        // }

        return result;
    }
}

export class LabelValidators {
    private readonly imports: INavImportsConfig[];
    private readonly children: INavItemConfig[];
    private readonly root: GroupValidator;

    constructor(label: IPolicyLabelConfig) {
        this.imports = label.imports || [];
        this.children = label.children || [];
        this.root = new GroupValidator({
            id: 'root',
            type: NavItemType.Group,
            name: 'root',
            rule: 'every',
            children: this.children
        });
        debugger;
    }

    public validate(scope: any): any {
        return this.root.validate(scope);
    }
}

import {
    GenerateUUIDv4,
    GroupType,
    IFormulaData,
    IGroupItemConfig,
    ILabelItemConfig,
    INavImportsConfig,
    INavItemConfig,
    IPolicyLabel,
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

export interface IValidateResult {
    id: string;
    valid: boolean;
    error?: any;
    children?: IValidateResult[];
}

export interface IValidatorNode {
    name: string,
    item: IValidator,
    selectable: boolean,
    type: string | null,
    icon?: string,
    children: IValidatorNode[]
}

export interface ISubStep {
    index: number,
    name: string,
    selected: boolean
}

export interface IValidatorStep {
    name: string,
    title: string,
    prefix?: string,
    item: IValidator,
    type: string,
    config: any,
    auto: boolean,
    disabled?: boolean,
    subIndexes?: ISubStep[],
    update: () => void;
}

function isObject(item: any): boolean {
    return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

class ValidateScore {
    public readonly id: string;
    public readonly name: string;

    private readonly score: any;
    private readonly names: string[];

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.score = {};
        this.names = [];
    }

    public setVariable(name: string, value: any) {
        this.score[name] = value;
    }

    public getScore(): any {
        return this.score;
    }

    public setName(name: string): void {
        this.names.push(name);
    }

    public getName(): string[] {
        return this.names;
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

    public createScore(id: string, name: string): any {
        const score = new ValidateScore(id, name);
        this.scores.push(score);
        return score;
    }

    public getNamespace(id?: string): any {
        let namespace: any = {};
        for (const item of this.scores) {
            if (item.id === id) {
                return namespace;
            }
            const values = item.getScore();
            const keys = Object.keys(values);
            for (const key of keys) {
                if (!isObject(namespace[item.name])) {
                    namespace[item.name] = {};
                }
                namespace[item.name][key] = values[key];
            }
        }
        return namespace;
    }

    public getNames(id?: string): string[] {
        let names = new Set<string>();
        for (const item of this.scores) {
            if (item.id === id) {
                return Array.from(names);
            }
            const keys = item.getName();
            for (const key of keys) {
                names.add(`${item.name}.${key}`);
            }
        }
        return Array.from(names);
    }

    public getField(schema: string, path: string): any {
        const fullPath = [...(path || '').split('.')];
        const document = this.documents?.find((doc) => doc.schema === schema);
        if (!document) {
            return undefined;
        }
        return this.getFieldValue(document, fullPath);
    }

    private getFieldValue(document: any, fullPath: string[]): any {
        let value: any = document?.document?.credentialSubject;
        if (Array.isArray(value)) {
            value = value[0];
        }
        for (let i = 0; i < fullPath.length; i++) {
            if (value) {
                value = value[fullPath[i]]
            } else {
                return undefined;
            }
        }
        return value;
    }
}

class NodeValidator {
    public readonly type: NavItemType | null = null;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 0;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateResult;

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

    public validate(): IValidateResult {
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
        }]
    }

    public getResult(): IValidateResult {
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
    public readonly type: NavItemType | null = NavItemType.Group;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly children: IValidator[];
    public readonly steps: number = 0;
    public readonly rule: GroupType;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateResult;

    public prefix: string;

    constructor(item: IGroupItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';
        this.rule = item.rule || GroupType.Every;
        this.children = NodeValidator.fromArray(item.children);
    }

    public get status(): boolean | undefined {
        return this.valid ? this.valid.valid : undefined;
    }

    public setData(namespace: ValidateNamespace) {
        this.namespace = namespace;
        this.scope = this.namespace.createScore(this.id, this.tag);
        for (const child of this.children) {
            child.setData(namespace);
        }
    }

    public validate(): IValidateResult {
        this.valid = {
            id: this.id,
            valid: true,
            children: []
        };

        if (!this.children.length) {
            return this.valid;
        }

        let count: number = 0;
        for (const child of this.children) {
            const childResult = child.validate();
            this.valid.children?.push(childResult);
            if (childResult.valid) {
                count++;
            }
        }

        if (this.rule === GroupType.Every) {
            this.valid.valid = this.children.length === count;
        } else {
            this.valid.valid = count > 0;
        }

        return this.valid;
    }

    public getSteps(): IValidatorStep[] {
        return [{
            item: this,
            name: this.title,
            title: this.title,
            prefix: this.prefix,
            auto: true,
            type: 'validate',
            config: null,
            update: this.validate.bind(this)
        }]
    }

    public getNamespace(): ValidateNamespace {
        return this.namespace;
    }

    public getScope(): ValidateScore {
        return this.scope;
    }

    public getResult(): IValidateResult {
        return this.valid;
    }
}

class RuleValidator {
    public readonly type: NavItemType | null = NavItemType.Rules;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 3;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateResult;

    private variables: IVariableData[];
    private scores: IScoreData[];
    private formulas: IFormulaData[];

    public prefix: string;

    constructor(item: IRulesItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';

        this.variables = item.config?.variables || [];
        this.scores = item.config?.scores || [];
        this.formulas = item.config?.formulas || [];

        this.prepareData();
    }

    public get status(): boolean | undefined {
        return this.valid ? this.valid.valid : undefined;
    }

    private prepareData() {
        for (const score of this.scores) {
            (score as any)._relationships = score.relationships?.map((id) => {
                return this.variables.find((v) => v.id === id)
            });
            (score as any)._options = score.options?.map((option) => {
                return {
                    id: GenerateUUIDv4(),
                    description: option.description,
                    value: option.value
                }
            });
        }
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
            (variable as any).value = value;
            (variable as any).isArray = Array.isArray(value);
            this.scope.setVariable(variable.id, (variable as any).value);
        }
    }

    public updateScores() {
        return;
    }

    public updateFormulas() {
        for (const score of this.scores) {
            this.scope.setVariable(score.id, (score as any).value);
        }
        for (const formula of this.formulas) {
            const scope = this.getScore();
            const value = NodeValidator.calculateFormula(formula, scope);
            (formula as any).value = value;
            this.scope.setVariable(formula.id, value);
        }
    }

    public validate(): IValidateResult {
        this.valid = {
            id: this.id,
            valid: true
        };

        const scope = this.getScore();
        for (const formula of this.formulas) {
            const validator = new FormulaRuleValidator(formula);
            const status = validator.validate(scope);
            (formula as any).status = status;
            if (status === FieldRuleResult.Failure || status === FieldRuleResult.Error) {
                this.valid.valid = false;
                this.valid.error = 'Invalid condition'
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
            })
        }
        if (this.scores?.length) {
            subIndex.push({
                index: subIndex.length + 1,
                name: 'Scores',
                selected: false
            })
        }
        if (this.formulas?.length) {
            subIndex.push({
                index: subIndex.length + 1,
                name: 'Statistics',
                selected: false
            })
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
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Overview' } }),
                update: this.updateVariables.bind(this)
            })
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
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Scores' } }),
                update: this.updateScores.bind(this)
            })
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
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Statistics' } }),
                update: this.updateFormulas.bind(this)
            })
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
        })
        return steps;
    }

    public getNamespace(): ValidateNamespace {
        return this.namespace;
    }

    public getScope(): ValidateScore {
        return this.scope;
    }

    public getResult(): IValidateResult {
        return this.valid;
    }
}

class StatisticValidator {
    public readonly type: NavItemType | null = NavItemType.Statistic;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 3;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateResult;

    private variables: IVariableData[];
    private scores: IScoreData[];
    private formulas: IFormulaData[];

    public prefix: string;

    constructor(item: IStatisticItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';

        this.variables = item.config?.variables || [];
        this.scores = item.config?.scores || [];
        this.formulas = item.config?.formulas || [];

        this.prepareData();
    }

    public get status(): boolean | undefined {
        return this.valid ? this.valid.valid : undefined;
    }

    private prepareData() {
        for (const score of this.scores) {
            (score as any)._relationships = score.relationships?.map((id) => {
                return this.variables.find((v) => v.id === id)
            });
            (score as any)._options = score.options?.map((option) => {
                return {
                    id: GenerateUUIDv4(),
                    description: option.description,
                    value: option.value
                }
            });
        }
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
            (variable as any).value = value;
            (variable as any).isArray = Array.isArray(value);
            this.scope.setVariable(variable.id, (variable as any).value);
        }
    }

    public updateScores() {
        return;
    }

    public updateFormulas() {
        for (const score of this.scores) {
            this.scope.setVariable(score.id, (score as any).value);
        }
        for (const formula of this.formulas) {
            const scope = this.getScore();
            const value = NodeValidator.calculateFormula(formula, scope);
            (formula as any).value = value;
            this.scope.setVariable(formula.id, value);
        }
    }

    public validate(): IValidateResult {
        this.valid = {
            id: this.id,
            valid: true,
        };
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
            })
        }
        if (this.scores?.length) {
            subIndex.push({
                index: subIndex.length + 1,
                name: 'Scores',
                selected: false
            })
        }
        if (this.formulas?.length) {
            subIndex.push({
                index: subIndex.length + 1,
                name: 'Statistics',
                selected: false
            })
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
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Overview' } }),
                update: this.updateVariables.bind(this)
            })
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
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Scores' } }),
                update: this.updateScores.bind(this)
            })
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
                subIndexes: subIndex.map(e => { return { ...e, selected: e.name === 'Statistics' } }),
                update: this.updateFormulas.bind(this)
            })
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
        })
        return steps;
    }

    public getNamespace(): ValidateNamespace {
        return this.namespace;
    }

    public getScope(): ValidateScore {
        return this.scope;
    }

    public getResult(): IValidateResult {
        return this.valid;
    }
}

class LabelValidator {
    public readonly type: NavItemType | null = NavItemType.Label;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 0;
    public readonly root: GroupValidator;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateResult;

    private imports: INavImportsConfig[];
    private children: INavItemConfig[];

    public prefix: string;

    constructor(item: ILabelItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';

        const label: IPolicyLabelConfig = item.config || {};
        this.imports = label.imports || [];
        this.children = label.children || [];

        this.root = new GroupValidator({
            id: item.id,
            type: NavItemType.Group,
            name: item.name,
            rule: GroupType.Every,
            children: this.children
        });
    }

    public get status(): boolean | undefined {
        return this.valid ? this.valid.valid : undefined;
    }

    public setData(namespace: ValidateNamespace) {
        this.namespace = namespace;
        this.scope = this.namespace.createScore(this.id, this.tag);
        this.root.setData(namespace);
    }

    public validate(): IValidateResult {
        this.valid = this.root.validate();
        return this.valid;
    }

    public getSteps(): IValidatorStep[] {
        return [{
            item: this,
            name: this.title,
            title: this.title,
            prefix: this.prefix,
            auto: true,
            type: 'validate',
            config: null,
            update: this.validate.bind(this)
        }]
    }

    public getNamespace(): ValidateNamespace {
        return this.namespace;
    }

    public getScope(): ValidateScore {
        return this.scope;
    }

    public getResult(): IValidateResult {
        return this.valid;
    }
}

export class LabelValidators {
    private readonly imports: INavImportsConfig[];
    private readonly children: INavItemConfig[];
    private readonly root: LabelValidator;
    private readonly steps: IValidatorStep[];
    private readonly tree: IValidatorNode;
    private readonly list: IValidator[];

    private index: number = 0;

    constructor(label: IPolicyLabel) {
        const config: IPolicyLabelConfig = label.config || {};
        this.root = new LabelValidator({
            id: 'root',
            type: NavItemType.Label,
            name: 'root',
            title: label.name,
            config
        });
        this.tree = this.createTree(this.root);
        this.steps = this.createSteps(this.root, []);
        this.list = this.createList(this.root, []);
    }

    public get status(): boolean | undefined {
        return this.root ? this.root.status : undefined;
    }

    private createList(node: IValidator, result: IValidator[]): IValidator[] {
        result.push(node);
        if (node.type === NavItemType.Group) {
            for (const child of (node as GroupValidator).children) {
                this.createList(child, result);
            }
        } else if (node.type === NavItemType.Label) {
            this.createList((node as LabelValidator).root, result);
        }
        return result;
    }

    private createSteps(node: IValidator, result: IValidatorStep[]): IValidatorStep[] {
        if (node.type === NavItemType.Rules) {
            this.addSteps(node, result);
        } else if (node.type === NavItemType.Statistic) {
            this.addSteps(node, result);
        } else if (node.type === NavItemType.Group) {
            for (const child of (node as GroupValidator).children) {
                this.createSteps(child, result);
            }
            this.addSteps(node, result);
        } else if (node.type === NavItemType.Label) {
            this.createSteps((node as LabelValidator).root, result);
            this.addSteps(node, result);
        }
        return result;
    }

    private addSteps(node: IValidator, result: IValidatorStep[]): IValidatorStep[] {
        const steps = node.getSteps();
        for (const step of steps) {
            result.push(step);
        }
        return result;
    }

    private createTree(node: IValidator, prefix: string = ''): IValidatorNode {
        const item: IValidatorNode = {
            name: prefix ? `${prefix} ${node.title}` : node.title,
            item: node,
            type: node.type,
            selectable: (
                node.type === NavItemType.Rules ||
                node.type === NavItemType.Statistic
            ),
            children: []
        }
        node.prefix = prefix;
        if (node.type === NavItemType.Group) {
            const childrenNode = (node as GroupValidator).children;
            for (let i = 0; i < childrenNode.length; i++) {
                const childNode = childrenNode[i];
                const child = this.createTree(childNode, `${prefix}${i + 1}.`);
                item.children.push(child);
            }
        } else if (node.type === NavItemType.Label) {
            const childrenNode = (node as LabelValidator).root.children;
            for (let i = 0; i < childrenNode.length; i++) {
                const childNode = childrenNode[i];
                const child = this.createTree(childNode, `${prefix}${i + 1}.`);
                item.children.push(child);
            }
        }
        return item;
    }

    public getValidator(id: string): IValidator | undefined {
        return this.list.find((v) => v.id === id);
    }

    public setData(documents: any[]) {
        const namespaces = new ValidateNamespace('root', documents);
        this.root.setData(namespaces);
    }

    public getResult(): IValidateResult {
        return this.root.getResult();
    }

    public getTree(): IValidatorNode {
        return this.tree;
    }

    public getSteps(): IValidatorStep[] {
        return this.steps;
    }

    public next(): IValidatorStep | null {
        this.index++;
        this.index = Math.max(Math.min(this.index, this.steps.length), -1);
        const step = this.steps[this.index];
        if (step) {
            step.update();
            if (step.auto) {
                return this.next();
            } else {
                return step;
            }
        } else {
            return null;
        }
    }

    public prev(): IValidatorStep | null {
        this.index--;
        this.index = Math.max(Math.min(this.index, this.steps.length), -1);
        const step = this.steps[this.index];
        if (step) {
            if (step.auto) {
                return this.prev();
            } else {
                step.update();
                return step;
            }
        } else {
            return null;
        }
    }

    public current(): IValidatorStep | null {
        return this.steps[this.index];
    }

    public isNext(): boolean {
        return this.index < (this.steps.length - 1);
    }

    public isPrev(): boolean {
        return this.index > 0;
    }

    public start(): IValidatorStep | null {
        this.index = -1;
        return this.next();
    }
}

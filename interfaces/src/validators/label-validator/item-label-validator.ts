import { IValidateStatus } from './interfaces/status.js';
import { IValidatorStep } from './interfaces/step.js';
import { ValidateScore } from './score.js';
import { ValidateNamespace } from './namespace.js';
import { GroupItemValidator } from './item-group-validator.js';
import { GroupType, ILabelItemConfig, INavImportsConfig, INavItemConfig, IPolicyLabelConfig, NavItemType } from '../../interface/index.js';
import { IStepDocument } from './interfaces/step-document.js';

export class LabelItemValidator {
    public readonly type: NavItemType | null = NavItemType.Label;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 0;
    public readonly root: GroupItemValidator;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateStatus | undefined;

    // tslint:disable-next-line:no-unused-variable
    private readonly imports: INavImportsConfig[];
    // tslint:disable-next-line:no-unused-variable
    private readonly children: INavItemConfig[];

    public prefix: string;

    constructor(item: ILabelItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';

        const label: IPolicyLabelConfig = item.config || {};
        this.imports = label.imports || [];
        this.children = label.children || [];

        this.root = new GroupItemValidator({
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

    public validate(): IValidateStatus {
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
            update: this.validate.bind(this),
            validate: this.validate.bind(this)
        }];
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
        return {
            status: this.status
        }
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

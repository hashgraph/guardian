import { IValidateStatus } from './interfaces/status.js';
import { IValidatorStep } from './interfaces/step.js';
import { ValidateScore } from './score.js';
import { ValidateNamespace } from './namespace.js';
import { GroupItemValidator } from './item-group-validator.js';
import { GroupType, ILabelItemConfig, INavItemConfig, IPolicyLabelConfig, NavItemType } from '../../interface/index.js';
import { IStepDocument } from './interfaces/step-document.js';

export class LabelItemValidator {
    public readonly type: NavItemType | null = NavItemType.Label;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly steps: number = 0;
    public readonly root: GroupItemValidator;
    public readonly schema: string;

    public isRoot: boolean;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateStatus | undefined;

    private readonly children: INavItemConfig[];

    public prefix: string;

    constructor(item: ILabelItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';
        this.isRoot = false;

        const label: IPolicyLabelConfig = item.config || {};
        this.children = label.children || [];
        this.schema = item.schemaId || label.schemaId || '';

        this.root = new GroupItemValidator({
            id: item.id,
            type: NavItemType.Group,
            name: item.name,
            schemaId: this.schema,
            rule: GroupType.Every,
            children: this.children
        });
        this.root.isRoot = true;
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

    public setResult(document: any): void {
        if (!document) {
            this.valid = {
                id: this.id,
                valid: false,
                error: 'Invalid document'
            };
            return;
        }
        this.root.setResult(document);
        this.valid = this.root.getStatus();
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

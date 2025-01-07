import { IValidator } from './interfaces/validator.js';
import { IValidateStatus } from './interfaces/status.js';
import { IValidatorStep } from './interfaces/step.js';
import { ValidateScore } from './score.js';
import { ValidateNamespace } from './namespace.js';
import { NodeItemValidator } from './item-node-validator.js';
import { GroupType, IGroupItemConfig, NavItemType } from '../../interface/index.js';
import { IStepDocument } from './interfaces/step-document.js';

export class GroupItemValidator {
    public readonly type: NavItemType | null = NavItemType.Group;

    public readonly id: string;
    public readonly name: string;
    public readonly title: string;
    public readonly tag: string;
    public readonly children: IValidator[];
    public readonly steps: number = 0;
    public readonly rule: GroupType;
    public readonly schema: string;

    public isRoot: boolean;

    private namespace: ValidateNamespace;
    private scope: ValidateScore;
    private valid: IValidateStatus | undefined;

    public prefix: string;

    constructor(item: IGroupItemConfig) {
        this.id = item.id;
        this.name = item.name || '';
        this.title = item.title || '';
        this.tag = item.tag || '';
        this.schema = item.schemaId || '';
        this.rule = item.rule || GroupType.Every;
        this.children = NodeItemValidator.fromArray(item.children);
        this.isRoot = false;
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

    public validate(): IValidateStatus {
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
            update: this.validate.bind(this),
            validate: this.validate.bind(this),
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
        this.valid = {
            id: this.id,
            valid: !!document.status
        };
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

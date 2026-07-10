
import { LabelItemValidator } from './item-label-validator.js';
import { GroupItemValidator } from './item-group-validator.js';
import { ValidateNamespace } from './namespace.js';
import { IValidatorStep } from './interfaces/step.js';
import { IValidatorNode } from './interfaces/node.js';
import { IValidateStatus } from './interfaces/status.js';
import { IValidator } from './interfaces/validator.js';
import { IPolicyLabel, IPolicyLabelConfig, IVPDocument, NavItemType } from '../../interface/index.js';
import { IStepDocument } from './interfaces/step-document.js';

export class LabelValidators {
    private readonly root: LabelItemValidator;
    private readonly steps: IValidatorStep[];
    private readonly tree: IValidatorNode;
    private readonly list: IValidator[];
    private readonly document: IValidatorStep[];

    private index: number = 0;

    constructor(label: IPolicyLabel) {
        const config: IPolicyLabelConfig = label.config || {};
        this.root = new LabelItemValidator({
            id: 'root',
            type: NavItemType.Label,
            name: 'root',
            title: label.name,
            config
        });
        this.root.isRoot = true;
        this.tree = this.createTree(this.root);
        this.steps = this.createSteps(this.root, []);
        this.list = this.createList(this.root, []);
        this.document = this.createDocument(this.root, []);
    }

    public get status(): boolean | undefined {
        return this.root ? this.root.status : undefined;
    }

    private createList(node: IValidator, result: IValidator[]): IValidator[] {
        result.push(node);
        if (node.type === NavItemType.Group) {
            for (const child of (node as GroupItemValidator).children) {
                this.createList(child, result);
            }
        } else if (node.type === NavItemType.Label) {
            this.createList((node as LabelItemValidator).root, result);
        }
        return result;
    }

    private createSteps(node: IValidator, result: IValidatorStep[]): IValidatorStep[] {
        if (node.type === NavItemType.Rules) {
            this.addSteps(node, result);
        } else if (node.type === NavItemType.Statistic) {
            this.addSteps(node, result);
        } else if (node.type === NavItemType.Group) {
            for (const child of (node as GroupItemValidator).children) {
                this.createSteps(child, result);
            }
            this.addSteps(node, result);
        } else if (node.type === NavItemType.Label) {
            this.createSteps((node as LabelItemValidator).root, result);
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

    private createDocument(node: IValidator, result: IValidatorStep[]): IValidatorStep[] {
        if (node.type === NavItemType.Rules) {
            this.addDocument(node, result);
        } else if (node.type === NavItemType.Statistic) {
            this.addDocument(node, result);
        } else if (node.type === NavItemType.Group) {
            this.addDocument(node, result);
            for (const child of (node as GroupItemValidator).children) {
                this.createDocument(child, result);
            }
        } else if (node.type === NavItemType.Label) {
            this.addDocument(node, result);
            this.createDocument((node as LabelItemValidator).root, result);
        }
        return result;
    }

    private addDocument(node: IValidator, result: IValidatorStep[]): IValidatorStep[] {
        if (node.isRoot) {
            return result;
        }
        const steps = node.getSteps();
        steps.unshift(steps.pop());
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
            const childrenNode = (node as GroupItemValidator).children;
            for (let i = 0; i < childrenNode.length; i++) {
                const childNode = childrenNode[i];
                const child = this.createTree(childNode, `${prefix}${i + 1}.`);
                item.children.push(child);
            }
        } else if (node.type === NavItemType.Label) {
            const childrenNode = (node as LabelItemValidator).root.children;
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

    public getStatus(): IValidateStatus | undefined {
        return this.root.getStatus();
    }

    public getTree(): IValidatorNode {
        return this.tree;
    }

    public getSteps(): IValidatorStep[] {
        return this.steps;
    }

    public getDocument(): IValidatorStep[] {
        return this.document;
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

    public getResult(): any[] {
        const documents: any[] = [];
        for (const item of this.list) {
            documents.push(item.getResult());
        }
        return documents;
    }

    public setResult(result: any[]): void {
        for (let i = 0; i < this.list.length; i++) {
            const item = this.list[i];
            const document = result[i];
            item.setResult(document);
        }
    }

    public validate(): IValidateStatus | undefined {
        for (const step of this.steps) {
            step.validate();
        }
        return this.root.getStatus();
    }

    public clear(): void {
        for (const item of this.list) {
            item.clear();
        }
    }

    public getVCs(): IStepDocument[] {
        const vcs: IStepDocument[] = [];
        for (const node of this.list) {
            const vc = node.getVC();
            if (vc) {
                vcs.push(vc);
            }
        }
        return vcs;
    }

    public setVp(vp: IVPDocument): void {
        const result: any[] = [];
        const vcs: any = vp.document.verifiableCredential;
        if (Array.isArray(vcs)) {
            for (const vc of vcs) {
                let cs = vc?.credentialSubject;
                if (Array.isArray(cs)) {
                    cs = cs[0];
                }
                result.push(cs);
            }
        }

        let index = 0;
        for (const node of this.list) {
            if (node.setVC(result[index])) {
                index++;
            }
        }
    }
}

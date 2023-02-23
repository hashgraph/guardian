import { GenerateUUIDv4, PolicyType } from '@guardian/interfaces';
import { PolicyBlockModel } from './block.model';
import { PolicyModuleModel } from "./module.model";
import { IBlockConfig } from './interfaces/block-config.interface';
import { IModuleVariables } from './variables/module-variables.interface';
import { PolicyEventModel } from './block-event.model';
import { PolicyModel } from './policy.model';

export class TemplateModel {
    public readonly valid: boolean;
    public readonly id!: string;
    public readonly uuid!: string;
    public readonly codeVersion!: string;
    public readonly creator!: string;
    public readonly owner!: string;
    public readonly createDate!: string;
    public readonly status!: string;
    public readonly messageId!: string;
    public readonly topicId!: string;

    private _name!: string;
    private _description!: string;
    private _config!: PolicyModuleModel;
    private _changed: boolean;

    public readonly isDraft: boolean = false;
    public readonly isPublished: boolean = false;
    public readonly readonly: boolean = false;

    constructor(template?: any) {
        this._changed = false;

        if (!template) {
            this.valid = false;
            return;
        }
        this.valid = true;

        this.id = template.id;
        this.uuid = template.uuid || GenerateUUIDv4();
        this.codeVersion = template.codeVersion;
        this.creator = template.creator;
        this.owner = template.owner;
        this.createDate = template.createDate;
        this.status = template.status;
        this.messageId = template.messageId;
        this.topicId = template.topicId;

        this.buildModule(template);
        this.buildBlock(template.config);

        this.isDraft = this.status === PolicyType.DRAFT;
        this.isPublished = this.status === PolicyType.PUBLISH;
        this.readonly = this.isPublished;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
        this.changed = true;
    }

    public get description(): string {
        return this._description;
    }

    public set description(value: string) {
        this._description = value;
        this.changed = true;
    }

    public get root(): PolicyModuleModel {
        return this._config;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
    }

    private buildModule(policy: any) {
        this._name = policy.name;
        this._description = policy.description;
    }

    private buildBlock(config: IBlockConfig) {
        if (!config) {
            config = { blockType: "module" };
        }
        this._config = new PolicyModuleModel(config, null);
        this._config.setModule(this);
        this._config.refresh();
    }

    public rebuild(object?: any) {
        if (object) {
            if (object.config) {
                this.buildModule(object.config);
                this.buildBlock(object.config);
            } else {
                this.buildBlock(object);
            }
        }
        this.emitUpdate();
    }

    public refresh() {
        this.emitUpdate();
    }

    public getJSON(): any {
        const json = {
            id: this.id,
            uuid: this.uuid,
            name: this.name,
            description: this.description,
            status: this.status,
            creator: this.creator,
            owner: this.owner,
            topicId: this.topicId,
            messageId: this.messageId,
            codeVersion: this.codeVersion,
            createDate: this.createDate,
            config: this._config.getJSON(),
        };
        json.config = this._config.getJSON();
        return json;
    }

    public emitUpdate() {
        this._changed = false;
        if (this._subscriber) {
            this._subscriber();
        }
    }

    private _subscriber!: Function;
    public subscribe(fn: Function) {
        this._subscriber = fn;
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }

    public get blockVariables(): IModuleVariables | null {
        return null;
    }

    public get moduleVariables(): IModuleVariables | null {
        return null;
    }

    public get allEvents(): PolicyEventModel[] {
        return [];
    }

    public getNewTag(type: string, block?: PolicyBlockModel): string {
        return this._config.getNewTag(type, block);
    }

    public getRootModule(): PolicyModel | PolicyModuleModel {
        return this._config
    }

    public getBlock(block: any): PolicyBlockModel | undefined {
        return this._config,this.getBlock(block);
    }
}
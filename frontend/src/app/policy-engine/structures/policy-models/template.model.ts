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
        
        this.buildBlock(template.config);
        this._config.name = template.name;
        this._config.description = template.description;

        this.isDraft = this.status === PolicyType.DRAFT;
        this.isPublished = this.status === PolicyType.PUBLISH;
        this.readonly = this.isPublished;
    }

    public get name(): string {
        return this._config.name;
    }

    public set name(value: string) {
        this._config.name = value;
        this.changed = true;
    }

    public get description(): string {
        return this._config.description;
    }

    public set description(value: string) {
        this._config.description = value;
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

    private buildBlock(config: IBlockConfig) {
        if (!config) {
            config = { blockType: "module" };
        }
        this._config = this._buildBlock(config, null, this) as PolicyModuleModel;
        this._config.isRoot = true;
        this._config.refresh();
    }

    private _buildBlock(
        config: IBlockConfig,
        parent: PolicyModuleModel | PolicyBlockModel | null,
        module: PolicyModuleModel | TemplateModel
    ) {
        let block: PolicyModuleModel | PolicyBlockModel;
        if (config.blockType === 'module') {
            block = new PolicyModuleModel(config, parent);
            block.setModule(module);
            module = block as PolicyModuleModel;
        } else {
            block = new PolicyBlockModel(config, parent);
            block.setModule(module);
        }
        if (Array.isArray(config.children)) {
            for (const childConfig of config.children) {
                const child = this._buildBlock(childConfig, block, module);
                block.children.push(child);
            }
        }
        return block;
    }

    public rebuild(object?: any) {
        if (object) {
            if (object.config) {
                this.buildBlock(object.config);
            } else {
                this.buildBlock(object);
            }
        }
        this.refresh();
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
        this._changed = false;
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
        return this._config, this.getBlock(block);
    }

    public refreshData() {
        this._config.refreshData();
        this.emitUpdate();
    }

    public refresh(): void {
        this.refreshData();
    }

    public getModule(module: any): PolicyModuleModel | undefined {
        return this._config;
    }
}
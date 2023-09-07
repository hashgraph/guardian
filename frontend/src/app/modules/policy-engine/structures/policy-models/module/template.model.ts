import { GenerateUUIDv4, ModuleStatus, PolicyType, Schema } from '@guardian/interfaces';
import { IBlockConfig } from '../interfaces/block-config.interface';
import { IModuleVariables } from '../variables/module-variables.interface';
import { PolicyBlock } from '../block/block.model';
import { PolicyEvent } from '../block/block-event.model';
import { PolicyModule } from './block.model';
import { PolicyFolder, PolicyItem } from '../interfaces/module.type';

export class ModuleTemplate {
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

    private _config!: PolicyModule;
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
        this._config.setNameSilently(template.name);
        this._config.setDescriptionSilently(template.description);
        this._config.setLocalTagSilently(this._config.localTag || 'Module');

        this.isDraft = (this.status === PolicyType.DRAFT) || (this.status === ModuleStatus.DRAFT);
        this.isPublished = (this.status === PolicyType.PUBLISH) || (this.status === ModuleStatus.PUBLISHED);
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

    public get root(): PolicyModule {
        return this._config;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
    }

    public get tagPrefix(): string {
        return '';
    }

    public get localTag(): string {
        return this._config.localTag;
    }

    public get dataSource(): PolicyBlock[] {
        return this._config.dataSource;
    }

    private buildBlock(config: IBlockConfig) {
        if (!config) {
            config = { blockType: 'module' };
        }
        this._config = this._buildBlock(config, null, this) as PolicyModule;
        this._config.isRoot = true;
        this._config.refresh();
    }

    private _buildBlock(
        config: IBlockConfig,
        parent: PolicyItem | null,
        module: PolicyFolder
    ) {
        let block: PolicyItem;
        if (config.blockType === 'module') {
            block = new PolicyModule(config, parent);
            block.setModule(module);
            module = block as PolicyModule;
        } else {
            block = new PolicyBlock(config, parent);
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

    public get allEvents(): PolicyEvent[] {
        return [];
    }

    public getNewTag(type: string): string {
        return this._config.getNewTag(type);
    }

    public getRootModule(): PolicyFolder {
        return this._config;
    }

    public getBlock(block: any): PolicyBlock | undefined {
        return this._config.getBlock(block);
    }

    public createTopic(topic: any): string {
        return this._config.createTopic(topic);
    } 

    public removeBlock(block: any): void {
        return this._config.removeBlock(block);
    }

    public removeEvent(event: any): void {
        this._config.removeEvent(event);
    }

    public setSchemas(schemas: Schema[]): void {
        this._config.setSchemas(schemas);
    }

    public refreshData() {
        this._config.refreshData();
        this.emitUpdate();
    }

    public refresh(): void {
        this.refreshData();
    }

    public getModule(module: any): PolicyFolder | undefined {
        return this._config;
    }

    public getPermissionsNumber(permission: string): number {
        return -1;
    }

    public getPermissionsName(permission: string): string | null {
        return null;
    }
}

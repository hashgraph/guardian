import { BlockType, GenerateUUIDv4, ModuleStatus, PolicyStatus, Schema, Token } from '@guardian/interfaces';
import { IBlockConfig } from '../interfaces/block-config.interface';
import { IModuleVariables } from '../interfaces/module-variables.interface';
import { PolicyBlock } from '../block/block.model';
import { PolicyEvent } from '../block/block-event.model';
import { PolicyFolder } from '../interfaces/types';
import { TemplateUtils } from '../utils';
import { PolicyTool } from './block.model';

export class ToolTemplate {
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
    public readonly version!: string;
    public readonly previousVersion!: string;

    public readonly isDraft: boolean = false;
    public readonly isDryRun: boolean = false;
    public readonly isPublished: boolean = false;
    public readonly isPublishError: boolean = false;
    public readonly readonly: boolean = false;
    public readonly isTest: boolean = false;

    private _config!: PolicyTool;
    private _changed: boolean;

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
        this.version = template.version;
        this.previousVersion = template.previousVersion;

        this.buildBlock(template.config);
        this._config.setNameSilently(template.name);
        this._config.setDescriptionSilently(template.description);
        this._config.setPreviousVersionSilently(template.previousVersion);
        this._config.setVersionSilently(template.version);
        this._config.setLocalTagSilently(this._config.localTag || 'Tool');

        this.isDraft = (this.status === PolicyStatus.DRAFT) || (this.status === ModuleStatus.DRAFT);
        this.isDryRun = (this.status === PolicyStatus.DRY_RUN) || (this.status === ModuleStatus.DRY_RUN);
        this.isPublished = (this.status === PolicyStatus.PUBLISH) || (this.status === ModuleStatus.PUBLISHED);
        this.isPublishError = this.status === PolicyStatus.PUBLISH_ERROR;
        this.readonly = this.isPublished || this.isPublishError || this.isDryRun;
        this.isTest = this.isDraft || this.isDryRun;
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

    public get root(): PolicyTool {
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

    public get canAddBlocks(): boolean {
        return true;
    }

    public get canAddModules(): boolean {
        return false;
    }

    public get canAddTools(): boolean {
        return true;
    }

    public get policyId(): string | undefined {
        return this.id;
    }

    private buildBlock(config: IBlockConfig) {
        if (!config) {
            config = { blockType: 'tool' };
        }
        const last = this._config?.getEnvironments();
        this._config = TemplateUtils.buildBlock(config, null, this) as PolicyTool;
        this._config.isRoot = true;
        this._config.refresh();
        this._config.setEnvironments(last);
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
            version: this.version,
            previousVersion: this.previousVersion,
        };
        return json;
    }

    public getConfig(): any {
        return this._config.getJSON();
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
        return this._config.allEvents;
    }

    public get allBlocks(): PolicyBlock[] {
        return this._config.allBlocks;
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

    public setTemporarySchemas(schemas: Schema[]): void {
        this._config.setTemporarySchemas(schemas);
    }

    public setTools(tools: any[]): void {
        this._config.setTools(tools);
    }

    public setTokens(tokens: Token[]): void {
        this._config.setTokens(tokens);
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

    public newModule(template?: any): any {
        throw new Error('A tool cannot contain nested modules');
    }

    public convertModule(block: PolicyBlock): any {
        throw new Error('A tool cannot contain nested modules');
    }

    public newTool(template?: any): PolicyTool {
        return this._config.newTool(template);
    }

    public getTools(): Set<string> {
        return this._config.getTools();
    }

    public find(types: string[]): PolicyBlock[] {
        return this.allBlocks?.filter((b) => types.includes(b.blockType)) || [];
    }
}

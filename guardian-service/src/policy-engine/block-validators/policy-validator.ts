import { DatabaseServer, Policy } from '@guardian/common';
import { ISchema, ModuleStatus } from '@guardian/interfaces';
import { BlockValidator } from './block-validator';
import { ModuleValidator } from './module-validator';
import { ISerializedErrors } from './interfaces/serialized-errors.interface';
import { ToolValidator } from './tool-validator';

/**
 * Policy Validator
 */
export class PolicyValidator {
    /**
     * Tags
     * @private
     */
    private readonly tags: Map<string, number>;
    /**
     * Blocks map
     * @private
     */
    private readonly blocks: Map<string, BlockValidator>;
    /**
     * Modules map
     * @private
     */
    private readonly modules: Map<string, ModuleValidator>;
    /**
     * Modules map
     * @private
     */
    private readonly tools: Map<string, ToolValidator>;
    /**
     * Common errors
     * @private
     */
    private readonly errors: string[];
    /**
     * Permissions
     * @private
     */
    private readonly permissions: string[];
    /**
     * Topic Id
     * @private
     */
    private readonly topicId: string;
    /**
     * Policy Tokens
     * @private
     */
    private readonly policyTokens: any[];
    /**
     * Policy Topics
     * @private
     */
    private readonly policyTopics: any[];
    /**
     * Policy Groups
     * @private
     */
    private readonly policyGroups: any[];
    /**
     * Schemas
     * @private
     */
    private readonly schemas: Map<string, ISchema>;
    /**
     * Unsupported Schemas
     * @private
     */
    private readonly unsupportedSchemas: Set<string>;

    constructor(policy: Policy) {
        this.blocks = new Map();
        this.modules = new Map();
        this.tools = new Map();
        this.tags = new Map();
        this.errors = [];
        this.permissions = ['NO_ROLE', 'ANY_ROLE', 'OWNER'];
        this.topicId = policy.topicId;
        this.policyTokens = policy.policyTokens || [];
        this.policyTopics = policy.policyTopics || [];
        this.policyGroups = policy.policyGroups;
        this.schemas = new Map();
        this.unsupportedSchemas = new Set();
    }

    /**
     * Register components
     * @param policy
     */
    public async build(policy: Policy): Promise<boolean> {
        if (!policy || (typeof policy !== 'object')) {
            this.addError('Invalid policy config');
            return false;
        } else {
            this.addPermissions(policy.policyRoles);
            await this.registerBlock(policy.config);
            await this.registerSchemas();
            this.checkSchemas();
            return true;
        }
    }

    /**
     * Register schemas
     */
    private async registerSchemas(): Promise<void> {
        const schemas = await DatabaseServer.getSchemas({ topicId: this.topicId });
        this.schemas.clear();
        for (const schema of schemas) {
            this.schemas.set(schema.iri, schema);
        }
    }

    /**
     * Check schemas
     */
    private checkSchemas(): void {
        for (const schema of this.schemas.values()) {
            const defs = schema?.document?.$defs;
            if (defs && Object.prototype.toString.call(defs) === '[object Object]') {
                for (const iri of Object.keys(defs)) {
                    if (!this.schemaExist(iri)) {
                        this.schemas.delete(schema.iri);
                        this.unsupportedSchemas.add(schema.iri);
                        this.checkSchemas();
                        return;
                    }
                }
            }
        }
    }

    /**
     * Register new block
     * @param block
     */
    private async registerBlock(block: any): Promise<BlockValidator> {
        let validator: BlockValidator;
        if (block.id) {
            if (this.blocks.has(block.id)) {
                validator = this.blocks.get(block.id);
                this.errors.push(`UUID ${block.id} already exist`);
            } else {
                validator = new BlockValidator(block, this);
                this.blocks.set(block.id, validator);
            }
        } else {
            validator = new BlockValidator(block, this);
            this.errors.push(`UUID is not set`);
        }
        if (block.tag) {
            if (this.tags.has(block.tag)) {
                this.tags.set(block.tag, 2);
            } else {
                this.tags.set(block.tag, 1);
            }
        }
        if (block.blockType === 'module') {
            const module = new ModuleValidator(block);
            await module.build(block);
            this.modules.set(block.id, module);
        } else if (block.blockType === 'tool') {
            const tool = new ToolValidator(block);
            const policyTool = await DatabaseServer.getTool({
                status: ModuleStatus.PUBLISHED,
                messageId: block.messageId,
                hash: block.hash
            });
            await tool.build(policyTool);
            this.tools.set(block.id, tool);
        } else {
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    const v = await this.registerBlock(child);
                    validator.addChild(v);
                }
            }
        }
        return validator;
    }

    /**
     * Add permission
     * @param role
     */
    private addPermission(role: string): void {
        this.permissions.push(role);
    }

    /**
     * Clear
     */
    public clear(): void {
        for (const item of this.modules.values()) {
            item.clear();
        }
        for (const item of this.tools.values()) {
            item.clear();
        }
        for (const item of this.blocks.values()) {
            item.clear();
        }
    }

    /**
     * Validate
     */
    public async validate(): Promise<void> {
        for (const item of this.modules.values()) {
            await item.validate();
        }
        for (const item of this.tools.values()) {
            await item.validate();
        }
        for (const item of this.blocks.values()) {
            await item.validate();
        }
    }

    /**
     * Permissions not exist
     * @param permissions
     */
    public permissionsNotExist(permissions: string[]): string | null {
        if (permissions) {
            for (const permission of permissions) {
                if (this.permissions.indexOf(permission) === -1) {
                    return permission;
                }
            }
        }
        return null;
    }

    /**
     * Tag Count
     * @param tag
     */
    public tagCount(tag: string): number {
        if (this.tags.has(tag)) {
            return this.tags.get(tag);
        }
        return 0;
    }

    /**
     * Add Error
     * @param error
     */
    public addError(error: string): void {
        this.errors.push(error);
    }

    /**
     * Add permissions
     * @param roles
     */
    public addPermissions(roles: string[]): void {
        if (roles) {
            for (const role of roles) {
                this.addPermission(role);
            }
        }
    }

    /**
     * Get serialized errors
     */
    public getSerializedErrors(): ISerializedErrors {
        const modulesErrors = [];
        for (const item of this.modules.values()) {
            modulesErrors.push(item.getSerializedErrors());
        }
        const toolsErrors = [];
        for (const item of this.tools.values()) {
            toolsErrors.push(item.getSerializedErrors());
        }
        const blocksErrors = [];
        for (const item of this.blocks.values()) {
            blocksErrors.push(item.getSerializedErrors());
        }
        for (const item of this.errors) {
            blocksErrors.push({
                id: null,
                name: null,
                errors: [item],
                isValid: false
            });
        }
        const commonErrors = this.errors.slice();
        return {
            errors: commonErrors,
            blocks: blocksErrors,
            modules: modulesErrors,
            tools: toolsErrors,
        }
    }

    /**
     * Get permission
     * @param permission
     */
    public getPermission(permission: string): string {
        if (this.permissions.indexOf(permission) !== -1) {
            return permission;
        }
        return null
    }

    /**
     * Get Group
     * @param iri
     */
    public getGroup(group: string): any {
        return this.policyGroups.find(e => e.name === group);
    }

    /**
     * Get tag
     * @param tag
     */
    public getTag(tag: string): boolean {
        return this.tags.has(tag);
    }

    /**
     * Get Schema
     * @param iri
     */
    public getSchema(iri: string): ISchema {
        if (this.schemas.has(iri)) {
            return this.schemas.get(iri);
        }
        for (const item of this.tools.values()) {
            const schema = item.getSchema(iri);
            if (schema) {
                return schema;
            }
        }
        return null;
    }

    /**
     * Schema exist
     * @param iri
     */
    public schemaExist(iri: string): boolean {
        if (iri === '#GeoJSON') {
            return true;
        }
        if (this.schemas.has(iri)) {
            return !!this.schemas.get(iri);
        }
        for (const item of this.tools.values()) {
            if (item.schemaExist(iri)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Unsupported schema
     * @param iri
     */
    public unsupportedSchema(iri: string): boolean {
        if (this.unsupportedSchemas.has(iri)) {
            return true;
        }
        for (const item of this.tools.values()) {
            if (item.unsupportedSchema(iri)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get Token Template
     * @param templateName
     */
    public getTokenTemplate(templateName: string): any {
        return this.policyTokens.find(e => e.templateTokenTag === templateName);
    }

    /**
     * Get Token
     * @param tokenId
     */
    public async getToken(tokenId: string): Promise<any> {
        return await new DatabaseServer(null).getToken(tokenId);
    }

    /**
     * Get Topic Template
     * @param topicName
     */
    public getTopicTemplate(topicName: string): any {
        return this.policyTopics.find(e => e.name === topicName);
    }

    /**
     * Get artifact
     * @param uuid
     */
    public async getArtifact(uuid: string) {
        return await DatabaseServer.getArtifact({ uuid });
    }
}

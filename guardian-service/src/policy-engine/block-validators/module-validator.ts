/**
 * Module Validator
 */
import { BlockValidator } from './block-validator';
import { IModulesErrors } from './interfaces/modules-errors.interface';
import { ISchema } from '@guardian/interfaces';
import { DatabaseServer } from '@guardian/common';
import { ToolValidator } from './tool-validator';

/**
 * Module Validator
 */
export class ModuleValidator {
    /**
     * UUID
     * @private
     */
    private readonly uuid: string;
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
     * Schemas
     * @private
     */
    private readonly schemas: Map<string, ISchema>;
    /**
     * Tokens
     * @private
     */
    private readonly tokens: string[];
    /**
     * Topics
     * @private
     */
    private readonly topics: string[];
    /**
     * Topics
     * @private
     */
    private readonly tokenTemplates: string[];
    /**
     * Groups
     * @private
     */
    private readonly groups: string[];
    /**
     * Variables
     * @private
     */
    private readonly variables: any[];

    constructor(moduleConfig: any) {
        this.uuid = moduleConfig.id;
        this.blocks = new Map();
        this.tools = new Map();
        this.tags = new Map();
        this.errors = [];
        this.permissions = ['NO_ROLE', 'ANY_ROLE', 'OWNER'];
        this.schemas = new Map();
        this.tokens = [];
        this.topics = [];
        this.tokenTemplates = [];
        this.groups = [];
        this.variables = [];
    }

    /**
     * Register components
     * @param moduleConfig
     */
    public async build(moduleConfig: any): Promise<boolean> {
        if (!moduleConfig || (typeof moduleConfig !== 'object')) {
            this.addError('Invalid module config');
            return false;
        } else {
            this.registerVariables(moduleConfig);
            if (Array.isArray(moduleConfig.children)) {
                for (const child of moduleConfig.children) {
                    await this.registerBlock(child);
                }
            }
            await this.registerSchemas();
            return true;
        }
    }

    /**
     * Register schemas
     * @param block
     */
    private async registerSchemas(): Promise<void> {
        return;
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
            this.errors.push(`The module can't contain another module`);
        } else if (block.blockType === 'tool') {
            const tool = new ToolValidator(block);
            const policyTool = await DatabaseServer.getTool({
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
     * Register new block
     * @param block
     */
    private registerVariables(moduleConfig: any): void {
        if (Array.isArray(moduleConfig.variables)) {
            for (const variable of moduleConfig.variables) {
                this.variables.push(variable);
                switch (variable.type) {
                    case 'Schema': {
                        this.schemas.set(variable.name, variable.baseSchema);
                        break;
                    }
                    case 'Token':
                        this.tokens.push(variable.name);
                        break;
                    case 'Role':
                        this.permissions.push(variable.name);
                        break;
                    case 'Group':
                        this.groups.push(variable.name);
                        break;
                    case 'TokenTemplate':
                        this.tokenTemplates.push(variable.name);
                        break;
                    case 'Topic':
                        this.topics.push(variable.name);
                        break;
                    default:
                        this.errors.push(`Type '${variable.type}' does not exist`);
                        break;
                }
            }
        }
        const events = new Map<string, number>();
        if (Array.isArray(moduleConfig.inputEvents)) {
            for (const e of moduleConfig.inputEvents) {
                if (events.has(e.name)) {
                    events.set(e.name, 2);
                } else {
                    events.set(e.name, 1);
                }
            }
        }
        if (Array.isArray(moduleConfig.outputEvents)) {
            for (const e of moduleConfig.outputEvents) {
                if (events.has(e.name)) {
                    events.set(e.name, 2);
                } else {
                    events.set(e.name, 1);
                }
            }
        }
        for (const [name, count] of events.entries()) {
            if (count > 1) {
                this.errors.push(`Event '${name}' already exist`);
            }
        }
    }

    /**
     * Clear
     */
    public clear() {
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
    public async validate() {
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
     * Get serialized errors
     */
    public getSerializedErrors(): IModulesErrors {
        let valid = !this.errors.length;
        const toolsErrors = [];
        for (const item of this.tools.values()) {
            const result = item.getSerializedErrors();
            toolsErrors.push(result);
            valid = valid && result.isValid;
        }
        const blocksErrors = [];
        for (const item of this.blocks.values()) {
            const result = item.getSerializedErrors();
            blocksErrors.push(result);
            valid = valid && result.isValid;
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
            tools: toolsErrors,
            id: this.uuid,
            isValid: valid
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
        if (this.groups.indexOf(group) === -1) {
            return null;
        } else {
            return {};
        }
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
    public async getSchema(iri: string): Promise<any> {
        let r = this.schemas.get(iri);
        if (typeof r === 'string') {
            r = await new DatabaseServer(null).getSchemaByIRI(r);
        }
        return r;
    }

    /**
     * Get Token Template
     * @param templateName
     */
    public getTokenTemplate(templateName: string): any {
        if (this.tokenTemplates.indexOf(templateName) === -1) {
            return null;
        } else {
            return {};
        }
    }

    /**
     * Get Token
     * @param tokenId
     */
    public async getToken(tokenId: string): Promise<any> {
        if (this.tokens.indexOf(tokenId) === -1) {
            return null;
        } else {
            return {};
        }
    }

    /**
     * Get Topic Template
     * @param topicName
     */
    public getTopicTemplate(topicName: string): any {
        if (this.topics.indexOf(topicName) === -1) {
            return null;
        } else {
            return {};
        }
    }
}

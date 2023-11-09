import { DatabaseServer, PolicyTool } from '@guardian/common';
import { BlockValidator } from './block-validator';
import { IModulesErrors } from './interfaces/modules-errors.interface';
import { ISchema, ModuleStatus } from '@guardian/interfaces';

/**
 * Policy Validator
 */
export class ToolValidator {
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
     * Schemas
     * @private
     */
    private readonly schemas: Map<string, ISchema>;
    /**
     * Unsupported Schemas
     * @private
     */
    private readonly unsupportedSchemas: Set<string>;
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
    /**
     * Permissions
     * @private
     */
    private readonly permissions: string[];
    /**
     * Topic Id
     * @private
     */
    private topicId: string;

    constructor(tool: any) {
        this.uuid = tool.id;
        this.blocks = new Map();
        this.tools = new Map();
        this.tags = new Map();
        this.errors = [];
        this.permissions = ['NO_ROLE', 'ANY_ROLE', 'OWNER'];
        this.schemas = new Map();
        this.unsupportedSchemas = new Set();
        this.tokens = [];
        this.topics = [];
        this.tokenTemplates = [];
        this.groups = [];
        this.variables = [];
    }

    /**
     * Register components
     * @param tool
     */
    public async build(tool: PolicyTool): Promise<boolean> {
        if (!tool || (typeof tool !== 'object')) {
            this.errors.push('Tool not found');
            return false;
        } else {
            this.topicId = tool.topicId;
            const block = tool.config;
            this.registerVariables(block);
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    await this.registerBlock(child);
                }
            }
            await this.registerSchemas();
            this.checkSchemas();
            return true;
        }
    }

    /**
     * Register schemas
     */
    private async registerSchemas(): Promise<void> {
        const db = new DatabaseServer(null);
        for (const [key, value] of this.schemas) {
            if (typeof value === 'string') {
                const baseSchema = await db.getSchemaByIRI(value);
                this.schemas.set(key, baseSchema);
            }
        }
        const schemas = await DatabaseServer.getSchemas({ topicId: this.topicId });
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
            this.errors.push(`The tool can't contain another module`);
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
     * Register new block
     * @param block
     */
    private registerVariables(tool: any): void {
        if (Array.isArray(tool.variables)) {
            for (const variable of tool.variables) {
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
                    case 'String':
                        break;
                    default:
                        this.errors.push(`Type '${variable.type}' does not exist`);
                        break;
                }
            }
        }
        const events = new Map<string, number>();
        if (Array.isArray(tool.inputEvents)) {
            for (const e of tool.inputEvents) {
                if (events.has(e.name)) {
                    events.set(e.name, 2);
                } else {
                    events.set(e.name, 1);
                }
            }
        }
        if (Array.isArray(tool.outputEvents)) {
            for (const e of tool.outputEvents) {
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
    public clear(): void {
        for (const item of this.blocks.values()) {
            item.clear();
        }
    }

    /**
     * Validate
     */
    public async validate(): Promise<void> {
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
        const blocksErrors = [];
        for (const item of this.blocks.values()) {
            const result = item.getSerializedErrors()
            blocksErrors.push(result);
            valid = valid && result.isValid;
        }
        for (const item of this.errors) {
            blocksErrors.push({
                id: this.uuid,
                name: 'tool',
                errors: [item],
                isValid: false
            });
        }
        if (!valid) {
            blocksErrors.push({
                id: this.uuid,
                name: 'tool',
                errors: ['Tool is invalid'],
                isValid: false
            });
        }
        const commonErrors = this.errors.slice();
        return {
            errors: commonErrors,
            blocks: blocksErrors,
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
            const exist = item.schemaExist(iri);
            if (exist) {
                return exist;
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

    /**
     * Get artifact
     * @param uuid
     */
    public async getArtifact(uuid: string) {
        return await DatabaseServer.getArtifact({ uuid });
    }
}

import { DatabaseServer, Policy } from '@guardian/common';
import { ISchema, ModuleStatus, SchemaEntity, IgnoreRule, computeReachability, buildMessagesForValidator } from '@guardian/interfaces';
import { BlockValidator } from './block-validator.js';
import { ModuleValidator } from './module-validator.js';
import { ISerializedErrors } from './interfaces/serialized-errors.interface.js';
import { ToolValidator } from './tool-validator.js';
import { SchemaValidator } from './schema-validator.js';
import { GetBlockAbout } from '../blocks/index.js';

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
    private readonly schemas: Map<string, SchemaValidator>;
    /**
     * Schemas by entity
     * @private
     */
    private readonly schemasByEntity: Map<string, SchemaValidator>;
    /**
     * Is Dry Run Mode
     * @private
     */
    private readonly isDryRunMode: boolean;
    /**
     * Ignore Rules
     * @private
     */
    private readonly ignoreRules?: ReadonlyArray<IgnoreRule>;
    /**
     * Is Dry Run Mode
     * @private
     */
    private readonly reachability: boolean;

    constructor(
        policy: Policy,
        isDruRun: boolean = false,
        ignoreRules?: ReadonlyArray<IgnoreRule>,
        reachability?: boolean
    ) {
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
        this.schemasByEntity = new Map();
        this.isDryRunMode = isDruRun;
        this.ignoreRules = ignoreRules;
        this.reachability = !!reachability;
    }

    /**
     * Is Dry Run
     */
    public get isDryRun(): boolean {
        return this.isDryRunMode;
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

            const reachabilityPerBlock = this.getReachability();

            for (const block of this.blocks.values()) {
                const blockId = block.getId();
                const blockType = block.getBlockType();

                const raw = block.getRawConfig?.();
                const usedProps = (raw ?? {}) as unknown as Record<string, unknown>;

                const { warningsText, infosText } = buildMessagesForValidator(
                    blockType,
                    usedProps,
                    this.ignoreRules,
                    reachabilityPerBlock,
                    blockId
                );

                block.addPrecomputedMessagesAsText(warningsText, 'warning');
                block.addPrecomputedMessagesAsText(infosText, 'info');
            }

            await this.registerSchemas();
            return true;
        }
    }

    private getReachability() {
        if (this.reachability) {
            const ctx = {
                sources: Array.from(this.blocks.values()),
                blockAboutRegistry: GetBlockAbout()
            };
            const reachabilityPerBlock = computeReachability(ctx);
            return reachabilityPerBlock;
        } else {
            return undefined;
        }
    }

    /**
     * Register schemas
     */
    private async registerSchemas(): Promise<void> {
        this.schemas.set('#GeoJSON', SchemaValidator.fromSystem('#GeoJSON'));
        this.schemas.set('#SentinelHUB', SchemaValidator.fromSystem('#SentinelHUB'));
        const schemas = await DatabaseServer.getSchemas({ topicId: this.topicId });
        for (const schema of schemas) {
            if (schema.entity) {
                this.schemasByEntity.set(schema.entity, SchemaValidator.fromSchema(schema));
            }

            this.schemas.set(schema.iri, SchemaValidator.fromSchema(schema));
        }
        for (const validator of this.schemas.values()) {
            await validator.load();
        }
    }

    /**
     * Register new block
     * @param block
     * @param parent
     */
    private async registerBlock(block: any, parent?: BlockValidator): Promise<BlockValidator> {
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

        if (parent) {
            validator.setParentId(parent.getId());
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
                status: { $in: [ModuleStatus.PUBLISHED, ModuleStatus.DRY_RUN] },
                messageId: block.messageId,
                hash: block.hash
            });
            await tool.build(policyTool);
            this.tools.set(block.id, tool);
        } else {
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    const v = await this.registerBlock(child, validator);
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
        const allSchemas = this.getAllSchemas(new Map());
        for (const item of this.schemas.values()) {
            await item.validate(allSchemas);
        }
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
        let valid = !this.errors.length;
        const modulesErrors = [];
        const toolsErrors = [];
        const blocksErrors = [];
        const commonErrors = this.errors.slice();

        const commonWarnings: string[] = [];
        const commonInfos: string[] = [];

        /**
         * Schema errors
         */
        for (const item of this.schemas.values()) {
            const result = item.getSerializedErrors();
            for (const error of result.errors) {
                commonErrors.push(error);
            }
            valid = valid && result.isValid;
        }
        /**
         * Modules errors
         */
        for (const item of this.modules.values()) {
            const result = item.getSerializedErrors();
            modulesErrors.push(result);
            valid = valid && result.isValid;
        }
        /**
         * Tools errors
         */
        for (const item of this.tools.values()) {
            const result = item.getSerializedErrors();
            toolsErrors.push(result);
            valid = valid && result.isValid;
        }
        /**
         * Blocks errors
         */
        for (const item of this.blocks.values()) {
            const result = item.getSerializedErrors();
            blocksErrors.push(result);

            if (Array.isArray(result.warnings)) {
                commonWarnings.push(...result.warnings);
            }
            if (Array.isArray(result.infos)) {
                commonInfos.push(...result.infos);
            }

            valid = valid && result.isValid;
        }
        /**
         * Common policy errors
         */
        for (const item of this.errors) {
            blocksErrors.push({
                id: null,
                name: null,
                errors: [item],
                warnings: [],
                infos: [],
                isValid: false
            });
        }
        return {
            errors: commonErrors,
            warnings: commonWarnings,
            infos: commonInfos,
            blocks: blocksErrors,
            modules: modulesErrors,
            tools: toolsErrors,
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
            const validator = this.schemas.get(iri);
            if (validator.isValid) {
                return validator.getSchema();
            } else {
                return null;
            }
        } else {
            for (const item of this.tools.values()) {
                const schema = item.getSchema(iri);
                if (schema) {
                    return schema;
                }
            }
            return null;
        }
    }

    /**
     * Get all schemas
     * @param iri
     */
    public getAllSchemas(map: Map<string, SchemaValidator>): Map<string, SchemaValidator> {
        for (const [key, value] of this.schemas) {
            map.set(key, value);
        }
        for (const tool of this.tools.values()) {
            tool.getAllSchemas(map);
        }
        return map;
    }

    /**
     * Schema exist
     * @param iri
     */
    public schemaExist(iri: string): boolean {
        if (this.schemas.has(iri)) {
            const validator = this.schemas.get(iri);
            return validator.isValid;
        } else {
            for (const item of this.tools.values()) {
                if (item.schemaExist(iri)) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Schema exist by entity
     * @param entity
     */
    public schemaExistByEntity(entity: SchemaEntity): boolean {
        if (this.schemasByEntity.has(entity)) {
            const validator = this.schemasByEntity.get(entity);
            return validator.isValid;
        }

        return false;
    }

    /**
     * Unsupported schema
     * @param iri
     */
    public unsupportedSchema(iri: string): boolean {
        if (this.schemas.has(iri)) {
            const validator = this.schemas.get(iri);
            return !validator.isValid;
        } else {
            for (const item of this.tools.values()) {
                if (item.unsupportedSchema(iri)) {
                    return true;
                }
            }
            return false;
        }
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

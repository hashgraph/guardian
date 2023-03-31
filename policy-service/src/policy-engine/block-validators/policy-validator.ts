import { DatabaseServer } from '@database-modules';
import { Policy } from '@guardian/common';
import { PolicyType } from '@guardian/interfaces';
import { BlockValidator } from './block-validator';
import { ModuleValidator } from './module-validator';
import { ISerializedErrors } from './interfaces/serialized-errors.interface';

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
     * Database instance
     * @private
     */
    private readonly databaseServer: DatabaseServer;
    /**
     * Topic Id
     * @private
     */
    private readonly topicId: string;
    /**
     * DryRun Id
     * @private
     */
    private readonly dryRun: string;
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

    constructor(policy: Policy) {
        this.blocks = new Map();
        this.modules = new Map();
        this.tags = new Map();
        this.errors = [];
        this.permissions = ['NO_ROLE', 'ANY_ROLE', 'OWNER'];
        if (policy.status === PolicyType.DRY_RUN) {
            this.dryRun = policy.id.toString();
        } else {
            this.dryRun = null;
        }
        this.topicId = policy.topicId;
        this.databaseServer = new DatabaseServer(this.dryRun);
        this.policyTokens = policy.policyTokens || [];
        this.policyTopics = policy.policyTopics || [];
        this.policyGroups = policy.policyGroups;
    }

    /**
     * Register new block
     * @param block
     */
    public registerBlock(block: any): BlockValidator {
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
            this.modules.set(block.id, module);
        } else {
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    const v = this.registerBlock(child);
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
    public addPermission(role: string): void {
        this.permissions.push(role);
    }

    /**
     * Clear
     */
    public clear() {
        for (const item of this.modules.values()) {
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
        for (const item of this.modules.values()) {
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
    public async getSchema(iri: string): Promise<any> {
        return await this.databaseServer.getSchemaByIRI(iri, this.topicId);
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
        return await this.databaseServer.getTokenById(tokenId);
    }

    /**
     * Get Topic Template
     * @param topicName
     */
    public getTopicTemplate(topicName: string): any {
        return this.policyTopics.find(e => e.name === topicName);
    }
}

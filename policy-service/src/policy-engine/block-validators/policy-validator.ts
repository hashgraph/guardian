import { DatabaseServer } from "@database-modules";
import { Policy } from "@entity/policy";
import { PolicyType } from "@guardian/interfaces";
import { BlockValidator } from "./block-validator";
import { ISerializedErrors } from "./serialized-errors.interface";

/**
 * Validation results container
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

    constructor(policy: Policy) {
        this.blocks = new Map();
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
            console.log('111', block);
            validator = new BlockValidator(block, this);
            this.errors.push(`UUID not set`);
        }

        if (block.tag) {
            if (this.tags.has(block.tag)) {
                this.tags.set(block.tag, 2);
            } else {
                this.tags.set(block.tag, 1);
            }
        }
        if (Array.isArray(block.children)) {
            for (const child of block.children) {
                const v = this.registerBlock(child);
                validator.addChild(v);
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


    public clear() {
        for (const item of this.blocks.values()) {
            item.clear();
        }
    }

    public async validate() {
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
        console.log('getSchemaByIRI', iri, this.topicId)
        return await this.databaseServer.getSchemaByIRI(iri, this.topicId);
    }

    /**
     * Get Token Template
     * @param templateName
     */
    public getTokenTemplate(templateName: string): Promise<any> {
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
    public getTopicTemplate(topicName: string): Promise<any> {
        return this.policyTopics.find(e => e.name === topicName);
    }







    // /**
    //  * Add block to map if not added
    //  * @param block
    //  */
    // public registerBlock(block: IPolicyBlock): void {
    //     if (!this.blocks.has(block.uuid)) {
    //         this.blocks.set(block.uuid, {
    //             isValid: true,
    //             errors: [],
    //             block
    //         });
    //     }
    // }

    // /**
    //  * Add block error
    //  * @param uuid
    //  * @param error
    //  */
    // public addBlockError(uuid: string, error: string): void {
    //     const block = this.blocks.get(uuid);
    //     block.isValid = false;
    //     block.errors.push(error);
    // }



    // /**
    //  * Add error
    //  * @param error
    //  */
    // public addError(error: string): void {
    //     this.errors.push(error);
    // }

    // /**
    //  * Add tag
    //  * @param tag
    //  */
    // public addTag(tag: string): void {
    //     this.tags.push(tag);
    // }

    // /**
    //  * Is tag exist
    //  * @param tag
    //  */
    // public isTagExist(tag: string): boolean {
    //     return !!this.tags.find(item => item === tag);
    // }

    // /**
    //  * Is permission exist
    //  * @param permission
    //  */
    // public isPermissionExist(permission: string): boolean {
    //     return !!this.permissions.find(item => item === permission);
    // }

    // /**
    //  * Permissions not exist
    //  * @param permissions
    //  */
    // public permissionsNotExist(permissions: string[]): string | null {
    //     if (permissions) {
    //         for (const permission of permissions) {
    //             if (this.permissions.indexOf(permission) === -1) {
    //                 return permission;
    //             }
    //         }
    //     }
    //     return null;
    // }

    // /**
    //  * Count tags
    //  * @param tag
    //  */
    // public countTags(tag: string): number {
    //     return this.tags.filter(t => t === tag).length;
    // }
}

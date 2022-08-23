import { IPolicyBlock } from '@policy-engine/policy-engine.interface';

/**
 * Validated instance
 */
interface IValidatedInstance<T> {
    /**
     * Is valid
     */
    isValid: boolean;
    /**
     * Errors
     */
    errors: string[];
    /**
     * Block
     */
    block: T;
}

/**
 * Instance errors
 */
interface IInstanceErrors {
    /**
     * ID
     */
    id: string,
    /**
     * Name
     */
    name: string,
    /**
     * Errors
     */
    errors: string[],
    /**
     * Is valid
     */
    isValid: boolean
}

/**
 * Serialized errors
 */
export interface ISerializedErrors {
    /**
     * Blocks
     */
    blocks: IInstanceErrors[]
}

/**
 * Validation results container
 */
export class PolicyValidationResultsContainer {
    /**
     * Tags
     * @private
     */
    private readonly tags: string[];
    /**
     * Permissions
     * @private
     */
    private readonly permissions: string[];

    /**
     * Blocks map
     * @private
     */
    private readonly blocks: Map<string, IValidatedInstance<IPolicyBlock>>;

    constructor() {
        this.blocks = new Map();
        this.tags = [];
        this.permissions = ['NO_ROLE', 'ANY_ROLE', 'OWNER'];
    }

    /**
     * Add block to map if not added
     * @param block
     */
    public registerBlock(block: IPolicyBlock): void {
        if (!this.blocks.has(block.uuid)) {
            this.blocks.set(block.uuid, {
                isValid: true,
                errors: [],
                block
            });
        }
    }

    /**
     * Add block error
     * @param uuid
     * @param error
     */
    public addBlockError(uuid: string, error: string): void {
        const block = this.blocks.get(uuid);
        block.isValid = false;
        block.errors.push(error);
    }

    /**
     * Add tag
     * @param tag
     */
    public addTag(tag: string): void {
        this.tags.push(tag);
    }

    /**
     * Add permission
     * @param role
     */
    public addPermission(role: string): void {
        this.permissions.push(role);
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
     * Is tag exist
     * @param tag
     */
    public isTagExist(tag: string): boolean {
        return !!this.tags.find(item => item === tag);
    }

    /**
     * Is permission exist
     * @param permission
     */
    public isPermissionExist(permission: string): boolean {
        return !!this.permissions.find(item => item === permission);
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
     * Count tags
     * @param tag
     */
    public countTags(tag: string): number {
        return this.tags.filter(t => t === tag).length;
    }

    /**
     * Get serialized errors
     */
    public getSerializedErrors(): ISerializedErrors {
        return {
            blocks: [...this.blocks.values()].map(item => {
                return {
                    id: item.block.uuid,
                    name: item.block.blockType,
                    errors: item.errors,
                    isValid: !item.errors.length
                }
            })
        }
    }
}

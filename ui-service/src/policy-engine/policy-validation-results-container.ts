import { IPolicyBlock } from '@policy-engine/policy-engine.interface';

interface IValidatedInstance<T> {
    isValid: boolean;
    errors: string[];
    block: T;
}

interface IInstanceErrors {
    id: string,
    name: string,
    errors: string[],
    isValid: boolean
}

export interface ISerializedErrors {
    blocks: IInstanceErrors[]
}

export class PolicyValidationResultsContainer {
    private tags: string[];
    private permissions: string[];

    private blocks: Map<string, IValidatedInstance<IPolicyBlock>>;
    private schemas: Map<string, any>;

    constructor() {
        this.blocks = new Map();
        this.schemas = new Map();
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
                block: block
            });
        }
    }

    public addBlockError(uuid: string, error: string): void {
        const block = this.blocks.get(uuid);
        block.isValid = false;
        block.errors.push(error);
    }

    public addTag(tag: string): void {
        this.tags.push(tag);
    }

    public addPermission(permission: string): void {
        this.permissions.push(permission);
    }

    public addPermissions(permissions: string[]): void {
        if (permissions) {
            for (let i = 0; i < permissions.length; i++) {
                const permission = permissions[i];
                this.permissions.push(permission);
            }
        }
    }

    public isTagExist(tag: string): boolean {
        return !!this.tags.find(item => item === tag);
    }

    public isPermissionExist(permission: string): boolean {
        return !!this.permissions.find(item => item === permission);
    }

    public permissionsNotExist(permissions: string[]): string | null {
        if (permissions) {
            for (let i = 0; i < permissions.length; i++) {
                const permission = permissions[i];
                if (this.permissions.indexOf(permission) == -1) {
                    return permission;
                }
            }
        }
        return null;
    }

    public countTags(tag: string): number {
        return this.tags.filter(t => t === tag).length;
    }

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

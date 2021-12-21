import {IPolicyBlock} from '@policy-engine/policy-engine.interface';

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

    private blocks: Map<string, IValidatedInstance<IPolicyBlock>>;
    private schemas: Map<string, any>;

    constructor() {
        this.blocks = new Map();
        this.schemas = new Map();
        this.tags = [];
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

    public isTagExist(tag: string): boolean {
        return !!this.tags.find(item => item === tag);
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

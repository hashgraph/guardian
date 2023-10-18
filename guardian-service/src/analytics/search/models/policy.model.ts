import { Policy } from '@guardian/common';
import { BlockType } from '@guardian/interfaces';
import { BlockSearchModel } from './block.model';
import { ChainSearchModel } from './chain.model';

/**
 * Policy model
 */
export class PolicySearchModel {
    /**
     * Policy name
     * @public
     */
    public readonly name: string;

    /**
     * Policy description
     * @public
     */
    public readonly description: string;

    /**
     * Policy version
     * @public
     */
    public readonly version: string;

    /**
     * Policy owner
     * @public
     */
    public readonly owner: string;

    /**
     * Policy topic id
     * @public
     */
    public readonly topicId: string;

    /**
     * Policy message id
     * @public
     */
    public readonly messageId: string;

    /**
     * Root
     * @private
     */
    private readonly _tree: BlockSearchModel;

    /**
     * All Blocks
     * @private
     */
    private readonly _list: BlockSearchModel[];

    constructor(policy: Policy) {
        if (!policy.config) {
            throw new Error('Empty policy model');
        }

        this.name = policy.name;
        this.description = policy.description;
        this.version = policy.version;
        this.owner = policy.owner;
        this.topicId = policy.topicId;
        this.messageId = policy.messageId;

        this._tree = this.createBlockModel(policy.config);
        this._list = this.getAllBlocks(this._tree, []);
        for (const block of this._list) {
            block.update();
        }
    }

    /**
     * Create Block by JSON
     * @param json
     * @param index
     * @private
     */
    private createBlockModel(json: any): BlockSearchModel {
        if (json.blockType === BlockType.Tool) {
            return new BlockSearchModel(json);
        } else {
            const block = new BlockSearchModel(json);
            if (Array.isArray(json.children)) {
                for (let i = 0; i < json.children.length; i++) {
                    const childJSON = json.children[i];
                    const child = this.createBlockModel(childJSON);
                    block.addChildren(child);
                }
            }
            return block;
        }
    }

    /**
     * Convert tree to array
     * @param root
     * @param list - result
     * @private
     */
    private getAllBlocks(
        root: BlockSearchModel,
        list: BlockSearchModel[]
    ): BlockSearchModel[] {
        list.push(root)
        for (const child of root.children) {
            this.getAllBlocks(child, list);
        }
        return list;
    }

    /**
     * Filter blocks by type
     * @param type
     * @private
     */
    public filter(type: BlockType): BlockSearchModel[] {
        return this._list.filter(block => block.type === type);
    }

    /**
     * Find blocks by uuid
     * @param type
     * @private
     */
    public findBlock(blockId: string): BlockSearchModel {
        return this._list.find(block => block.id === blockId);
    }

    /**
     * Find chain
     * @param filterBlock
     * @public
     */
    public search(filterBlock: BlockSearchModel): ChainSearchModel[] {
        const list = this.filter(filterBlock.type);
        const chains: ChainSearchModel[] = [];
        for (const block of list) {
            const chain = block.find(filterBlock);
            chain.update();
            chains.push(chain);
        }
        return chains.sort((a, b) => a.hash > b.hash ? -1 : 1);
    }

    /**
     * Create model from config
     * @param config
     * @public
     * @static
     */
    public static fromConfig(config: any): PolicySearchModel {
        return new PolicySearchModel({ config } as any);
    }
}
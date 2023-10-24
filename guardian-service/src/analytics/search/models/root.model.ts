import { Policy, PolicyTool, PolicyModule } from '@guardian/common';
import { BlockType } from '@guardian/interfaces';
import { BlockSearchModel } from './block.model';
import { ChainSearchModel } from './chain.model';

/**
 * Root model
 */
export class RootSearchModel {
    /**
     * Root name
     * @public
     */
    public readonly name: string;

    /**
     * Root description
     * @public
     */
    public readonly description: string;

    /**
     * Root owner
     * @public
     */
    public readonly owner: string;

    /**
     * Root topic id
     * @public
     */
    public readonly topicId: string;

    /**
     * Root message id
     * @public
     */
    public readonly messageId: string;

    /**
     * Root
     * @private
     */
    private _tree: BlockSearchModel;

    /**
     * All Blocks
     * @private
     */
    private _list: BlockSearchModel[];

    constructor(root?: Policy | PolicyTool | PolicyModule) {
        if (root) {
            this.name = root.name;
            this.description = root.description;
            this.owner = root.owner;
            this.topicId = root.topicId;
            this.messageId = root.messageId;
        }
    }

    /**
     * Init config
     * @param config
     * @protected
     */
    protected init(config: any): RootSearchModel {
        this._tree = this.createBlockModel(config, true);
        this._list = this.getAllBlocks(this._tree, []);
        for (const block of this._list) {
            block.update();
        }
        return this;
    }

    /**
     * Create Block by JSON
     * @param json
     * @param index
     * @private
     */
    private createBlockModel(json: any, isRoot: boolean = false): BlockSearchModel {
        if (json.blockType === BlockType.Tool && !isRoot) {
            return new BlockSearchModel(json);
        } else {
            const block = new BlockSearchModel(json);
            if (Array.isArray(json.children)) {
                for (const childJSON of json.children) {
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
    public static fromConfig(config: any): RootSearchModel {
        if (!config) {
            throw new Error('Empty config');
        }
        const root = new RootSearchModel();
        return root.init(config);
    }
}
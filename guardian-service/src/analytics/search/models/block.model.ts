import { BlockType } from '@guardian/interfaces';
import { ChainSearchModel } from './chain.model';
import { ArtifactModel, BlockPropertiesModel, EventModel, PropertyModel } from '../../compare';

export interface BlockSearchJson {
    /**
     * Block id
     */
    id: string;
    /**
     * Block tag
     */
    tag: string;
    /**
     * Block type
     */
    blockType: string;
    /**
     * Block path
     */
    path: number[];
    /**
     * Block config
     */
    config: any;
}

/**
 * Block model
 */
export class BlockSearchModel {
    /**
     * Block type
     * @public
     */
    public readonly type: BlockType;

    /**
     * Block id
     * @public
     */
    public readonly id: string;

    /**
     * Block tag
     * @public
     */
    public readonly tag: string;

    /**
     * Children
     * @private
     */
    private readonly _children: BlockSearchModel[];

    /**
     * Parent block
     * @private
     */
    private _parent: BlockSearchModel | null;

    /**
     * Next block
     * @private
     */
    private _next: BlockSearchModel | null;

    /**
     * Prev block
     * @private
     */
    private _prev: BlockSearchModel | null;

    /**
     * Block path
     * @private
     */
    private _path: number[];

    /**
     * Properties
     * @private
     */
    private readonly _prop: BlockPropertiesModel;

    /**
     * Events
     * @private
     */
    private readonly _events: EventModel[];

    /**
     * Artifacts
     * @private
     */
    private readonly _artifacts: ArtifactModel[];

    /**
     * Block config
     * @private
     */
    private readonly _config: any;

    /**
     * Children
     * @public
     */
    public get children(): BlockSearchModel[] {
        return this._children;
    }

    /**
     * Parent block
     * @public
     */
    public get parent(): BlockSearchModel | null {
        return this._parent;
    }

    /**
     * Next block
     * @public
     */
    public get next(): BlockSearchModel | null {
        return this._next;
    }

    /**
     * Prev block
     * @public
     */
    public get prev(): BlockSearchModel | null {
        return this._prev;
    }

    constructor(json: any) {
        this.id = json.id;
        this.tag = json.tag;
        this.type = json.blockType;

        this._children = [];
        this._parent = null;
        this._next = null;
        this._prev = null;
        this._path = [0];
        this._prop = new BlockPropertiesModel(json);
        if (Array.isArray(json.events)) {
            this._events = json.events.map((e: any) => new EventModel(e));
        } else {
            this._events = [];
        }
        if (Array.isArray(json.artifacts)) {
            this._artifacts = json.artifacts.map((e: any) => new ArtifactModel(e));
        } else {
            this._artifacts = [];
        }
        this._config = { ...json, children: undefined };
    }

    /**
     * Add child
     * @param child
     * @public
     */
    public addChildren(child: BlockSearchModel): void {
        const lastIndex = this._children.length - 1;
        const prev = this._children[lastIndex];
        this._children.push(child);
        child._parent = this;
        if (prev) {
            prev._setNext(child);
        }
    }

    /**
     * Find chain
     * @param filterBlock
     * @public
     */
    public find(filterBlock: BlockSearchModel): ChainSearchModel {
        const result: ChainSearchModel = new ChainSearchModel();
        if (this.type === filterBlock.type) {
            result.addPair(this, filterBlock);
            this._findParent(this.parent, filterBlock.parent, result);
            this._findPrev(this.prev, filterBlock.prev, result);
            this._findNext(this.next, filterBlock.next, result);
            this._findChildren(this.children, filterBlock.children, result);
        }
        return result;
    }

    /**
     * Update
     * @public
     */
    public update(): void {
        if (this._parent) {
            const index = this._parent._children.indexOf(this);
            this._path = [...this._parent._path, index];
        } else {
            this._path = [0];
        }
    }

    /**
     * Get properties
     * @public
     */
    public getPropList(): PropertyModel<any>[] {
        return this._prop.getPropList();
    }

    /**
     * Get events
     * @public
     */
    public getEventList(): EventModel[] {
        return this._events;
    }

    /**
     * Get permissions
     * @public
     */
    public getPermissionsList(): string[] {
        return this._prop.getPermissionsList();
    }

    /**
     * Get artifacts
     * @public
     */
    public getArtifactsList(): ArtifactModel[] {
        return this._artifacts;
    }

    /**
     * Set next
     * @param child
     * @private
     */
    private _setNext(next: BlockSearchModel): void {
        this._next = next;
        next._prev = this;
    }

    /**
     * Find chain
     * @param block
     * @private
     */
    private _findParent(
        thisBlock: BlockSearchModel,
        filterBlock: BlockSearchModel,
        result: ChainSearchModel
    ): ChainSearchModel {
        if (thisBlock && filterBlock && thisBlock.type === filterBlock.type) {
            result.addPair(thisBlock, filterBlock);
            this._findParent(thisBlock.parent, filterBlock.parent, result);
        }
        return result;
    }

    /**
     * Find chain
     * @param block
     * @private
     */
    private _findPrev(
        thisBlock: BlockSearchModel,
        filterBlock: BlockSearchModel,
        result: ChainSearchModel
    ): ChainSearchModel {
        if (thisBlock && filterBlock && thisBlock.type === filterBlock.type) {
            result.addPair(thisBlock, filterBlock);
            this._findPrev(thisBlock.prev, filterBlock.prev, result);
        }
        return result;
    }

    /**
     * Find chain
     * @param block
     * @private
     */
    private _findNext(
        thisBlock: BlockSearchModel,
        filterBlock: BlockSearchModel,
        result: ChainSearchModel
    ): ChainSearchModel {
        if (thisBlock && filterBlock && thisBlock.type === filterBlock.type) {
            result.addPair(thisBlock, filterBlock);
            this._findNext(thisBlock.next, filterBlock.next, result);
        }
        return result;
    }

    /**
     * Find chain
     * @param block
     * @private
     */
    private _findChildren(
        thisBlocks: BlockSearchModel[],
        filterBlocks: BlockSearchModel[],
        result: ChainSearchModel
    ): ChainSearchModel {
        const length = Math.min(thisBlocks.length, filterBlocks.length);
        for (let i = 0; i < length; i++) {
            const thisBlock = thisBlocks[i];
            const filterBlock = filterBlocks[i];
            if (thisBlock && filterBlock && thisBlock.type === filterBlock.type) {
                result.addPair(thisBlock, filterBlock);
                this._findChildren(thisBlock.children, filterBlock.children, result);
            } else {
                return result;
            }
        }
        return result;
    }

    /**
     * To JSON
     * @public
     */
    public toJson(): BlockSearchJson {
        return {
            id: this.id,
            tag: this.tag,
            blockType: this.type,
            config: this._config,
            path: [...this._path]
        }
    }
}
import { BlockModel } from './block.model';

/**
 * Block Tool Model
 * @extends BlockModel
 */
export class BlockToolModel extends BlockModel {
    /**
     * Block type
     * @public
     */
    public readonly hash: string;

    /**
     * Block type
     * @public
     */
    public readonly messageId: string;

    /**
     * Model key
     * @private
     */
    private readonly _key: string;

    constructor(json: any, index: number) {
        super(json, index);
        this.hash = json.hash;
        this.messageId = json.messageId;
        this._key = `${this.blockType}:${json.hash}`;
    }

    /**
     * Children
     * @public
     */
    public override get children(): BlockModel[] {
        return [];
    }

    /**
     * Model key
     * @public
     */
    public override get key(): string {
        return this._key;
    }
}
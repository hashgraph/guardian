import { BlockSearchJson, BlockSearchModel } from './block.model';

export interface PairSearchJson {
    /**
     * Hash
     */
    hash: number,
    /**
     * Source block
     */
    source: BlockSearchJson,
    /**
     * Filter block
     */
    filter: BlockSearchJson,
}

/**
 * Pair model
 */
export class PairSearchModel {
    /**
     * Source block
     * @public
     */
    public readonly source: BlockSearchModel;

    /**
     * Filter block
     * @public
     */
    public readonly filter: BlockSearchModel;

    /**
     * Hash
     * @private
     */
    private _hash: number;

    /**
     * Hash
     * @public
     */
    public get hash(): number {
        return this._hash;
    }

    constructor(source: BlockSearchModel, filter: BlockSearchModel) {
        this._hash = 0;
        this.source = source;
        this.filter = filter;
    }

    /**
     * Update hash
     * @public
     */
    public update(): void {
        this._hash = 0;
    }

    /**
     * To JSON
     * @public
     */
    public toJson(): PairSearchJson {
        return {
            hash: this._hash,
            source: this.source.toJson(),
            filter: this.filter.toJson(),
        }
    }
}

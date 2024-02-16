import { SearchUtils } from '../utils/utils';
import { BlockSearchModel } from './block.model';
import { PairSearchModel } from './pair.model';

/**
 * Chain model
 */
export class ChainSearchModel {
    /**
     * Pairs
     * @private
     */
    private readonly _pairs: PairSearchModel[];

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

    constructor() {
        this._hash = 0;
        this._pairs = [];
    }

    /**
     * Add pair
     * @param source
     * @param filter
     * @public
     */
    public addPair(
        source: BlockSearchModel,
        filter: BlockSearchModel
    ): ChainSearchModel {
        const pair = new PairSearchModel(source, filter);
        this._pairs.push(pair);
        return this;
    }

    /**
     * Update hash
     * @public
     */
    public update(): void {
        this._hash = this._pairs.length * 1000;
        if (this._pairs.length) {
            let rate = 0;
            for (const pair of this._pairs) {
                pair.update();
                rate += pair.hash;
            }
            rate /= this._pairs.length;
            this._hash += rate;
        }
        this._hash = Math.round(this._hash);
    }

    /**
     * To JSON
     * @public
     */
    public toJson(): any {
        const pairs = this._pairs.map(item => item.toJson());
        const target = pairs[0].source;
        pairs.sort((a, b) => SearchUtils.comparePath(a.source.path, b.source.path));
        return {
            hash: this._hash,
            target,
            pairs
        }
    }
}

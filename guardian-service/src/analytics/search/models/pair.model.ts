import {
    ArtifactsRate,
    CompareUtils,
    EventsRate,
    IRate,
    PermissionsRate,
    PropertiesRate,
    RateKeyMap,
    RateMap
} from '../../compare';
import { SearchUtils } from '../utils/utils';
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

    /**
     * Compare options
     * @private
     */
    private readonly _options = {
        idLvl: 1,
        eventLvl: 2,
        childLvl: 1,
        propLvl: 2
    }

    constructor(source: BlockSearchModel, filter: BlockSearchModel) {
        this._hash = 0;
        this.source = source;
        this.filter = filter;
    }

    /**
     * Compare properties
     * @param source
     * @param filter
     * @private
     */
    private compareProperties(source: BlockSearchModel, filter: BlockSearchModel): number {
        const map = new RateKeyMap<any>();
        for (const item of source.getPropList()) {
            map.addLeft(item.path, item);
        }
        for (const item of filter.getPropList()) {
            map.addRight(item.path, item);
        }
        const list = map.getList();

        const rates: IRate<any>[] = [];
        for (const item of list) {
            const rate = new PropertiesRate(item.left, item.right);
            rate.calc(this._options);
            const subRates = rate.getSubRate();

            rates.push(rate);
            for (const subRate of subRates) {
                rates.push(subRate);
            }
        }

        return CompareUtils.calcRate(rates);
    }

    /**
     * Compare properties
     * @param source
     * @param filter
     * @private
     */
    private compareEvents(source: BlockSearchModel, filter: BlockSearchModel): number {
        const map = new RateMap<any>();
        for (const item of source.getEventList()) {
            map.addLeft(item);
        }
        for (const item of filter.getEventList()) {
            map.addRight(item);
        }
        const list = map.getList();

        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new EventsRate(item.left, item.right));
        }

        return CompareUtils.calcRate(rates);
    }

    /**
     * Compare properties
     * @param source
     * @param filter
     * @private
     */
    private comparePermissions(source: BlockSearchModel, filter: BlockSearchModel): number {
        const map = new RateMap<any>();
        for (const item of source.getPermissionsList()) {
            map.addLeft(item);
        }
        for (const item of filter.getPermissionsList()) {
            map.addRight(item);
        }
        const list = map.getList();

        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new PermissionsRate(item.left, item.right));
        }

        return CompareUtils.calcRate(rates);
    }

    /**
     * Compare properties
     * @param source
     * @param filter
     * @private
     */
    private compareArtifacts(source: BlockSearchModel, filter: BlockSearchModel): number {
        const map = new RateMap<any>();
        for (const item of source.getArtifactsList()) {
            map.addLeft(item);
        }
        for (const item of filter.getArtifactsList()) {
            map.addRight(item);
        }
        const list = map.getList();

        const rates: IRate<any>[] = [];
        for (const item of list) {
            rates.push(new ArtifactsRate(item.left, item.right));
        }

        return CompareUtils.calcRate(rates);
    }

    /**
     * Update hash
     * @public
     */
    public update(): void {
        this._hash = 0;

        const propertiesRate = this.compareProperties(this.source, this.filter);
        const eventsRate = this.compareEvents(this.source, this.filter);
        const permissionsRate = this.comparePermissions(this.source, this.filter);
        const artifactsRate = this.compareArtifacts(this.source, this.filter);

        const rates: number[] = [
            propertiesRate,
            eventsRate,
            artifactsRate,
            permissionsRate,
        ];
        const k: number[] = [4, 3, 2, 1];
        this._hash = SearchUtils.calcTotalRates(rates, k);
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

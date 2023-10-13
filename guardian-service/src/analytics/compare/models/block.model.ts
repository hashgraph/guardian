import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { EventModel } from './event.model';
import { BlockPropertiesModel } from './block-properties.model';
import { WeightType } from '../types/weight.type';
import { ArtifactModel } from './artifact.model';
import { IArtifacts } from '../interfaces/artifacts.interface';
import { SchemaModel } from './schema.model';
import { PropertyModel } from './property.model';
import { PropertyType } from '../types/property.type';
import { IKeyMap } from '../interfaces/key-map.interface';
import { TokenModel } from './token.model';
import { IWeightModel } from '../interfaces/weight-model.interface';
import { CompareUtils } from '../utils/utils';
import { IWeightBlock } from '../interfaces/weight-block.interface';

/**
 * Block Model
 * @extends IWeightModel
 */
export class BlockModel implements IWeightModel {
    /**
     * Block index
     * @public
     */
    public readonly index: number;

    /**
     * Block type
     * @public
     */
    public readonly blockType: string;

    /**
     * Tag
     * @public
     */
    public readonly tag: string;

    /**
     * Children
     * @public
     */
    public get children(): BlockModel[] {
        return this._children;
    }

    /**
     * Model key
     * @public
     */
    public get key(): string {
        return this.blockType;
    }

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
     * Children
     * @private
     */
    private readonly _children: BlockModel[];

    /**
     * Weights
     * @private
     */
    private _weight: string[];

    /**
     * Weights map by name
     * @private
     */
    private _weightMap: IKeyMap<string>;

    /**
     * Hash
     * @private
     */
    private _hash: string;

    constructor(json: any, index: number) {
        this.blockType = json.blockType;
        this.tag = json.tag;
        this.index = index;
        this._prop = new BlockPropertiesModel(json);
        this._events = this.createEvents(json);
        this._artifacts = this.createArtifacts(json);
        this._children = [];
        this._weight = [];
        this._weightMap = {};
        this._hash = '';
    }

    /**
     * Create Events by JSON
     * @param json
     * @private
     */
    private createEvents(json: any): EventModel[] {
        if (Array.isArray(json.events)) {
            return json.events.map((e: any) => new EventModel(e));
        }
        return [];
    }

    /**
     * Create Artifacts by JSON
     * @param json
     * @private
     */
    private createArtifacts(json: any): ArtifactModel[] {
        if (Array.isArray(json.artifacts)) {
            return json.artifacts.map((e: any) => new ArtifactModel(e));
        }
        return [];
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: ICompareOptions): void {
        const weights = [];
        const weightMap = {};

        let _hashState: any;
        let _children = '0';
        let _children1 = '0';
        let _children2 = '0';
        let _tag = '0';
        let _prop = '0';
        let _hash = '0';

        if (this._children) {
            _hashState = MurmurHash3();
            _hashState.hash(this.key);
            for (const child of this._children) {
                _hashState.hash(String(child._hash));
            }
            _hash = String(_hashState.result());
        }

        if (this._children && this._children.length) {
            _hashState = MurmurHash3();
            _hashState.hash(this.key);
            for (const child of this._children) {
                _hashState.hash(child.key);
            }
            _children1 = String(_hashState.result());

            _hashState = MurmurHash3();
            _hashState.hash(this.key);
            for (const child of this._children) {
                _hashState.hash(child.getWeight(WeightType.CHILD_LVL_2));
            }
            _children2 = String(_hashState.result());

            if (options.childLvl > 1) {
                _children = _children2;
            } else if (options.childLvl > 0) {
                _children = _children1;
            } else {
                _children = '0';
            }
        }

        if (this._prop) {
            _hashState = MurmurHash3();
            _hashState.hash(this.key)
            _hashState.hash(this._prop.hash(options));
            _prop = String(_hashState.result());
        }

        if (this.tag) {
            _hashState = MurmurHash3();
            _hashState.hash(this.key)
            _hashState.hash(this.tag);
            _tag = String(_hashState.result());
        }

        /*
        - children
        - tag
        - prop
        - tag + children
        - prop + children
        - tag + prop
        - tag + prop + children
        */
        weightMap[WeightType.CHILD_LVL_2] = _children2;
        if (options.childLvl > 0) {
            weightMap[WeightType.CHILD_LVL_1] = _children;
            weights.push(weightMap[WeightType.CHILD_LVL_1]);
        }
        if (options.propLvl > 0) {
            weightMap[WeightType.PROP_LVL_1] = _tag;
            weights.push(weightMap[WeightType.PROP_LVL_1]);
        }
        if (options.propLvl > 0) {
            weightMap[WeightType.PROP_LVL_2] = _prop;
            weights.push(weightMap[WeightType.PROP_LVL_2]);
        }
        if (options.propLvl > 0 && options.childLvl > 0) {
            weightMap[WeightType.PROP_AND_CHILD_1] = CompareUtils.aggregateHash(_tag, _children);
            weights.push(weightMap[WeightType.PROP_AND_CHILD_1]);
        }
        if (options.propLvl > 0 && options.childLvl > 0) {
            weightMap[WeightType.PROP_AND_CHILD_2] = CompareUtils.aggregateHash(_prop, _children);
            weights.push(weightMap[WeightType.PROP_AND_CHILD_2]);
        }
        if (options.propLvl > 0) {
            weightMap[WeightType.PROP_LVL_3] = CompareUtils.aggregateHash(_tag, _prop);
            weights.push(weightMap[WeightType.PROP_LVL_3]);
        }
        if (options.propLvl > 0 && options.childLvl > 0) {
            weightMap[WeightType.PROP_AND_CHILD_3] = CompareUtils.aggregateHash(_tag, _prop, _children);
            weights.push(weightMap[WeightType.PROP_AND_CHILD_3]);
        }

        if (options.propLvl > 0) {
            this._hash = CompareUtils.aggregateHash(_hash, _tag, _prop);
        } else {
            this._hash = CompareUtils.aggregateHash(_hash, _tag);
        }

        this._weightMap = weightMap;
        this._weight = weights.reverse();
    }

    /**
     * Update event weights
     * @param map - blocks map
     * @param options - comparison options
     * @public
     */
    public updateEvents(map: IKeyMap<BlockModel>, options: ICompareOptions) {
        for (const event of this._events) {
            event.update(map, options);
        }
    }

    /**
     * Update artifact weights
     * @param map - artifacts
     * @param options - comparison options
     * @public
     */
    public updateArtifacts(artifacts: IArtifacts[], options: ICompareOptions) {
        for (const artifact of this._artifacts) {
            const row = artifacts.find(e => e.uuid === artifact.uuid);
            if (row && row.data) {
                artifact.update(row.data, options);
            } else {
                artifact.update('', options);
            }
        }
    }

    /**
     * Update schema weights
     * @param schemaMap - schemas map
     * @param options - comparison options
     * @public
     */
    public updateSchemas(schemaMap: IKeyMap<SchemaModel>, options: ICompareOptions): void {
        this._prop.updateSchemas(schemaMap, options);
    }

    /**
     * Update token weights
     * @param tokenMap - tokens map
     * @param options - comparison options
     * @public
     */
    public updateTokens(tokenMap: IKeyMap<TokenModel>, options: ICompareOptions): void {
        this._prop.updateTokens(tokenMap, options);
    }

    /**
     * Get weight by name
     * @param type - weight name
     * @public
     */
    public getWeight(type?: WeightType): string {
        if (type) {
            return this._weightMap[type];
        } else {
            return this._weight[0];
        }
    }

    /**
     * Get all weight
     * @public
     */
    public getWeights(): string[] {
        return this._weight;
    }

    /**
     * Get weight number
     * @public
     */
    public maxWeight(): number {
        return this._weight ? this._weight.length : 0;
    }

    /**
     * Check weight by number
     * @param index - weight index
     * @public
     */
    public checkWeight(index: number): boolean {
        return index < this._weight.length;
    }

    /**
     * Comparison of models using weight
     * @param item - model
     * @param index - weight index
     * @public
     */
    public equal(block: BlockModel, index?: number): boolean {
        if (this.key !== block.key) {
            return false;
        }
        if (!this._weight.length) {
            return this.key === block.key;
        }
        if (Number.isFinite(index)) {
            if (this._weight[index] === '0' && block._weight[index] === '0') {
                return false;
            } else {
                return this._weight[index] === block._weight[index];
            }
        } else {
            return this._hash === block._hash;
        }
    }

    /**
     * Comparison of models using key
     * @param item - model
     * @public
     */
    public equalKey(item: BlockModel): boolean {
        return this.key === item.key;
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        const properties = this._prop.getPropList();
        const events = this._events.map(e => e.toObject());
        return {
            index: this.index,
            blockType: this.blockType,
            tag: this.tag,
            properties,
            events
        }
    }

    /**
     * Get properties
     * @param type - filter by property type
     * @public
     */
    public getPropList(type?: PropertyType): PropertyModel<any>[] {
        return this._prop.getPropList(type);
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
     * Add child
     * @param child
     * @public
     */
    public addChildren(child: BlockModel): void {
        this._children.push(child);
    }

    /**
     * Get weight object
     * @public
     */
    public toWeight(options: ICompareOptions): IWeightBlock {
        const children: IWeightBlock[] = [];
        let length = 0;
        for (const child of this._children) {
            const w = child.toWeight(options);
            length = length + w.length + 1;
            children.push(w);
        }
        const _index = String(this.index);
        const _prop = this._weightMap[WeightType.PROP_LVL_3];
        const _type = this.key;

        let _fullProp = '|';
        for (const event of this._events) {
            const w = event.toWeight(options);
            _fullProp += w.weight;
        }
        _fullProp += '|';
        for (const artifact of this._artifacts) {
            const w = artifact.toWeight(options);
            _fullProp += w.weight;
        }
        _fullProp += '|';
        for (const permission of this._prop.getPermissionsList()) {
            _fullProp += permission;
        }
        let _children = '';
        for (const child of children) {
            _children += child.weights[0];
        }
        const weights = [
            CompareUtils.sha256(_type + _prop + _fullProp + _children + _index),
            CompareUtils.sha256(_type + _prop + _fullProp + _children),
            CompareUtils.sha256(_type + _prop + _fullProp),
            CompareUtils.sha256(_type + _prop),
            CompareUtils.sha256(_type)
        ];
        return {
            weights,
            children,
            length
        }
    }
}

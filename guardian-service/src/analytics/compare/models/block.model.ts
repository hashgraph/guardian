import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { EventModel } from './event.model';
import { BlockPropertiesModel } from './block-properties-model';
import { WeightType } from '../types/weight.type';
import { ArtifactModel } from './artifact.model';
import { IArtifacts } from '../interfaces/artifacts.interface';
import { SchemaModel } from './schema.model';
import { PropertyModel } from './property.model';
import { PropertyType } from '../types/property.type';
import { IKeyMap } from '../interfaces/key-map.interface';
import { TokenModel } from './token.model';
import { IWeightModel } from '../interfaces/weight-model.interface';

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

        let hashState: any;

        if (options.childLvl > 0) {
            if (this._children.length) {
                //children
                hashState = MurmurHash3();
                hashState.hash(this.blockType);
                for (const child of this._children) {
                    hashState.hash(child.blockType);
                }
                const weight = String(hashState.result());
                weights.push(weight);
                weightMap[WeightType.CHILD_LVL_1] = weight;
            } else {
                weights.push('0');
                weightMap[WeightType.CHILD_LVL_1] = '0';
            }
        }

        if (options.propLvl > 0) {
            //prop
            hashState = MurmurHash3();
            hashState.hash(this.blockType + this.tag);
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.PROP_LVL_1] = weight;
        }

        if (options.childLvl > 1) {
            if (this._children.length) {
                //all children
                hashState = MurmurHash3();
                hashState.hash(this.blockType);
                for (const child of this._children) {
                    hashState.hash(child.getWeight(WeightType.CHILD_LVL_2));
                }
                const weight = String(hashState.result());
                weights.push(weight);
                weightMap[WeightType.CHILD_LVL_2] = weight;
            } else {
                weights.push('0');
                weightMap[WeightType.CHILD_LVL_2] = '0';
            }
        }

        if (options.propLvl > 1) {
            //prop
            hashState = MurmurHash3();
            hashState.hash(this.blockType + this._prop.hash(options));
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.PROP_LVL_2] = weight;
        }

        if (options.propLvl > 0 && options.childLvl > 0) {
            //prop + all children
            hashState = MurmurHash3();
            hashState.hash(this.blockType + this._prop.hash(options));
            if (options.childLvl > 1) {
                for (const child of this._children) {
                    hashState.hash(child.getWeight(WeightType.PROP_AND_CHILD));
                }
            } else {
                for (const child of this._children) {
                    hashState.hash(child._prop.hash(options));
                }
            }
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.PROP_AND_CHILD] = weight;
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
        if (this.blockType !== block.blockType) {
            return false;
        }
        if (!this._weight.length) {
            return this.blockType === block.blockType;
        }
        if (index) {
            if (this._weight[index] === '0' && block._weight[index] === '0') {
                return false;
            } else {
                return this._weight[index] === block._weight[index];
            }
        } else {
            return this._weight[0] === block._weight[0];
        }
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
}

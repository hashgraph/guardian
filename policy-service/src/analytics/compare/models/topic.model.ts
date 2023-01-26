import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IKeyMap } from '../interfaces/key-map.interface';
import { IWeightModel } from '../interfaces/weight-model.interface';
import { PropertyType } from '../types/property.type';
import { WeightType } from '../types/weight.type';
import { PropertiesModel } from './properties.model';
import { PropertyModel } from './property.model';

/**
 * Topic Model
 * @extends IWeightModel
 */
export class TopicModel implements IWeightModel {
    /**
     * Model name
     * @public
     */
    public readonly name: any;

    /**
     * Model key
     * @public
     */
    public get key(): string {
        return this.name;
    }

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
     * Properties
     * @private
     */
    private readonly _prop: PropertiesModel;

    constructor(json: any) {
        this.name = json.name;
        this._prop = new PropertiesModel(json);
        this._weight = [];
        this._weightMap = {};
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
        let weight: string;

        hashState = MurmurHash3();
        hashState.hash(this.name);
        weight = String(hashState.result());
        weights.push(weight);
        weightMap[WeightType.TOPIC_LVL_0] = weight;

        hashState = MurmurHash3();
        hashState.hash(this.name);
        hashState.hash(this._prop.hash(options));
        weight = String(hashState.result());
        weights.push(weight);
        weightMap[WeightType.TOPIC_LVL_1] = weight;

        this._weightMap = weightMap;
        this._weight = weights.reverse();
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        const properties = this._prop.getPropList();
        return {
            name: this.name,
            properties
        }
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
    public equal(field: TopicModel, index?: number): boolean {
        if (!this._weight.length) {
            return this.name === field.name;
        }
        if (index) {
            if (this._weight[index] === '0' && field._weight[index] === '0') {
                return false;
            } else {
                return this._weight[index] === field._weight[index];
            }
        } else {
            return this._weight[0] === field._weight[0];
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
}

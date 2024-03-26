import MurmurHash3 from 'imurmurhash';
import { CompareOptions } from '../interfaces/compare-options.interface.js';
import { IKeyMap } from '../interfaces/key-map.interface.js';
import { IWeightModel } from '../interfaces/weight-model.interface.js';
import { PropertyType } from '../types/property.type.js';
import { WeightType } from '../types/weight.type.js';
import { AnyPropertyModel, PropertyModel } from './property.model.js';
import { IWeightItem } from '../interfaces/weight-item.interface.js';

/**
 * Role Model
 * @extends IWeightModel
 */
export class RoleModel implements IWeightModel {
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
    private readonly _prop: AnyPropertyModel;

    constructor(json: string) {
        this.name = json;
        this._weight = [];
        this._weightMap = {};
        this._prop = new AnyPropertyModel('name', this.name);
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: CompareOptions): void {
        const weights = [];
        const weightMap = {};

        let hashState: any;
        let weight: string;

        hashState = MurmurHash3();
        hashState.hash(this.name);
        weight = String(hashState.result());
        weights.push(weight);
        weightMap[WeightType.ROLE_LVL_0] = weight;

        this._weightMap = weightMap;
        this._weight = weights.reverse();
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        const properties = [this._prop];
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
    public equal(field: RoleModel, index?: number): boolean {
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
     * Comparison of models using key
     * @param item - model
     * @public
     */
    public equalKey(item: RoleModel): boolean {
        return this.key === item.key;
    }

    /**
     * Get properties
     * @param type - filter by property type
     * @public
     */
    public getPropList(type?: PropertyType): PropertyModel<any>[] {
        return [this._prop];
    }

    /**
     * Get weight object
     * @public
     */
    public toWeight(options: CompareOptions): IWeightItem {
        if (!this._weight.length) {
            return {
                weight: this.name
            }
        } else {
            return {
                weight: this._weight[0]
            }
        }
    }
}

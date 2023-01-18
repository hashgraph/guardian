import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IKeyMap } from '../interfaces/key-map.interface';
import { IWeightModel } from '../interfaces/model.interface';
import { PropertyType } from '../types/property.type';
import { WeightType } from '../types/weight.type';
import { PropertiesModel } from './properties.model';
import { PropertyModel } from './property.model';

export class TemplateTokenModel implements IWeightModel {
    public readonly name: any;

    private _prop: PropertiesModel;

    private _weight: string[];
    private _weightMap: IKeyMap<string>;

    public get key(): string {
        return this.name;
    }

    constructor(json: any) {
        this.name = json.templateTokenTag;
        this._prop = new PropertiesModel(json);
        this._weight = [];
        this._weightMap = {};
    }

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

    public toObject(): any {
        const properties = this._prop.getPropList();
        return {
            tag: this.name,
            properties
        }
    }

    public getWeight(type?: WeightType): string {
        if (type) {
            return this._weightMap[type];
        } else {
            this._weight[0];
        }
    }

    public getWeights(): string[] {
        return this._weight;
    }

    public maxWeight(): number {
        return this._weight ? this._weight.length : 0;
    }

    public checkWeight(iteration: number): boolean {
        return iteration < this._weight.length;
    }

    public equal(field: TemplateTokenModel, iteration?: number): boolean {
        if (!this._weight.length) {
            return this.name === field.name;
        }
        if (iteration) {
            if (this._weight[iteration] === '0' && field._weight[iteration] === '0') {
                return false;
            } else {
                return this._weight[iteration] === field._weight[iteration];
            }
        } else {
            return this._weight[0] === field._weight[0];
        }
    }

    public getPropList(type?: PropertyType): PropertyModel<any>[] {
        return this._prop.getPropList(type);
    }
}

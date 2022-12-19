import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from "./compare-options.interface";
import { EventModel } from "./event-model";
import { PropModel } from './prop-model';
import { WeightType } from './weight.type';

export class BlockModel {
    public readonly children: BlockModel[];
    public readonly blockType: string;
    public readonly tag: string;
    public readonly prop: PropModel;
    public readonly events: EventModel[];

    private _weight: string[];
    private _weightMap: { [key: string]: string };

    constructor(json: any) {
        this.children = [];
        this.blockType = json.blockType;
        this.tag = json.tag;
        this.prop = new PropModel(json);
        this.events = this.copyEvents(json);
        this._weight = [];
        this._weightMap = {};
    }

    private copyEvents(json: any): EventModel[] {
        if (Array.isArray(json.events)) {
            return json.events.map((e: any) => new EventModel(e));
        }
        return [];
    }

    public calcWeight(options: ICompareOptions): void {
        const weights = [];
        const weightMap = {};

        let hashState: any;

        if (options.childLvl > 0) {
            //children
            hashState = MurmurHash3();
            hashState.hash(this.blockType);
            for (const child of this.children) {
                hashState.hash(child.blockType);
            }
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.CHILD_LVL_1] = weight;
        }

        if (options.childLvl > 1) {
            //all children
            hashState = MurmurHash3();
            hashState.hash(this.blockType);
            for (const child of this.children) {
                hashState.hash(child.getWeight(WeightType.CHILD_LVL_2));
            }
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.CHILD_LVL_2] = weight;
        }

        if (options.propLvl > 0) {
            //prop
            hashState = MurmurHash3();
            hashState.hash(this.blockType + this.prop.toString(options.propLvl));
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.PROP] = weight;
        }

        if (options.propLvl > 0 && options.childLvl > 0) {
            //prop + all children
            hashState = MurmurHash3();
            hashState.hash(this.blockType + this.prop.toString(options.propLvl));
            if (options.childLvl > 1) {
                for (const child of this.children) {
                    hashState.hash(child.getWeight(WeightType.PROP_AND_CHILD));
                }
            } else {
                for (const child of this.children) {
                    hashState.hash(child.prop.toString(options.propLvl));
                }
            }
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.PROP_AND_CHILD] = weight;
        }

        this._weightMap = weightMap;
        this._weight = weights.reverse();
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

    public equal(block: BlockModel, iteration?: number): boolean {
        if (!this._weight.length) {
            return this.blockType === block.blockType;
        }
        if (iteration) {
            return this._weight[iteration] === block._weight[iteration];
        } else {
            return this._weight[0] === block._weight[0];
        }
    }
}

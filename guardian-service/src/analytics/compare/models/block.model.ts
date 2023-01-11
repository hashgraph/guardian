import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { EventModel } from "./event.model";
import { PropertiesModel } from './properties.model';
import { WeightType } from '../types/weight.type';
import { ArtifactModel } from './artifact.model';
import { IArtifacts } from '../interfaces/artifacts.interface';
import { SchemaModel } from './schema.model';
import { PropertyModel } from './property.model';
import { IKeyMap } from "../interfaces/key-map.interface";

export class BlockModel {
    public readonly index: number;
    public readonly children: BlockModel[];
    public readonly blockType: string;
    public readonly tag: string;

    public readonly prop: PropertiesModel;
    public readonly events: EventModel[];
    public readonly artifacts: ArtifactModel[];

    private _weight: string[];
    private _weightMap: IKeyMap<string>;

    constructor(json: any, index: number) {
        this.children = [];
        this.blockType = json.blockType;
        this.tag = json.tag;
        this.index = index;
        this.prop = new PropertiesModel(json);
        this.events = this.createEvents(json);
        this.artifacts = this.createArtifacts(json);
        this._weight = [];
        this._weightMap = {};
    }

    private createEvents(json: any): EventModel[] {
        if (Array.isArray(json.events)) {
            return json.events.map((e: any) => new EventModel(e));
        }
        return [];
    }

    private createArtifacts(json: any): ArtifactModel[] {
        if (Array.isArray(json.artifacts)) {
            return json.artifacts.map((e: any) => new ArtifactModel(e));
        }
        return [];
    }

    public update(options: ICompareOptions): void {
        const weights = [];
        const weightMap = {};

        let hashState: any;

        if (options.childLvl > 0) {
            if (this.children.length) {
                //children
                hashState = MurmurHash3();
                hashState.hash(this.blockType);
                for (const child of this.children) {
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
            if (this.children.length) {
                //all children
                hashState = MurmurHash3();
                hashState.hash(this.blockType);
                for (const child of this.children) {
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
            hashState.hash(this.blockType + this.prop.toString(options.propLvl));
            const weight = String(hashState.result());
            weights.push(weight);
            weightMap[WeightType.PROP_LVL_2] = weight;
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

    public updateEvents(map: IKeyMap<BlockModel>, options: ICompareOptions) {
        for (const event of this.events) {
            event.calcWeight(map[event.source], map[event.target], options);
        }
    }

    public updateArtifacts(artifacts: IArtifacts[], options: ICompareOptions) {
        for (const artifact of this.artifacts) {
            const row = artifacts.find(e => e.uuid === artifact.uuid);
            if (row && row.data) {
                artifact.calcWeight(row.data, options);
            } else {
                artifact.calcWeight('', options);
            }
        }
    }

    public updateSchemas(schemaMap: IKeyMap<SchemaModel>, options: ICompareOptions): void {
        this.prop.updateSchemas(schemaMap, options);
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
            if (this._weight[iteration] === '0' && block._weight[iteration] === '0') {
                return false;
            } else {
                return this._weight[iteration] === block._weight[iteration];
            }
        } else {
            return this._weight[0] === block._weight[0];
        }
    }

    public toObject(): any {
        const properties = this.prop.getPropList();
        const events = this.events.map(e => e.toObject());
        return {
            index: this.index,
            blockType: this.blockType,
            tag: this.tag,
            properties,
            events
        }
    }

    public getPropList(): PropertyModel<any>[] {
        return this.prop.getPropList();
    }

    public getEventList(): EventModel[] {
        return this.events;
    }

    public getPermissionsList(): string[] {
        return this.prop.getPermissionsList();
    }

    public getArtifactsList(): ArtifactModel[] {
        return this.artifacts;
    }
}

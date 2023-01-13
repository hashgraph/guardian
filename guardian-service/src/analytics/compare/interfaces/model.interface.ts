import { ICompareOptions } from "./compare-options.interface";

export interface IModel {
    toObject(): any;
}

export interface IWeightModel extends IModel {
    key: string;
    maxWeight(): number
    checkWeight(iteration: number): boolean;
    getWeights(): string[];
    equal(item: any, iteration?: number): boolean;
    update(options: ICompareOptions): void;
}

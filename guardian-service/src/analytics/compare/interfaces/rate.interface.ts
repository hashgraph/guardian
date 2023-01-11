import { IModel } from "./model.interface";
import { Status } from "../types/status.type";
import { ICompareOptions } from "./compare-options.interface";

export interface IRate<T> {
    readonly left: T;
    readonly right: T;
    type: Status;
    totalRate: number;

    getChildren<T extends IRate<any>>(): T[];
    getSubRate(name: string): IRate<any>[];
    calc(options: ICompareOptions): void;
    toObject(): any;
    getSubRate(name: string): IRate<any>[];
    getRateValue(name: string): number;
    total(): number;
}

import { Status } from '../types/status.type';
import { ICompareOptions } from './compare-options.interface';

export interface IRate<T> {
    readonly left: T;
    readonly right: T;
    type: Status;
    totalRate: number;

    getChildren<T extends IRate<any>>(): T[];
    calc(options: ICompareOptions): void;
    toObject(): any;
    getSubRate(name?: string): IRate<any>[];
    getRateValue(name: string): number;
    total(): number;
}

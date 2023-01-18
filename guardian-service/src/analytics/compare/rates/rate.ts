import { Status } from '../types/status.type';
import { IRate } from '../interfaces/rate.interface';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IModel } from '../interfaces/model.interface';

export class Rate<T extends IModel> implements IRate<T> {
    public readonly left: T;
    public readonly right: T;

    public type: Status;
    public totalRate: number;

    constructor(left: T, right: T) {
        this.type = Status.NONE;
        this.left = left;
        this.right = right;
        this.totalRate = -1;
    }

    public getChildren<T extends IRate<any>>(): T[] {
        return [];
    }

    public getSubRate(name: string): IRate<any>[] {
        return null;
    }

    public calc(options: ICompareOptions): void {
        return;
    }

    public toObject(): any {
        return {
            type: this.type,
            totalRate: this.totalRate,
            items: [
                this.left?.toObject(),
                this.right?.toObject()
            ]
        }
    }

    public getRateValue(name: string): number {
        return this.totalRate;
    }

    public total(): number {
        let total = this.totalRate;
        let count = 1;
        const children = this.getChildren();
        if (children && children.length) {
            for (const child of children) {
                total += child.total();
                count++;
            }
        }
        return Math.floor(total / count);
    }
}

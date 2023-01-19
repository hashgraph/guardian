import { Status } from '../types/status.type';
import { IRate } from '../interfaces/rate.interface';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IModel } from '../interfaces/model.interface';

/**
 * Calculates the difference between two objects
 */
export class Rate<T extends IModel> implements IRate<T> {
    /**
     * Left object
     */
    public readonly left: T;
    /**
     * Right object
     */
    public readonly right: T;
    /**
     * Degree of equality
     */
    public type: Status;
    /**
     * Total Rate (percentage)
     */
    public totalRate: number;

    constructor(left: T, right: T) {
        this.type = Status.NONE;
        this.left = left;
        this.right = right;
        this.totalRate = -1;
    }

    /**
     * Get children rates
     * @public
     */
    public getChildren<U extends IRate<any>>(): U[] {
        return [];
    }

    /**
     * Get sub rates by name
     * @param name
     * @public
     */
    public getSubRate(name: string): IRate<any>[] {
        return null;
    }

    /**
     * Calculations all rates
     * @param options - comparison options
     * @public
     */
    public calc(options: ICompareOptions): void {
        return;
    }

    /**
     * Convert class to object
     * @public
     */
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

    /**
     * Get rate by name
     * @param name - rate name
     * @public
     */
    public getRateValue(name: string): number {
        return this.totalRate;
    }

    /**
     * Get total rate and total rate all children
     * @public
     */
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

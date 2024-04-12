import { CompareOptions } from '../interfaces/compare-options.interface.js';
import { IRateTable } from '../interfaces/rate-table.interface.js';
import { IRate } from '../interfaces/rate.interface.js';
import { Status } from '../types/status.type.js';

/**
 * Calculates the difference between two Permissions
 */
export class PermissionsRate implements IRate<string> {
    /**
     * Left permission
     */
    public readonly left: string;
    /**
     * Right permission
     */
    public readonly right: string;
    /**
     * Degree of equality
     */
    public type: Status;
    /**
     * Total Rate (percentage)
     */
    public totalRate: number;

    constructor(permission1: string, permission2: string) {
        this.type = Status.NONE;
        this.left = permission1;
        this.right = permission2;
        if (permission1 === permission2) {
            this.totalRate = 100;
            this.type = Status.FULL;
        } else {
            if (permission1) {
                this.type = Status.LEFT;
            } else {
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
    }

    /**
     * Set children rates
     * @public
     */
    public setChildren<U extends IRate<any>>(children: U[]): void {
        return;
    }

    /**
     * Get Children Rates
     * @public
     */
    public getChildren<T extends IRate<any>>(): T[] {
        return [];
    }

    /**
     * Get sub rates by name
     * @param name - rate name
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
    public calc(options: CompareOptions): void {
        return;
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): IRateTable<string> {
        return {
            type: this.type,
            totalRate: this.totalRate,
            items: [this.left, this.right]
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
        return this.totalRate;
    }
}

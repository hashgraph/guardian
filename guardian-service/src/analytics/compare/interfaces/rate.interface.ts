import { Status } from '../types/status.type';
import { ICompareOptions } from './compare-options.interface';

/**
 * Rate Model interface
 */
export interface IRate<T> {
    /**
     * Left object
     */
    readonly left: T;
    /**
     * Right object
     */
    readonly right: T;
    /**
     * Degree of equality
     */
    type: Status;
    /**
     * Total Rate (percentage)
     */
    totalRate: number;

    /**
     * Get Children Rates
     * @public
     */
    getChildren<U extends IRate<any>>(): U[];

    /**
     * Calculations all rates
     * @param options - comparison options
     * @public
     */
    calc(options: ICompareOptions): void;

    /**
     * Convert class to object
     * @public
     */
    toObject(): any;

    /**
     * Get sub rates by name
     * @param name - rate name
     * @public
     */
    getSubRate(name?: string): IRate<any>[];

    /**
     * Get rate by name
     * @param name - rate name
     * @public
     */
    getRateValue(name: string): number;

    /**
     * Get total rate and total rate all children
     * @public
     */
    total(): number;
}

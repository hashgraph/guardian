import { ICompareOptions } from './compare-options.interface';
import { IModel } from './model.interface';

/**
 * Weight Model interface
 */
export interface IWeightModel extends IModel {
    /**
     * Key
     */
    key: string;

    /**
     * Get weight number
     * @public
     */
    maxWeight(): number

    /**
     * Check weight by number
     * @param index - weight index
     * @public
     */
    checkWeight(index: number): boolean;

    /**
     * Get all weight
     * @public
     */
    getWeights(): string[];

    /**
     * Comparison of models using weight
     * @param item - model
     * @param index - weight index
     * @public
     */
    equal(item: any, index?: number): boolean;

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    update(options: ICompareOptions): void;
}
import { CompareOptions } from './compare-options.interface.js';
import { IModel } from './model.interface.js';

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
     * Comparison of models using key
     * @param item - model
     * @public
     */
    equalKey(doc: any): boolean;

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    update(options: CompareOptions): void;
}

/**
 * Weight Model interface
 */
export interface IWeightTreeModel extends IWeightModel {
    children: IWeightTreeModel[];
}

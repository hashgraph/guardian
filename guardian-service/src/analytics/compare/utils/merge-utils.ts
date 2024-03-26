import { IWeightModel } from '../interfaces/weight-model.interface.js';
import { IRateMap } from '../interfaces/rate-map.interface.js';
import { IMultiRateMap } from '../interfaces/multi-rate-map.interface.ts';

/**
 * Merge Utils
 */
export class MergeUtils {
    /**
     * Get object's key
     * @param left
     * @param right
     * @private
     * @static
     */
    private static getMultiKey(items: IWeightModel[]): string {
        for (const item of items) {
            if (item && item.key) {
                return item.key;
            }
        }
        return null;
    }

    /**
     * Merge multiple arrays
     * @param items1
     * @param items2
     * @public
     * @static
     */
    public static fullMultiMerge<T>(items: IWeightModel[][]): IMultiRateMap<T>[] {
        const result: IMultiRateMap<IWeightModel>[] = [];
        let max = 0;
        for (const array of items) {
            max = Math.max(max, array.length);
        }
        for (let i = 0; i < max; i++) {
            const rowItems: IWeightModel[] = [];
            for (const array of items) {
                rowItems.push(array[i]);
            }
            result.push({
                key: MergeUtils.getMultiKey(rowItems),
                items: rowItems
            });
        }
        return result as any;
    }

    /**
     * Does not match arrays
     * @param items1
     * @param items2
     * @public
     * @static
     */
    public static notMultiMerge<T>(items: IWeightModel[][]): IMultiRateMap<T>[] {
        const result: IMultiRateMap<IWeightModel>[] = [];
        for (let i = 0; i < items.length; i++) {
            const array = items[i];
            for (const item of array) {
                const rowItems = new Array(items.length);
                rowItems.fill(null);
                rowItems[i] = item;
                result.push({
                    key: MergeUtils.getKey(item),
                    items: rowItems
                });
            }
        }
        return result as any;
    }

    /**
     * Matches the left and right side using weights
     * @param items1
     * @param items2
     * @param keepOrder - keep original order
     * @public
     * @static
     */
    public static partlyMultiMerge<T>(items: IWeightModel[][]): IMultiRateMap<T>[] {
        const result: IMultiRateMap<IWeightModel>[] = [];

        const left = items[0];

        let maxWeightCount = 0;
        for (const child of left) {
            maxWeightCount = child.maxWeight();
            const rowItems = new Array(items.length);
            rowItems.fill(null);
            rowItems[0] = child;
            result.push({
                key: MergeUtils.getKey(child),
                items: rowItems
            });
        }
        maxWeightCount++;

        for (let index = 1; index < items.length; index++) {
            const right = items[index];
            if (!right) {
                continue;
            }

            //Merge
            const itemsMap = new Array(right.length);
            for (let iteration = 0; iteration < maxWeightCount; iteration++) {
                for (let i = 0; i < right.length; i++) {
                    if (!itemsMap[i]) {
                        itemsMap[i] = MergeUtils.multiMapping(result, index, right[i], iteration);
                    }
                }
            }

            //Not Merge
            for (let i = 0; i < right.length; i++) {
                if (!itemsMap[i]) {
                    const child: IWeightModel = right[i];
                    const rowItems = new Array(items.length);
                    rowItems.fill(null);
                    rowItems[index] = child;
                    result.push({
                        key: MergeUtils.getKey(child),
                        items: rowItems
                    });
                }
            }

        }

        return result as any;
    }

    /**
     * Set item in map
     * @param result
     * @param arrayIndex
     * @param child
     * @param iteration - accuracy decreases as iteration increases
     * @public
     * @static
     */
    public static multiMapping(
        result: IMultiRateMap<IWeightModel>[],
        arrayIndex: number,
        child: IWeightModel,
        iteration: number
    ) {
        for (const row of result) {
            const left = row.items[0];
            if (left && !row.items[arrayIndex]) {
                if (left.checkWeight(iteration)) {
                    if (left.equal(child, iteration)) {
                        row.items[arrayIndex] = child;
                        return true;
                    }
                } else if (row.key && row.key === child.key) {
                    row.items[arrayIndex] = child;
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get left or right object's key
     * @param left
     * @param right
     * @private
     * @static
     */
    private static getKey(left?: IWeightModel, right?: IWeightModel): string {
        if (left) {
            return left.key;
        } if (right) {
            return right.key;
        } else {
            return null;
        }
    }

    /**
     * Matches the left and right side one to one
     * @param items1
     * @param items2
     * @public
     * @static
     */
    public static fullMerge<T>(items1: IWeightModel[], items2: IWeightModel[]): IRateMap<T>[] {
        const result: IRateMap<IWeightModel>[] = [];
        const max = Math.max(items1.length, items2.length);
        for (let i = 0; i < max; i++) {
            const left = items1[i];
            const right = items2[i];
            result.push({ key: MergeUtils.getKey(left, right), left, right });
        }
        return result as any;
    }

    /**
     * Does not match left and right
     * @param items1
     * @param items2
     * @public
     * @static
     */
    public static notMerge<T>(items1: IWeightModel[], items2: IWeightModel[]): IRateMap<T>[] {
        const result: IRateMap<IWeightModel>[] = [];
        if (items1) {
            for (const left of items1) {
                result.push({ key: MergeUtils.getKey(left), left, right: null });
            }
        }
        if (items2) {
            for (const right of items2) {
                result.push({ key: MergeUtils.getKey(right), left: null, right });
            }
        }
        return result as any;
    }

    /**
     * Matches the left and right side using weights
     * @param items1
     * @param items2
     * @public
     * @static
     */
    public static partlyMerge<T>(items1: IWeightModel[], items2: IWeightModel[]): IRateMap<T>[] {
        const result: IRateMap<IWeightModel>[] = [];

        let max = 0;
        for (const child of items1) {
            max = child.maxWeight();
            result.push({ key: MergeUtils.getKey(child), left: child, right: null });
        }
        max++;

        const m = new Array(items2.length);
        for (let iteration = 0; iteration < max; iteration++) {
            for (let i = 0; i < items2.length; i++) {
                if (!m[i]) {
                    m[i] = MergeUtils.mapping(result, items2[i], iteration);
                }
            }
        }
        for (let i = 0; i < items2.length; i++) {
            if (!m[i]) {
                const child: IWeightModel = items2[i];
                result.push({ key: MergeUtils.getKey(child), left: null, right: child });
            }
        }
        return result as any;
    }

    /**
     * Set item in map
     * @param result
     * @param child
     * @param iteration - accuracy decreases as iteration increases
     * @public
     * @static
     */
    public static mapping(result: IRateMap<IWeightModel>[], child: IWeightModel, iteration: number) {
        for (const row of result) {
            if (row.left && !row.right) {
                if (row.left.checkWeight(iteration)) {
                    if (row.left.equal(child, iteration)) {
                        row.right = child;
                        return true;
                    }
                } else if (row.key && row.key === child.key) {
                    row.right = child;
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get diff (percentage)
     * @param item1
     * @param item2
     * @public
     * @static
     */
    public static getDiff(item1: IWeightModel, item2: IWeightModel): number {
        if (!item1) {
            return 0;
        }
        if (!item2) {
            return 0;
        }
        let result = 1;
        const weight1 = item1.getWeights();
        const weight2 = item2.getWeights();
        const k = 1 / (weight1.length + 1);
        for (let i = 0; i < weight1.length; i++) {
            if (weight1[i] !== weight2[i]) {
                result -= k;
            }
        }
        return Math.floor(Math.max(0, result) * 100);
    }
}

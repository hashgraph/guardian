import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IMultiRateMap } from "../interfaces/multi-rate-map.interface.ts";
import { IRateMap } from "../interfaces/rate-map.interface";
import { IRate } from "../interfaces/rate.interface";
import { IWeightModel } from "../interfaces/weight-model.interface";
import { BlockModel } from "../models/block.model";
import { BlocksRate } from "../rates/blocks-rate";
import { ObjectRate } from "../rates/object-rate";
import { Status } from "../types/status.type";
import { MergeUtils } from "./merge-utils";

/**
 * Compare Utils
 */
export class ComparePolicyUtils {
    /**
     * Compare two trees
     * @param block1
     * @param block2
     * @param options
     * @public
     * @static
     */
    public static compareTree(block1: BlockModel, block2: BlockModel, options: ICompareOptions): BlocksRate {
        const rate = new BlocksRate(block1, block2);
        rate.calc(options);
        if (!block1 && !block2) {
            return rate;
        }
        if (block1 && !block2) {
            rate.type = Status.LEFT;
            rate.children = ComparePolicyUtils.compareChildren(Status.LEFT, block1.children, null, options);
            return rate;
        }
        if (!block1 && block2) {
            rate.type = Status.RIGHT;
            rate.children = ComparePolicyUtils.compareChildren(Status.RIGHT, null, block2.children, options);
            return rate;
        }
        if (block1.equal(block2)) {
            rate.type = Status.FULL;
            rate.children = ComparePolicyUtils.compareChildren(Status.FULL, block1.children, block2.children, options);
            return rate;
        }
        if (block1.key === block2.key) {
            rate.type = Status.PARTLY;
            rate.children = ComparePolicyUtils.compareChildren(Status.PARTLY, block1.children, block2.children, options);
            return rate;
        } else {
            rate.type = Status.LEFT_AND_RIGHT;
            rate.children = ComparePolicyUtils.compareChildren(Status.LEFT_AND_RIGHT, block1.children, block2.children, options);
            return rate;
        }
    }

    /**
     * Compare two array (with children)
     * @param type
     * @param children1
     * @param children2
     * @param options
     * @public
     * @static
     */
    public static compareChildren(
        type: Status,
        children1: BlockModel[],
        children2: BlockModel[],
        options: ICompareOptions
    ): BlocksRate[] {
        let result: IRateMap<BlockModel>[];
        if (type === Status.FULL) {
            result = MergeUtils.fullMerge<BlockModel>(children1, children2);
        } else if (type === Status.PARTLY) {
            result = MergeUtils.partlyMerge<BlockModel>(children1, children2);
        } else {
            result = MergeUtils.notMerge<BlockModel>(children1, children2);
        }
        const children: BlocksRate[] = [];
        for (const item of result) {
            children.push(this.compareTree(item.left, item.right, options));
        }
        return children;
    }

    /**
     * Compare two array (without children)
     * @param type
     * @param children1
     * @param children2
     * @param options
     * @public
     * @static
     */
    public static compareArray(
        children1: IWeightModel[],
        children2: IWeightModel[],
        options: ICompareOptions
    ): IRate<any>[] {
        const result = MergeUtils.partlyMerge<IWeightModel>(children1, children2);
        const rates: IRate<any>[] = [];
        for (const item of result) {
            const rate = new ObjectRate(item.left, item.right);
            rate.calc(options);
            rates.push(rate);
        }
        return rates;
    }
}
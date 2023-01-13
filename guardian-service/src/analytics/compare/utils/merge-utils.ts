import { IWeightModel } from "../interfaces/model.interface";
import { IRateMap } from "../interfaces/rate-map.interface";

export class MergeUtils {
    private static getKey(left?: IWeightModel, right?: IWeightModel): string {
        if (left) {
            return left.key;
        } if (right) {
            return right.key;
        } else {
            return null;
        }
    }

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

    public static notMerge<T>(items1: IWeightModel[], items2: IWeightModel[]): IRateMap<T>[] {
        const result: IRateMap<IWeightModel>[] = [];
        if (items1) {
            for (let i = 0; i < items1.length; i++) {
                const left = items1[i];
                result.push({ key: MergeUtils.getKey(left), left, right: null });
            }
        }
        if (items2) {
            for (let i = 0; i < items2.length; i++) {
                const right = items2[i];
                result.push({ key: MergeUtils.getKey(right), left: null, right });
            }
        }
        return result as any;
    }

    public static partlyMerge<T>(items1: IWeightModel[], items2: IWeightModel[], keepOrder: boolean): IRateMap<T>[] {
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
                if (keepOrder) {
                    result.splice(i, 0, { key: MergeUtils.getKey(child), left: null, right: child });
                } else {
                    result.push({ key: MergeUtils.getKey(child), left: null, right: child });
                }
            }
        }
        return result as any;
    }

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
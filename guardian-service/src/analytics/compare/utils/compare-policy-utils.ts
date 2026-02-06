import { CompareOptions, IModel, IRateMap, IRate, IWeightModel, IWeightTreeModel } from '../interfaces/index.js';
import { BlockModel, DocumentModel, FieldModel, RecordModel } from '../models/index.js';
import { BlocksRate, DocumentsRate, RecordRate, FieldsRate, ObjectRate } from '../rates/index.js';
import { Status } from '../types/index.js';
import { MergeUtils } from './merge-utils.js';

/**
 * Compare Utils
 */
export class ComparePolicyUtils {
    /**
     * Convert tree to array
     * @param tree
     * @param result
     * @private
     */
    public static treeToArray(tree: IRate<any>, result: IRate<any>[]): IRate<any>[] {
        result.push(tree);
        for (const child of tree.getChildren<BlocksRate>()) {
            ComparePolicyUtils.treeToArray(child, result);
        }
        return result;
    }

    /**
     * Convert array rates to table
     * @param tree
     * @public
     * @static
     */
    public static ratesToTable<T>(rates: IRate<T>[]): IRate<T>[] {
        const table: IRate<T>[] = [];
        for (const child of rates) {
            ComparePolicyUtils._rateToTable(child, table);
        }
        return table;
    }

    /**
     * Convert tree rates to table
     * @param tree
     * @public
     * @static
     */
    public static rateToTable<T>(rate: IRate<T>): IRate<T>[] {
        const table: IRate<T>[] = [];
        ComparePolicyUtils._rateToTable(rate, table);
        return table;
    }

    /**
     * Convert tree to table
     * @param tree
     * @param table
     * @public
     * @static
     */
    private static _rateToTable<T>(rate: IRate<T>, table: IRate<T>[]): void {
        table.push(rate);
        for (const child of rate.getChildren()) {
            ComparePolicyUtils._rateToTable(child, table);
        }
    }

    /**
     * Compare two trees
     * @param tree1
     * @param tree2
     * @param options
     * @public
     * @static
     */
    public static compareFields(
        fields1: FieldModel[],
        fields2: FieldModel[],
        options: CompareOptions
    ): FieldsRate[] {
        const createRate = (field1: FieldModel, field2: FieldModel) => {
            const rate = new FieldsRate(field1, field2);
            rate.calc(options);
            return rate;
        }
        return ComparePolicyUtils.compareChildren(
            Status.PARTLY, fields1, fields2, createRate
        );
    }

    /**
     * Compare two trees
     * @param tree1
     * @param tree2
     * @param options
     * @public
     * @static
     */
    public static compareBlocks(
        tree1: BlockModel,
        tree2: BlockModel,
        options: CompareOptions
    ): BlocksRate {
        const createRate = (block1: BlockModel, block2: BlockModel) => {
            const rate = new BlocksRate(block1, block2);
            rate.calc(options);
            return rate;
        }
        return ComparePolicyUtils.compareTree(tree1, tree2, createRate);
    }

    /**
     * Compare two trees
     * @param tree1
     * @param tree2
     * @param options
     * @public
     * @static
     */
    public static compareDocuments(
        tree1: DocumentModel,
        tree2: DocumentModel,
        options: CompareOptions
    ): DocumentsRate {
        const createRate = (document1: DocumentModel, document2: DocumentModel) => {
            const rate = new DocumentsRate(document1, document2);
            rate.calc(options);
            return rate;
        }
        return ComparePolicyUtils.compareTree(tree1, tree2, createRate);
    }

    /**
     * Compare two trees
     * @param tree1
     * @param tree2
     * @param options
     * @public
     * @static
     */
    public static compareRecord(
        tree1: RecordModel,
        tree2: RecordModel,
        options: CompareOptions
    ): RecordRate {
        const rate = new RecordRate(tree1, tree2);
        rate.calc(options);

        const createRate = (document1: DocumentModel, document2: DocumentModel) => {
            const _rate = new DocumentsRate(document1, document2);
            _rate.calc(options);
            return _rate;
        }
        // if (tree1.equal(tree2)) {
        //     rate.type = Status.FULL;
        //     rate.setChildren(
        //         ComparePolicyUtils.compareChildren(
        //             Status.FULL,
        //             tree1.children,
        //             tree2.children,
        //             createRate
        //         )
        //     );
        // } else {
        //     rate.type = Status.PARTLY;
        //     rate.setChildren(
        //         ComparePolicyUtils.compareChildren(
        //             Status.PARTLY,
        //             tree1.children,
        //             tree2.children,
        //             createRate
        //         )
        //     );
        // }
        rate.type = Status.PARTLY;
        rate.setChildren(
            ComparePolicyUtils.compareChildren(
                Status.PARTLY,
                tree1.children,
                tree2.children,
                createRate
            )
        );
        return rate;
    }

    /**
     * Compare two trees
     * @param tree1
     * @param tree2
     * @param options
     * @public
     * @static
     */
    public static compareTree<T extends IRate<IModel>>(
        tree1: IWeightTreeModel,
        tree2: IWeightTreeModel,
        createRate: (tree1: IWeightTreeModel, tree2: IWeightTreeModel) => T
    ): T {
        const rate = createRate(tree1, tree2);
        if (!tree1 && !tree2) {
            return rate;
        }
        if (tree1 && !tree2) {
            rate.type = Status.LEFT;
            rate.setChildren(
                ComparePolicyUtils.compareChildren(
                    Status.LEFT,
                    tree1.children,
                    null,
                    createRate
                )
            );
            return rate;
        }
        if (!tree1 && tree2) {
            rate.type = Status.RIGHT;
            rate.setChildren(
                ComparePolicyUtils.compareChildren(
                    Status.RIGHT,
                    null,
                    tree2.children,
                    createRate
                )
            );
            return rate;
        }
        if (tree1.equal(tree2)) {
            rate.type = Status.FULL;
            rate.setChildren(
                ComparePolicyUtils.compareChildren(
                    Status.FULL,
                    tree1.children,
                    tree2.children,
                    createRate
                )
            );
            return rate;
        }
        if (tree1.equalKey(tree2)) {
            rate.type = Status.PARTLY;
            rate.setChildren(
                ComparePolicyUtils.compareChildren(
                    Status.PARTLY,
                    tree1.children,
                    tree2.children,
                    createRate
                )
            );
            return rate;
        } else {
            rate.type = Status.LEFT_AND_RIGHT;
            rate.setChildren(
                ComparePolicyUtils.compareChildren(
                    Status.LEFT_AND_RIGHT,
                    tree1.children,
                    tree2.children,
                    createRate
                )
            );
            return rate;
        }
    }

    /**
     * Compare two array (with children)
     * @param type
     * @param children1
     * @param children2
     * @public
     * @static
     */
    public static compareChildren<T extends IRate<IModel>>(
        type: Status,
        children1: IWeightTreeModel[],
        children2: IWeightTreeModel[],
        createRate: (tree1: IWeightTreeModel, tree2: IWeightTreeModel) => T
    ): T[] {
        let result: IRateMap<IWeightTreeModel>[];
        if (type === Status.FULL) {
            result = MergeUtils.fullMerge<IWeightTreeModel>(children1, children2);
        } else if (type === Status.PARTLY) {
            result = MergeUtils.partlyMerge<IWeightTreeModel>(children1, children2);
        } else {
            result = MergeUtils.notMerge<IWeightTreeModel>(children1, children2);
        }
        const children: T[] = [];
        for (const item of result) {
            children.push(
                ComparePolicyUtils.compareTree(item.left, item.right, createRate)
            );
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
        options: CompareOptions
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

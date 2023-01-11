import { BlockModel } from "./models/block.model";
import { BlocksRate } from "./rates/blocks-rate";
import { ICompareOptions } from "./interfaces/compare-options.interface";
import { PolicyModel } from "./models/policy.model";
import { ReportTable } from "../table/report-table";
import { Status } from "./types/status.type";
import { IRateMap } from "./interfaces/rate-map.interface";
import { ICompareResult } from "./interfaces/compare-result.interface";

export class PolicyComparator {
    private readonly propLvl: number;
    private readonly childLvl: number;
    private readonly eventLvl: number;
    private readonly options: ICompareOptions;

    constructor(options?: ICompareOptions) {
        if (options) {
            this.propLvl = options.propLvl;
            this.childLvl = options.childLvl;
            this.eventLvl = options.eventLvl;
        } else {
            this.propLvl = 2;
            this.childLvl = 2;
            this.eventLvl = 1;
        }
        this.options = {
            propLvl: this.propLvl,
            childLvl: this.childLvl,
            eventLvl: this.eventLvl
        }
    }

    public compare(
        policy1: PolicyModel,
        policy2: PolicyModel
    ): ICompareResult {
        const columns = [
            { name: 'lvl', label: 'Offset', type: 'number' },
            { name: 'left_index', label: 'Index', type: 'number' },
            { name: 'left_type', label: 'Type', type: 'string' },
            { name: 'left_tag', label: 'Tag', type: 'string' },
            { name: 'right_index', label: 'Index', type: 'number' },
            { name: 'right_type', label: 'Type', type: 'string' },
            { name: 'right_tag', label: 'Tag', type: 'string' },
            { name: 'index_rate', label: 'Index Rate', type: 'number' },
            { name: 'permission_rate', label: 'Permission Rate', type: 'number' },
            { name: 'prop_rate', label: 'Prop Rate', type: 'number' },
            { name: 'event_rate', label: 'Event Rate', type: 'number' },
            { name: 'artifacts_rate', label: 'Artifact Rate', type: 'number' },
            { name: 'total_rate', label: 'Total Rate', type: 'number' },

            { name: 'type', label: '', type: 'string' },
            { name: 'block_type', label: '', type: 'string' },
            { name: 'left', label: '', type: 'object' },
            { name: 'right', label: '', type: 'object' },
            { name: 'properties', label: '', type: 'object' },
            { name: 'events', label: '', type: 'object' },
            { name: 'permissions', label: '', type: 'object' },
            { name: 'artifacts', label: '', type: 'object' }
        ];

        const table = new ReportTable(columns);
        const tree = this.compareTree(policy1.tree, policy2.tree, this.options);
        this.treeToTable(tree, table, 1);

        const result: ICompareResult = {
            columns,
            left: policy1.info(),
            right: policy2.info(),
            report: table.object(),
            total: tree.total(),
        }

        return result;
    }

    public treeToTable(tree: BlocksRate, table: ReportTable, lvl: number): void {
        const item_1 = tree.left;
        const item_2 = tree.right;
        const row = table.createRow();

        row.set('lvl', lvl);
        row.set('type', tree.type);
        row.set('block_type', tree.blockType);

        row.set('properties', tree.getSubRate('properties'));
        row.set('events', tree.getSubRate('events'));
        row.set('permissions', tree.getSubRate('permissions'));
        row.set('artifacts', tree.getSubRate('artifacts'));

        row.set('left', item_1?.toObject());
        row.set('right', item_2?.toObject());

        if (item_1) {
            row.set('left_type', item_1.blockType);
            row.set('left_tag', item_1.tag);
            row.set('left_index', item_1.index);
        }
        if (item_2) {
            row.set('right_type', item_2.blockType);
            row.set('right_tag', item_2.tag);
            row.set('right_index', item_2.index);
        }
        if (item_1 && item_2) {
            row.set('prop_rate', `${tree.getRateValue('properties')}%`);
            row.set('event_rate', `${tree.getRateValue('events')}%`);
            row.set('index_rate', `${tree.getRateValue('index')}%`);
            row.set('permission_rate', `${tree.getRateValue('permissions')}%`);
            row.set('artifacts_rate', `${tree.getRateValue('artifacts')}%`);
            row.set('total_rate', `${tree.getRateValue('total')}%`);
        } else {
            row.set('prop_rate', `-`);
            row.set('event_rate', `-`);
            row.set('index_rate', `-`);
            row.set('permission_rate', `-`);
            row.set('artifacts_rate', `-`);
            row.set('total_rate', `-`);
        }

        for (const child of tree.getChildren<BlocksRate>()) {
            this.treeToTable(child, table, lvl + 1);
        }
    }

    private compareTree(block1: BlockModel, block2: BlockModel, options: ICompareOptions): BlocksRate {
        const rate = new BlocksRate(block1, block2);
        rate.calc(options);
        if (!block1 && !block2) {
            return rate;
        }
        if (block1 && !block2) {
            rate.type = Status.LEFT;
            rate.children = this.compareChildren(Status.LEFT, block1.children, null, options);
            return rate;
        }
        if (!block1 && block2) {
            rate.type = Status.RIGHT;
            rate.children = this.compareChildren(Status.RIGHT, null, block2.children, options);
            return rate;
        }
        if (block1.equal(block2)) {
            rate.type = Status.FULL;
            rate.children = this.compareChildren(Status.FULL, block1.children, block2.children, options);
            return rate;
        }
        if (block1.blockType == block2.blockType) {
            rate.type = Status.PARTLY;
            rate.children = this.compareChildren(Status.PARTLY, block1.children, block2.children, options);
            return rate;
        } else {
            rate.type = Status.LEFT_AND_RIGHT;
            rate.children = this.compareChildren(Status.LEFT_AND_RIGHT, block1.children, block2.children, options);
            return rate;
        }
    }

    private compareChildren(
        type: Status,
        children1: BlockModel[],
        children2: BlockModel[],
        options: ICompareOptions
    ): BlocksRate[] {
        let result: IRateMap<BlockModel>[];
        if (type === Status.FULL) {
            result = this.mergeChildren2(children1, children2);
        } else if (type === Status.PARTLY) {
            result = this.mergeChildren1(children1, children2);
        } else {
            result = this.mergeChildren3(children1, children2);
        }
        const children: BlocksRate[] = [];
        for (const item of result) {
            children.push(this.compareTree(item.left, item.right, options));
        }
        return children;
    }

    private mergeChildren1(children1: BlockModel[], children2: BlockModel[]): IRateMap<BlockModel>[] {
        const result: IRateMap<BlockModel>[] = [];

        let max = 0;
        for (const child of children1) {
            max = child.maxWeight();
            result.push({ blockType: child.blockType, left: child, right: null, rate: 0 });
        }
        max++;

        const m = new Array(children2.length);
        for (let iteration = 0; iteration < max; iteration++) {
            for (let i = 0; i < children2.length; i++) {
                if (!m[i]) {
                    m[i] = this.mapping(result, children2[i], iteration);
                }
            }
        }
        for (let i = 0; i < children2.length; i++) {
            if (!m[i]) {
                const child: BlockModel = children2[i];
                result.splice(i, 0, { blockType: child.blockType, left: null, right: child, rate: 0 });
            }
        }
        return result;
    }

    private mergeChildren2(children1: BlockModel[], children2: BlockModel[]): IRateMap<BlockModel>[] {
        const result: IRateMap<BlockModel>[] = [];
        const max = Math.max(children1.length, children2.length);
        for (let i = 0; i < max; i++) {
            const left = children1[i];
            const right = children2[i];
            result.push({ blockType: (left || right).blockType, left, right, rate: 100 });
        }
        return result;
    }

    private mergeChildren3(children1: BlockModel[], children2: BlockModel[]): IRateMap<BlockModel>[] {
        const result: IRateMap<BlockModel>[] = [];
        if (children1) {
            for (let i = 0; i < children1.length; i++) {
                const left = children1[i];
                result.push({ blockType: left.blockType, left, right: null, rate: 100 });
            }
        }
        if (children2) {
            for (let i = 0; i < children2.length; i++) {
                const right = children2[i];
                result.push({ blockType: right.blockType, left: null, right, rate: 100 });
            }
        }
        return result;
    }

    private mapping(result: IRateMap<BlockModel>[], child: BlockModel, iteration: number) {
        for (const row of result) {
            if (row.blockType === child.blockType && row.left && !row.right) {
                if (row.left.checkWeight(iteration)) {
                    if (row.left.equal(child, iteration)) {
                        row.right = child;
                        row.rate = this.getDiff(row.left, row.right);
                        return true;
                    }
                } else {
                    row.right = child;
                    row.rate = this.getDiff(row.left, row.right);
                    return true;
                }
            }
        }
        return false;
    }

    private getDiff(item1: BlockModel, item2: BlockModel): number {
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
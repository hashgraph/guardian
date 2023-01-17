import { BlockModel } from "../models/block.model";
import { BlocksRate } from "../rates/blocks-rate";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { PolicyModel } from "../models/policy.model";
import { ReportTable } from "../../table/report-table";
import { Status } from "../types/status.type";
import { IRateMap } from "../interfaces/rate-map.interface";
import { ICompareResult } from "../interfaces/compare-result.interface";
import { MergeUtils } from "../utils/merge-utils";
import { IWeightModel } from "../interfaces/model.interface";
import { IRate } from "../interfaces/rate.interface";
import { Rate } from "../rates/rate";
import { ObjectRate } from "../rates/object-rate";
import { CompareUtils } from "../utils/utils";

export class PolicyComparator {
    private readonly propLvl: number;
    private readonly childLvl: number;
    private readonly eventLvl: number;
    private readonly idLvl: number;
    private readonly options: ICompareOptions;

    constructor(options?: ICompareOptions) {
        if (options) {
            this.propLvl = options.propLvl;
            this.childLvl = options.childLvl;
            this.eventLvl = options.eventLvl;
            this.idLvl = options.idLvl;
        } else {
            this.propLvl = 2;
            this.childLvl = 2;
            this.eventLvl = 1;
            this.idLvl = 1;
        }
        this.options = {
            propLvl: this.propLvl,
            childLvl: this.childLvl,
            eventLvl: this.eventLvl,
            idLvl: this.idLvl,
        }
    }

    public compare(
        policy1: PolicyModel,
        policy2: PolicyModel
    ): ICompareResult<any> {
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

        const treeTable = new ReportTable(columns);
        const rolesTable = new ReportTable(columns);
        const groupsTable = new ReportTable(columns);
        const topicsTable = new ReportTable(columns);
        const tokensTable = new ReportTable(columns);

        const tree = this.compareTree(policy1.tree, policy2.tree, this.options);
        const roles = this.compareArray(policy1.roles, policy2.roles, this.options);
        const groups = this.compareArray(policy1.groups, policy2.groups, this.options);
        const topics = this.compareArray(policy1.topics, policy2.topics, this.options);
        const tokens = this.compareArray(policy1.tokens, policy2.tokens, this.options);

        this.treeToTable(tree, treeTable, 1);
        this.ratesToTable(roles, rolesTable);
        this.ratesToTable(groups, groupsTable);
        this.ratesToTable(topics, topicsTable);
        this.ratesToTable(tokens, tokensTable);

        const blockRate = tree.total();
        const roleRate = this.total(roles);
        const groupRate = this.total(groups);
        const topicRate = this.total(topics);
        const tokenRate = this.total(tokens);
        const total = CompareUtils.calcTotalRate(
            blockRate,
            roleRate,
            groupRate,
            topicRate,
            tokenRate
        );

        const result: ICompareResult<any> = {
            left: policy1.info(),
            right: policy2.info(),
            total,
            blocks: {
                columns,
                report: treeTable.object(),
            },
            roles: {
                columns,
                report: rolesTable.object(),
            },
            groups: {
                columns,
                report: groupsTable.object(),
            },
            topics: {
                columns,
                report: topicsTable.object(),
            },
            tokens: {
                columns,
                report: tokensTable.object(),
            }
        }
        return result;
    }

    public total(rates: IRate<any>[]): number {
        let total = 0;
        let count = 0;

        for (const child of rates) {
            total += child.total();
            count++;
        }

        if (count) {
            return Math.floor(total / count);
        }

        return 100;
    }

    public treeToTable(tree: BlocksRate, table: ReportTable, lvl: number): void {
        const item_1 = tree.left;
        const item_2 = tree.right;
        const row = table.createRow();

        row.set('lvl', lvl);
        row.set('type', tree.type);
        row.set('block_type', tree.blockType);

        row.setArray('properties', tree.getSubRate('properties'));
        row.setArray('events', tree.getSubRate('events'));
        row.setArray('permissions', tree.getSubRate('permissions'));
        row.setArray('artifacts', tree.getSubRate('artifacts'));

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

    private ratesToTable(rates: IRate<any>[], table: ReportTable): void {
        for (const child of rates) {
            this.rateToTable(child, table, 1);
        }
    }

    private rateToTable(rate: IRate<any>, table: ReportTable, lvl: number): ReportTable {
        const item_1 = rate.left;
        const item_2 = rate.right;
        const row = table.createRow();

        row.set('left', item_1?.toObject());
        row.set('right', item_2?.toObject());
        row.set('type', rate.type);
        row.setArray('properties', rate.getSubRate('properties'));

        if (item_1 && item_2) {
            row.set('total_rate', `${rate.getRateValue('total')}%`);
        } else {
            row.set('total_rate', `-`);
        }

        for (const child of rate.getChildren()) {
            table = this.rateToTable(child, table, lvl + 1);
        }
        return table;
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
        if (block1.key == block2.key) {
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
            result = MergeUtils.fullMerge<BlockModel>(children1, children2);
        } else if (type === Status.PARTLY) {
            result = MergeUtils.partlyMerge<BlockModel>(children1, children2, false);
        } else {
            result = MergeUtils.notMerge<BlockModel>(children1, children2);
        }
        const children: BlocksRate[] = [];
        for (const item of result) {
            children.push(this.compareTree(item.left, item.right, options));
        }
        return children;
    }

    private compareArray(
        children1: IWeightModel[],
        children2: IWeightModel[],
        options: ICompareOptions
    ): IRate<any>[] {
        let result = MergeUtils.partlyMerge<IWeightModel>(children1, children2, false);
        const rates: IRate<any>[] = [];
        for (const item of result) {
            const rate = new ObjectRate(item.left, item.right);
            rate.calc(options);
            rates.push(rate);
        }
        return rates;
    }
}
import { BlockModel } from '../models/block.model';
import { BlocksRate } from '../rates/blocks-rate';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { PolicyModel } from '../models/policy.model';
import { ReportTable } from '../../table/report-table';
import { Status } from '../types/status.type';
import { IRateMap } from '../interfaces/rate-map.interface';
import { ICompareResult } from '../interfaces/compare-result.interface';
import { MergeUtils } from '../utils/merge-utils';
import { IWeightModel } from '../interfaces/weight-model.interface';
import { IRate } from '../interfaces/rate.interface';
import { ObjectRate } from '../rates/object-rate';
import { CompareUtils } from '../utils/utils';
import { CSV } from '../../table/csv';

/**
 * Component for comparing two policies
 */
export class PolicyComparator {
    /**
     * Properties
     * 0 - Don't compare
     * 1 - Only simple properties
     * 2 - All properties
     */
    private readonly propLvl: number;
    /**
     * Children
     * 0 - Don't compare
     * 1 - Only child blocks of the first level
     * 2 - All children
     */
    private readonly childLvl: number;
    /**
     * Events
     * 0 - Don't compare
     * 1 - All events
     */
    private readonly eventLvl: number;
    /**
     * UUID
     * 0 - Don't compare
     * 1 - All UUID
     */
    private readonly idLvl: number;
    /**
     * Compare Options
     */
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

    /**
     * Compare two policies
     * @param policy1 - left policy
     * @param policy2 - right policy
     * @public
     */
    public compare(policy1: PolicyModel, policy2: PolicyModel): ICompareResult<any> {
        const columnsRoles = [
            { name: 'left_name', label: 'Name', type: 'string' },
            { name: 'right_name', label: 'Name', type: 'string' },
            { name: 'total_rate', label: 'Total Rate', type: 'number' },
            { name: 'left', label: '', type: 'object' },
            { name: 'right', label: '', type: 'object' },
            { name: 'type', label: '', type: 'string' },
            { name: 'properties', label: '', type: 'object' }
        ];
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
        const rolesTable = new ReportTable(columnsRoles);
        const groupsTable = new ReportTable(columnsRoles);
        const topicsTable = new ReportTable(columnsRoles);
        const tokensTable = new ReportTable(columnsRoles);

        const tree = this.compareTree(policy1.tree, policy2.tree, this.options);
        const roles = this.compareArray(policy1.roles, policy2.roles, this.options);
        const groups = this.compareArray(policy1.groups, policy2.groups, this.options);
        const topics = this.compareArray(policy1.topics, policy2.topics, this.options);
        const tokens = this.compareArray(policy1.tokens, policy2.tokens, this.options);
        const blocks = this.treeToArray(tree, []);

        this.treeToTable(tree, treeTable, 1);
        this.ratesToTable(roles, rolesTable);
        this.ratesToTable(groups, groupsTable);
        this.ratesToTable(topics, topicsTable);
        this.ratesToTable(tokens, tokensTable);

        const blockRate = this.total(blocks);
        const roleRate = this.total(roles);
        const groupRate = this.total(groups);
        const topicRate = this.total(topics);
        const tokenRate = this.total(tokens);
        const otherRate = CompareUtils.calcTotalRate(
            roleRate,
            groupRate,
            topicRate,
            tokenRate
        );
        const total = CompareUtils.calcTotalRate(otherRate, blockRate);

        const result: ICompareResult<any> = {
            left: policy1.info(),
            right: policy2.info(),
            total,
            blocks: {
                columns,
                report: treeTable.object(),
            },
            roles: {
                columns: columnsRoles,
                report: rolesTable.object(),
            },
            groups: {
                columns: columnsRoles,
                report: groupsTable.object(),
            },
            topics: {
                columns: columnsRoles,
                report: topicsTable.object(),
            },
            tokens: {
                columns: columnsRoles,
                report: tokensTable.object(),
            }
        }
        return result;
    }

    /**
     * Calculate total rate
     * @param rates
     * @private
     */
    private total(rates: IRate<any>[]): number {
        let total = 0;
        let count = 0;

        for (const child of rates) {
            if (child.totalRate > 99) {
                total += 100;
            } else if (child.totalRate > 50) {
                total += 50;
            } else {
                total += 0;
            }
            count++;
        }

        if (count) {
            return Math.floor(total / count);
        }

        return 100;
    }

    /**
     * Convert tree to array
     * @param tree
     * @param result
     * @private
     */
    private treeToArray(tree: IRate<any>, result: IRate<any>[]): IRate<any>[] {
        result.push(tree);
        for (const child of tree.getChildren<BlocksRate>()) {
            this.treeToArray(child, result);
        }
        return result;
    }

    /**
     * Convert tree to table
     * @param tree
     * @param table
     * @param lvl
     * @private
     */
    private treeToTable(tree: BlocksRate, table: ReportTable, lvl: number): void {
        const leftItem = tree.left;
        const rightItem = tree.right;
        const row = table.createRow();

        row.set('lvl', lvl);
        row.set('type', tree.type);
        row.set('block_type', tree.blockType);

        row.setArray('properties', tree.getSubRate('properties'));
        row.setArray('events', tree.getSubRate('events'));
        row.setArray('permissions', tree.getSubRate('permissions'));
        row.setArray('artifacts', tree.getSubRate('artifacts'));

        row.set('left', leftItem?.toObject());
        row.set('right', rightItem?.toObject());

        if (leftItem) {
            row.set('left_type', leftItem.blockType);
            row.set('left_tag', leftItem.tag);
            row.set('left_index', leftItem.index);
        }
        if (rightItem) {
            row.set('right_type', rightItem.blockType);
            row.set('right_tag', rightItem.tag);
            row.set('right_index', rightItem.index);
        }
        if (leftItem && rightItem) {
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

    /**
     * Convert array to table
     * @param tree
     * @param table
     * @private
     */
    private ratesToTable(rates: IRate<any>[], table: ReportTable): void {
        for (const child of rates) {
            this.rateToTable(child, table, 1);
        }
    }

    /**
     * Convert tree to table
     * @param tree
     * @param table
     * @param lvl
     * @private
     */
    private rateToTable(rate: IRate<any>, table: ReportTable, lvl: number): ReportTable {
        const leftItem = rate.left;
        const rightItem = rate.right;
        const row = table.createRow();

        row.set('left', leftItem?.toObject());
        row.set('right', rightItem?.toObject());
        row.set('type', rate.type);
        row.setArray('properties', rate.getSubRate('properties'));

        if (leftItem) {
            row.set('left_name', leftItem.key);
        }
        if (rightItem) {
            row.set('right_name', rightItem.key);
        }
        if (leftItem && rightItem) {
            row.set('total_rate', `${rate.getRateValue('total')}%`);
        } else {
            row.set('total_rate', `-`);
        }

        for (const child of rate.getChildren()) {
            table = this.rateToTable(child, table, lvl + 1);
        }
        return table;
    }

    /**
     * Compare two trees
     * @param block1
     * @param block2
     * @param options
     * @private
     */
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
        if (block1.key === block2.key) {
            rate.type = Status.PARTLY;
            rate.children = this.compareChildren(Status.PARTLY, block1.children, block2.children, options);
            return rate;
        } else {
            rate.type = Status.LEFT_AND_RIGHT;
            rate.children = this.compareChildren(Status.LEFT_AND_RIGHT, block1.children, block2.children, options);
            return rate;
        }
    }

    /**
     * Compare two array (with children)
     * @param type
     * @param children1
     * @param children2
     * @param options
     * @private
     */
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

    /**
     * Compare two array (without children)
     * @param type
     * @param children1
     * @param children2
     * @param options
     * @private
     */
    private compareArray(
        children1: IWeightModel[],
        children2: IWeightModel[],
        options: ICompareOptions
    ): IRate<any>[] {
        const result = MergeUtils.partlyMerge<IWeightModel>(children1, children2, false);
        const rates: IRate<any>[] = [];
        for (const item of result) {
            const rate = new ObjectRate(item.left, item.right);
            rate.calc(options);
            rates.push(rate);
        }
        return rates;
    }

    /**
     * Convert result to CSV
     * @param result
     * @public
     */
    public csv(result: ICompareResult<any>): string {
        const csv = new CSV();

        csv.add('Policy 1').addLine();
        csv
            .add('Policy ID')
            .add('Policy Name')
            .add('Policy Description')
            .add('Policy Topic')
            .add('Policy Version')
            .addLine();
        csv
            .add(result.left.id)
            .add(result.left.name)
            .add(result.left.description)
            .add(result.left.instanceTopicId)
            .add(result.left.version)
            .addLine();
        csv.addLine();

        csv.add('Policy 2').addLine();
        csv
            .add('Policy ID')
            .add('Policy Name')
            .add('Policy Description')
            .add('Policy Topic')
            .add('Policy Version')
            .addLine();
        csv
            .add(result.right.id)
            .add(result.right.name)
            .add(result.right.description)
            .add(result.right.instanceTopicId)
            .add(result.right.version)
            .addLine();
        csv.addLine();

        csv.add('Policy Roles').addLine();
        CompareUtils.tableToCsv(csv, result.roles);
        csv.addLine();

        csv.add('Policy Groups').addLine();
        CompareUtils.tableToCsv(csv, result.groups);
        csv.addLine();

        csv.add('Policy Topics').addLine();
        CompareUtils.tableToCsv(csv, result.topics);
        csv.addLine();

        csv.add('Policy Tokens').addLine();
        CompareUtils.tableToCsv(csv, result.tokens);
        csv.addLine();

        csv.add('Policy Blocks').addLine();
        CompareUtils.tableToCsv(csv, result.blocks);
        csv.addLine();

        csv.add('Total').add(result.total + '%');

        return csv.result();
    }
}
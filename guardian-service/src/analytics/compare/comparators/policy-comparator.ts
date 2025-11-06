import { ReportTable, CSV } from '../table/index.js';
import { PolicyModel } from '../models/index.js';
import { BlocksRate } from '../rates/index.js';
import { ComparePolicyUtils, MultiCompareUtils, CompareUtils } from '../utils/index.js';
import { ICompareResult, IMultiCompareResult, IRate, IReportTable, CompareOptions, IChildrenLvl, IEventsLvl, IIdLvl, IKeyLvl, IPropertiesLvl, IRefLvl } from '../interfaces/index.js';

/**
 * Component for comparing two policies
 */
export class PolicyComparator {
    /**
     * Compare Options
     * @private
     */
    private readonly options: CompareOptions;

    constructor(options?: CompareOptions) {
        if (options) {
            this.options = options;
        } else {
            this.options = new CompareOptions(
                IPropertiesLvl.All,
                IChildrenLvl.All,
                IEventsLvl.All,
                IIdLvl.All,
                IKeyLvl.Default,
                IRefLvl.Default,
                null
            );
        }
    }

    /**
     * Compare policies
     * @param policies
     * @public
     */
    public compare(policies: PolicyModel[]): ICompareResult<any>[] {
        const left = policies[0];
        const rights = policies.slice(1);
        const results: ICompareResult<any>[] = [];
        for (const right of rights) {
            const result = this.compareTwoPolicies(left, right);
            results.push(result);
        }
        return results;
    }

    /**
     * Compare two policies
     * @param policy1 - left policy
     * @param policy2 - right policy
     * @private
     */
    private compareTwoPolicies(policy1: PolicyModel, policy2: PolicyModel): ICompareResult<any> {
        const blockColumns = [
            { name: 'lvl', label: 'Offset', type: 'number' },
            { name: 'type', label: '', type: 'string' },
            { name: 'block_type', label: '', type: 'string' },
            { name: 'left_index', label: 'Index', type: 'number' },
            { name: 'left_type', label: 'Type', type: 'string' },
            { name: 'left_tag', label: 'Tag', type: 'string' },
            { name: 'right_index', label: 'Index', type: 'number' },
            { name: 'right_type', label: 'Type', type: 'string' },
            { name: 'right_tag', label: 'Tag', type: 'string' },
            { name: 'index_rate', label: 'Index Rate', type: 'number', display: 'Rate' },
            { name: 'permission_rate', label: 'Permission Rate', type: 'number', display: 'Rate' },
            { name: 'prop_rate', label: 'Prop Rate', type: 'number', display: 'Rate' },
            { name: 'event_rate', label: 'Event Rate', type: 'number', display: 'Rate' },
            { name: 'artifacts_rate', label: 'Artifact Rate', type: 'number', display: 'Rate' },
            { name: 'total_rate', label: 'Total Rate', type: 'number', display: 'Rate' },
            { name: 'left', label: '', type: 'object' },
            { name: 'right', label: '', type: 'object' },
            { name: 'properties', label: '', type: 'object' },
            { name: 'events', label: '', type: 'object' },
            { name: 'permissions', label: '', type: 'object' },
            { name: 'artifacts', label: '', type: 'object' }
        ];
        const propColumns = [
            { name: 'left_name', label: 'Name', type: 'string' },
            { name: 'right_name', label: 'Name', type: 'string' },
            { name: 'total_rate', label: 'Total Rate', type: 'number', display: 'Rate' },
            { name: 'left', label: '', type: 'object' },
            { name: 'right', label: '', type: 'object' },
            { name: 'type', label: '', type: 'string' },
            { name: 'properties', label: '', type: 'object' }
        ];
        const treeTable = new ReportTable(blockColumns);
        const rolesTable = new ReportTable(propColumns);
        const groupsTable = new ReportTable(propColumns);
        const topicsTable = new ReportTable(propColumns);
        const tokensTable = new ReportTable(propColumns);
        const toolsTable = new ReportTable(propColumns);

        const tree = ComparePolicyUtils.compareBlocks(policy1.tree, policy2.tree, this.options);
        const roles = ComparePolicyUtils.compareArray(policy1.roles, policy2.roles, this.options);
        const groups = ComparePolicyUtils.compareArray(policy1.groups, policy2.groups, this.options);
        const topics = ComparePolicyUtils.compareArray(policy1.topics, policy2.topics, this.options);
        const tokens = ComparePolicyUtils.compareArray(policy1.tokens, policy2.tokens, this.options);
        const tools = ComparePolicyUtils.compareArray(policy1.tools, policy2.tools, this.options);
        const blocks = ComparePolicyUtils.treeToArray(tree, []);

        this.treeToTable(tree, treeTable, 1);
        this.ratesToTable(roles, rolesTable);
        this.ratesToTable(groups, groupsTable);
        this.ratesToTable(topics, topicsTable);
        this.ratesToTable(tokens, tokensTable);
        this.ratesToTable(tools, toolsTable);

        const blockRate = CompareUtils.total(blocks);
        const roleRate = CompareUtils.total(roles);
        const groupRate = CompareUtils.total(groups);
        const topicRate = CompareUtils.total(topics);
        const tokenRate = CompareUtils.total(tokens);
        const toolsRate = CompareUtils.total(tools);
        const otherRate = CompareUtils.calcTotalRate(roleRate, groupRate, topicRate, tokenRate, toolsRate);
        const total = CompareUtils.calcTotalRate(otherRate, blockRate);

        const result: ICompareResult<any> = {
            left: policy1.info(),
            right: policy2.info(),
            total,
            blocks: {
                columns: blockColumns,
                report: treeTable.object(),
            },
            roles: {
                columns: propColumns,
                report: rolesTable.object(),
            },
            groups: {
                columns: propColumns,
                report: groupsTable.object(),
            },
            topics: {
                columns: propColumns,
                report: topicsTable.object(),
            },
            tokens: {
                columns: propColumns,
                report: tokensTable.object(),
            },
            tools: {
                columns: propColumns,
                report: toolsTable.object(),
            }
        }
        return result;
    }

    /**
     * Merge compare results
     * @param policies
     * @public
     */
    public mergeCompareResults(results: ICompareResult<any>[]): IMultiCompareResult<any> {
        const blocksTable = this.mergeBlockTables(results.map(r => r.blocks));
        const rolesTable = this.mergePropTables(results.map(r => r.roles));
        const groupsTable = this.mergePropTables(results.map(r => r.groups));
        const topicsTable = this.mergePropTables(results.map(r => r.topics));
        const tokensTable = this.mergePropTables(results.map(r => r.tokens));
        const toolTable = this.mergePropTables(results.map(r => r.tools));
        const multiResult: IMultiCompareResult<any> = {
            size: results.length + 1,
            left: results[0].left,
            rights: results.map(r => r.right),
            totals: results.map(r => r.total),
            blocks: blocksTable,
            roles: rolesTable,
            groups: groupsTable,
            topics: topicsTable,
            tokens: tokensTable,
            tools: toolTable
        };
        return multiResult;
    }

    /**
     * Calculate total rate
     * @param rates
     * @private
     */
    private mergeBlockTables(tables: IReportTable[]): IReportTable {
        const blockColumns: any[] = [
            { name: 'lvl', label: 'Offset', type: 'number' },
            { name: 'block_type', label: '', type: 'string' },
            { name: 'left', label: '', type: 'object' },
            { name: 'left_index', label: 'Index', type: 'number' },
            { name: 'left_type', label: 'Type', type: 'string' },
            { name: 'left_tag', label: 'Tag', type: 'string' },
            { name: 'properties', label: '', type: 'object' },
            { name: 'events', label: '', type: 'object' },
            { name: 'permissions', label: '', type: 'object' },
            { name: 'artifacts', label: '', type: 'object' }
        ];
        for (let index = 0; index < tables.length; index++) {
            const i = index + 1;
            blockColumns.push({ name: `type_${i}`, label: '', type: 'string' });
            blockColumns.push({ name: `right_${i}`, label: '', type: 'object' });
            blockColumns.push({ name: `right_index_${i}`, label: 'Index', type: 'number' });
            blockColumns.push({ name: `right_type_${i}`, label: 'Type', type: 'string' });
            blockColumns.push({ name: `right_tag_${i}`, label: 'Tag', type: 'string' });
            blockColumns.push({ name: `index_rate_${i}`, label: 'Index Rate', type: 'number', display: 'Rate' });
            blockColumns.push({ name: `permission_rate_${i}`, label: 'Permission Rate', type: 'number', display: 'Rate' });
            blockColumns.push({ name: `prop_rate_${i}`, label: 'Prop Rate', type: 'number', display: 'Rate' });
            blockColumns.push({ name: `event_rate_${i}`, label: 'Event Rate', type: 'number', display: 'Rate' });
            blockColumns.push({ name: `artifacts_rate_${i}`, label: 'Artifact Rate', type: 'number', display: 'Rate' });
            blockColumns.push({ name: `total_rate_${i}`, label: 'Total Rate', type: 'number', display: 'Rate' });
        }

        const mergeResults = MultiCompareUtils.mergeTables<any>(tables);
        const table: any[] = [];
        for (const mergeResult of mergeResults) {
            const cols = mergeResult.cols;
            const size = cols.length - 1;

            const row: any = { size };
            for (let index = 0; index < cols.length; index++) {
                const colData = cols[index];
                if (colData) {
                    if (index === 0) {
                        row[`lvl`] = colData.lvl;
                        row[`block_type`] = colData.block_type;
                        row[`left`] = colData.left;
                        row[`left_index`] = colData.left_index;
                        row[`left_type`] = colData.left_type;
                        row[`left_tag`] = colData.left_tag;
                    } else {
                        row[`lvl`] = colData.lvl;
                        row[`block_type`] = colData.block_type;
                        row[`type_${index}`] = colData.type;
                        row[`right_${index}`] = colData.right;
                        row[`right_index_${index}`] = colData.right_index;
                        row[`right_type_${index}`] = colData.right_type;
                        row[`right_tag_${index}`] = colData.right_tag;
                        row[`index_rate_${index}`] = colData.index_rate;
                        row[`permission_rate_${index}`] = colData.permission_rate;
                        row[`prop_rate_${index}`] = colData.prop_rate;
                        row[`event_rate_${index}`] = colData.event_rate;
                        row[`artifacts_rate_${index}`] = colData.artifacts_rate;
                        row[`total_rate_${index}`] = colData.total_rate;
                    }
                }
            }

            this.mergeRateTables(row, cols, 'properties');
            this.mergeRateTables(row, cols, 'events');
            this.mergeRateTables(row, cols, 'permissions');
            this.mergeRateTables(row, cols, 'artifacts');

            table.push(row);
        }
        return {
            columns: blockColumns,
            report: table,
        }
    }

    /**
     * Merge table
     * @param tables
     * @private
     */
    private mergePropTables(tables: IReportTable[]): IReportTable {
        const propColumns = [
            { name: 'left', label: '', type: 'object' },
            { name: 'left_name', label: 'Name', type: 'string' },
            { name: 'properties', label: '', type: 'object' }
        ];
        for (let index = 0; index < tables.length; index++) {
            propColumns.push({ name: `right_${index + 1}`, label: '', type: 'object' });
            propColumns.push({ name: `right_name_${index + 1}`, label: 'Name', type: 'string' });
            propColumns.push({ name: `total_rate_${index + 1}`, label: 'Total Rate', type: 'number' });
            propColumns.push({ name: `type_${index + 1}`, label: '', type: 'string' });
        }

        const mergeResults = MultiCompareUtils.mergeTables<any>(tables);
        const table: any[] = [];
        for (const mergeResult of mergeResults) {
            const cols = mergeResult.cols;
            const size = cols.length - 1;

            const row: any = { size };
            for (let index = 0; index < cols.length; index++) {
                const colData = cols[index];
                if (colData) {
                    if (index === 0) {
                        row.left = colData.left;
                        row.left_name = colData.left_name;
                    } else {
                        row[`right_${index}`] = colData.right;
                        row[`right_name_${index}`] = colData.right_name;
                        row[`total_rate_${index}`] = colData.total_rate;
                        row[`type_${index}`] = colData.type;
                    }
                }
            }

            this.mergeRateTables(row, cols, 'properties');

            table.push(row);
        }
        return {
            columns: propColumns,
            report: table,
        }
    }

    /**
     * Merge Rates
     * @param rates
     * @private
     */
    private mergeRateTables(row: any, cols: any[], propName: string): any {
        row[propName] = [];
        const data: any[] = [];
        for (const colData of cols) {
            if (colData) {
                data.push(colData[propName]);
            } else {
                data.push(null);
            }
        }
        const mergeResults = MultiCompareUtils.mergeRates<any>(data);
        for (const mergeResult of mergeResults) {
            const propRow: any[] = mergeResult.cols.slice();
            row[propName].push(propRow);
        }
        return row;
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
     * Convert result to CSV
     * @param result
     * @public
     */
    public tableToCsv(results: ICompareResult<any>[]): string {
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
            .add(results[0].left.id)
            .add(results[0].left.name)
            .add(results[0].left.description)
            .add(results[0].left.instanceTopicId)
            .add(results[0].left.version)
            .addLine();

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            csv.addLine();
            csv.add(`Policy ${i + 2}`).addLine();
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

            csv.add('Policy Tools').addLine();
            CompareUtils.tableToCsv(csv, result.tools);
            csv.addLine();

            csv.add('Policy Blocks').addLine();
            CompareUtils.tableToCsv(csv, result.blocks);
            csv.addLine();

            csv.add('Total')
                .add(result.total + '%')
                .addLine();
        }

        return csv.result();
    }

    /**
     * Convert result
     * @param result
     * @public
     */
    public to(results: ICompareResult<any>[], type: string): any {
        if (results.length === 1) {
            if (type === 'csv') {
                return this.tableToCsv(results);
            } else {
                return results[0];
            }
        } else if (results.length > 1) {
            if (type === 'csv') {
                return this.tableToCsv(results)
            } else {
                return this.mergeCompareResults(results);
            }
        } else {
            throw new Error('Invalid size');
        }
    }
}
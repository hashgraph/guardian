import { DatabaseServer } from '@guardian/common';
import { CompareOptions, IChildrenLvl, IEventsLvl, IIdLvl, IKeyLvl, IPropertiesLvl, IRefLvl } from '../interfaces/compare-options.interface.js';
import { ToolModel } from '../models/tool.model.js';
import { SchemaModel } from '../models/schema.model.js';
import { ICompareResult } from '../interfaces/compare-result.interface.js';
import { IMultiCompareResult } from '../interfaces/multi-compare-result.interface.js';
import { FileModel } from '../models/file.model.js';
import { ReportTable } from '../../table/report-table.js';
import { ComparePolicyUtils } from '../utils/compare-policy-utils.js';
import { BlocksRate } from '../rates/blocks-rate.js';
import { IRate } from '../interfaces/rate.interface.js';
import { CompareUtils } from '../utils/utils.js';
import { CSV } from '../../table/csv.js';
import { IReportTable } from '../interfaces/report-table.interface.js';
import { MultiCompareUtils } from '../utils/multi-compare-utils.js';

/**
 * Component for comparing tools
 */
export class ToolComparator {
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
     * Compare tools
     * @param tools
     * @public
     */
    public compare(tools: ToolModel[]): ICompareResult<any>[] {
        const left = tools[0];
        const rights = tools.slice(1);
        const results: ICompareResult<any>[] = [];
        for (const right of rights) {
            const result = this.compareTwoTools(left, right);
            results.push(result);
        }
        return results;
    }

    /**
     * Compare two tools
     * @param tool1 - left tool
     * @param tool2 - right tool
     * @private
     */
    private compareTwoTools(tool1: ToolModel, tool2: ToolModel): ICompareResult<any> {
        const blockColumns = [
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
        const columnsVariables = [
            { name: 'left_name', label: 'Name', type: 'string' },
            { name: 'right_name', label: 'Name', type: 'string' },
            { name: 'total_rate', label: 'Total Rate', type: 'number' },
            { name: 'left', label: '', type: 'object' },
            { name: 'right', label: '', type: 'object' },
            { name: 'type', label: '', type: 'string' },
            { name: 'properties', label: '', type: 'object' }
        ];

        const treeTable = new ReportTable(blockColumns);
        const inputEventsTable = new ReportTable(columnsVariables);
        const outputEventsTable = new ReportTable(columnsVariables);
        const variablesTable = new ReportTable(columnsVariables);

        const tree = ComparePolicyUtils.compareBlocks(tool1.tree, tool2.tree, this.options);
        const inputEvents = ComparePolicyUtils.compareArray(tool1.inputEvents, tool2.inputEvents, this.options);
        const outputEvents = ComparePolicyUtils.compareArray(tool1.outputEvents, tool2.outputEvents, this.options);
        const variables = ComparePolicyUtils.compareArray(tool1.variables, tool2.variables, this.options);
        const blocks = ComparePolicyUtils.treeToArray(tree, []);

        this.treeToTable(tree, treeTable, 1);
        this.ratesToTable(inputEvents, inputEventsTable);
        this.ratesToTable(outputEvents, outputEventsTable);
        this.ratesToTable(variables, variablesTable);

        const blockRate = CompareUtils.total(blocks);
        const groupRate = CompareUtils.total(inputEvents);
        const topicRate = CompareUtils.total(outputEvents);
        const tokenRate = CompareUtils.total(variables);
        const otherRate = CompareUtils.calcTotalRate(
            groupRate,
            topicRate,
            tokenRate
        );
        const total = CompareUtils.calcTotalRate(otherRate, blockRate);

        const result: ICompareResult<any> = {
            left: tool1.info(),
            right: tool2.info(),
            total,
            blocks: {
                columns: blockColumns,
                report: treeTable.object(),
            },
            inputEvents: {
                columns: columnsVariables,
                report: inputEventsTable.object(),
            },
            outputEvents: {
                columns: columnsVariables,
                report: outputEventsTable.object(),
            },
            variables: {
                columns: columnsVariables,
                report: variablesTable.object(),
            }
        }
        return result;
    }

    /**
     * Merge compare results
     * @param results
     * @public
     */
    public static mergeCompareResults(results: ICompareResult<any>[]): IMultiCompareResult<any> {
        const blocksTable = ToolComparator.mergeBlockTables(results.map(r => r.blocks));
        const inputEventsTable = ToolComparator.mergePropTables(results.map(r => r.inputEvents));
        const outputEventsTable = ToolComparator.mergePropTables(results.map(r => r.outputEvents));
        const variablesTable = ToolComparator.mergePropTables(results.map(r => r.variables));

        const multiResult: IMultiCompareResult<any> = {
            size: results.length + 1,
            left: results[0].left,
            rights: results.map(r => r.right),
            totals: results.map(r => r.total),
            blocks: blocksTable,
            inputEvents: inputEventsTable,
            outputEvents: outputEventsTable,
            variables: variablesTable
        };
        return multiResult;
    }

    /**
     * Merge table
     * @param tables
     * @private
     */
    private static mergeBlockTables(tables: IReportTable[]): IReportTable {
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

            ToolComparator.mergeRateTables(row, cols, 'properties');
            ToolComparator.mergeRateTables(row, cols, 'events');
            ToolComparator.mergeRateTables(row, cols, 'permissions');
            ToolComparator.mergeRateTables(row, cols, 'artifacts');

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
    private static mergePropTables(tables: IReportTable[]): IReportTable {
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

            ToolComparator.mergeRateTables(row, cols, 'properties');

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
    private static mergeRateTables(row: any, cols: any[], propName: string): any {
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
     * Convert result to CSV
     * @param result
     * @public
     */
    public static tableToCsv(results: ICompareResult<any>[]): string {
        const csv = new CSV();

        csv.add('Tool 1').addLine();
        csv
            .add('Tool ID')
            .add('Tool Name')
            .add('Tool Description')
            .add('Tool Hash')
            .add('Tool Message')
            .addLine();
        csv
            .add(results[0].left.id)
            .add(results[0].left.name)
            .add(results[0].left.description)
            .add(results[0].left.hash)
            .add(results[0].left.messageId)
            .addLine();

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            csv.addLine();
            csv.add(`Tool ${i + 2}`).addLine();
            csv
                .add('Tool ID')
                .add('Tool Name')
                .add('Tool Description')
                .add('Tool Hash')
                .add('Tool Message')
                .addLine();
            csv
                .add(result.right.id)
                .add(result.right.name)
                .add(result.right.description)
                .add(result.right.hash)
                .add(result.right.messageId)
                .addLine();
            csv.addLine();

            csv.add('Tool Input Events').addLine();
            CompareUtils.tableToCsv(csv, result.inputEvents);
            csv.addLine();

            csv.add('Tool Output Events').addLine();
            CompareUtils.tableToCsv(csv, result.outputEvents);
            csv.addLine();

            csv.add('Tool Variables').addLine();
            CompareUtils.tableToCsv(csv, result.variables);
            csv.addLine();

            csv.add('Tool Blocks').addLine();
            CompareUtils.tableToCsv(csv, result.blocks);
            csv.addLine();

            csv.add('Total')
                .add(result.total + '%')
                .addLine();
        }

        return csv.result();
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
     * Create tool model
     * @param toolId
     * @param options
     * @public
     * @static
     */
    public static async createModelById(toolId: string, options: CompareOptions): Promise<ToolModel> {
        //Tool
        const tool = await DatabaseServer.getToolById(toolId);

        if (!tool) {
            throw new Error('Unknown tool');
        }

        const toolModel = new ToolModel(tool, options);

        //Schemas
        const schemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });

        const schemaModels: SchemaModel[] = [];
        for (const schema of schemas) {
            const m = new SchemaModel(schema, options);
            m.setTool(tool);
            m.update(options);
            schemaModels.push(m);
        }
        toolModel.setSchemas(schemaModels);

        //Artifacts
        const files = await DatabaseServer.getArtifacts({ toolId });
        const artifactsModels: FileModel[] = [];
        for (const file of files) {
            const data = await DatabaseServer.getArtifactFileByUUID(file.uuid);
            const f = new FileModel(file, data, options);
            f.update(options);
            artifactsModels.push(f);
        }
        toolModel.setArtifacts(artifactsModels);

        //Compare
        toolModel.update();

        return toolModel;
    }
}

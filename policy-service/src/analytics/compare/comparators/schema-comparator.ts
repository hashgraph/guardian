import { ICompareOptions } from '../interfaces/compare-options.interface';
import { ReportTable } from '../../table/report-table';
import { Status } from '../types/status.type';
import { SchemaModel } from '../models/schema.model';
import { FieldModel } from '../models/field.model';
import { FieldsRate } from '../rates/fields-rate';
import { IRate } from '../interfaces/rate.interface';
import { ICompareResult } from '../interfaces/compare-result.interface';
import { MergeUtils } from '../utils/merge-utils';
import { IRateMap } from '../interfaces/rate-map.interface';
import { CSV } from '../../table/csv';
import { CompareUtils } from '../utils/utils';

/**
 * Component for comparing two schemas
 */
export class SchemaComparator {
    /**
     * Compare Options
     * @private
     */
    private readonly options: ICompareOptions;

    constructor(options?: ICompareOptions) {
        if (options) {
            this.options = options;
        } else {
            this.options = {
                propLvl: 2,
                childLvl: 0,
                eventLvl: 0,
                idLvl: 1,
            }
        }
    }

    /**
     * Compare two schemas
     * @param schema1 - left schema
     * @param schema2 - right schema
     * @public
     */
    public compare(schema1: SchemaModel, schema2: SchemaModel): ICompareResult<any> {
        const columns = [
            { name: 'lvl', label: 'Offset', type: 'number' },
            { name: 'left_index', label: 'Index', type: 'number' },
            { name: 'left_name', label: 'Field Name', type: 'string' },
            { name: 'right_index', label: 'Index', type: 'number' },
            { name: 'right_name', label: 'Field Name', type: 'string' },
            { name: 'index_rate', label: 'Index Rate', type: 'number' },
            { name: 'prop_rate', label: 'Prop Rate', type: 'number' },
            { name: 'total_rate', label: 'Total Rate', type: 'number' },

            { name: 'type', label: '', type: 'string' },
            { name: 'left', label: '', type: 'object' },
            { name: 'right', label: '', type: 'object' },
            { name: 'properties', label: '', type: 'object' }
        ];
        const table = new ReportTable(columns);
        const rates = this.compareSchemas(schema1, schema2, this.options);
        this.ratesToTable(rates, table);

        const result: ICompareResult<any> = {
            left: schema1.info(),
            right: schema2.info(),
            total: this.total(rates),
            fields: {
                columns,
                report: table.object(),
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
            total += child.total();
            count++;
        }

        if (count) {
            return Math.floor(total / count);
        }

        return 100;
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

        row.set('lvl', lvl);
        row.set('type', rate.type);
        row.setArray('properties', rate.getSubRate('properties'));

        row.set('left', leftItem?.toObject());
        row.set('right', rightItem?.toObject());

        if (leftItem) {
            row.set('left_name', leftItem.name);
            row.set('left_index', leftItem.order);
        }
        if (rightItem) {
            row.set('right_name', rightItem.name);
            row.set('right_index', rightItem.order);
        }
        if (leftItem && rightItem) {
            row.set('index_rate', `${rate.getRateValue('index')}%`);
            row.set('prop_rate', `${rate.getRateValue('properties')}%`);
            row.set('total_rate', `${rate.getRateValue('total')}%`);
        } else {
            row.set('index_rate', `-`);
            row.set('prop_rate', `-`);
            row.set('total_rate', `-`);
        }
        for (const child of rate.getChildren()) {
            table = this.rateToTable(child, table, lvl + 1);
        }
        return table;
    }

    /**
     * Compare two trees
     * @param schema1
     * @param schema2
     * @param options
     * @private
     */
    private compareSchemas(schema1: SchemaModel, schema2: SchemaModel, options: ICompareOptions): IRate<any>[] {
        const fields = this.compareArray(Status.PARTLY, schema1.fields, schema2.fields, options);
        return fields;
    }

    /**
     * Compare two trees
     * @param fields1
     * @param fields2
     * @param options
     * @private
     */
    private compareField(field1: FieldModel, field2: FieldModel, options: ICompareOptions): FieldsRate {
        const rate = new FieldsRate(field1, field2);
        rate.calc(options);
        if (!field1 && !field2) {
            return rate;
        }
        if (field1 && !field2) {
            rate.type = Status.LEFT;
            rate.fields = this.compareArray(Status.LEFT, field1.children, null, options);
            return rate;
        }
        if (!field1 && field2) {
            rate.type = Status.RIGHT;
            rate.fields = this.compareArray(Status.RIGHT, null, field2.children, options);
            return rate;
        }
        if (field1.equal(field2)) {
            rate.type = Status.FULL;
            rate.fields = this.compareArray(Status.FULL, field1.children, field2.children, options);
            return rate;
        }
        rate.type = Status.PARTLY;
        rate.fields = this.compareArray(Status.PARTLY, field1.children, field2.children, options);
        return rate;
    }

    /**
     * Compare two array
     * @param type
     * @param fields1
     * @param fields2
     * @param options
     * @private
     */
    private compareArray(
        type: Status,
        fields1: FieldModel[],
        fields2: FieldModel[],
        options: ICompareOptions
    ): FieldsRate[] {
        let result: IRateMap<FieldModel>[];
        if (type === Status.FULL) {
            result = MergeUtils.fullMerge<FieldModel>(fields1, fields2);
        } else if (type === Status.PARTLY) {
            result = MergeUtils.partlyMerge<FieldModel>(fields1, fields2, false);
        } else {
            result = MergeUtils.notMerge<FieldModel>(fields1, fields2);
        }
        const children: FieldsRate[] = [];
        for (const item of result) {
            children.push(this.compareField(item.left, item.right, options));
        }
        return children;
    }

    /**
     * Convert result to CSV
     * @param result
     * @public
     */
    public csv(result: ICompareResult<any>): string {
        const csv = new CSV();

        csv.add('Schema 1').addLine();
        csv
            .add('Schema ID')
            .add('Schema Name')
            .add('Schema Description')
            .add('Schema Topic')
            .add('Schema Version')
            .addLine();
        csv
            .add(result.left.iri)
            .add(result.left.name)
            .add(result.left.description)
            .add(result.left.topicId)
            .add(result.left.version)
            .addLine();
        csv.addLine();

        csv.add('Schema 2').addLine();
        csv
            .add('Schema ID')
            .add('Schema Name')
            .add('Schema Description')
            .add('Schema Topic')
            .add('Schema Version')
            .addLine();
        csv
            .add(result.right.iri)
            .add(result.right.name)
            .add(result.right.description)
            .add(result.right.topicId)
            .add(result.right.version)
            .addLine();
        csv.addLine();

        csv.add('Schema Fields').addLine();
        CompareUtils.tableToCsv(csv, result.fields);
        csv.addLine();

        csv.add('Total').add(result.total + '%');

        return csv.result();
    }
}
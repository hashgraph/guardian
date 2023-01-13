import { ICompareOptions } from "../interfaces/compare-options.interface";
import { ReportTable } from "../../table/report-table";
import { Status } from "../types/status.type";
import { SchemaModel } from "../models/schema.model";
import { FieldModel } from "../models/field.model";
import { FieldsRate } from "../rates/fields-rate";
import { IRate } from "../interfaces/rate.interface";
import { ICompareResult } from "../interfaces/compare-result.interface";
import { MergeUtils } from "../utils/merge-utils";
import { IRateMap } from "../interfaces/rate-map.interface";
import { IWeightModel } from "../interfaces/model.interface";

export class SchemaComparator {
    private readonly options: ICompareOptions;

    constructor(options?: ICompareOptions) {
        if (options) {
            this.options = options;
        } else {
            this.options = {
                propLvl: 2,
                childLvl: 0,
                eventLvl: 0
            }
        }
    }

    public compare(
        schema1: SchemaModel,
        schema2: SchemaModel
    ): ICompareResult {
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

        const result: ICompareResult = {
            columns,
            left: schema1.info(),
            right: schema2.info(),
            report: table.object(),
            total: this.total(rates),
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

    private ratesToTable(rates: IRate<any>[], table: ReportTable): void {
        for (const child of rates) {
            this.rateToTable(child, table, 1);
        }
    }

    private rateToTable(rate: IRate<any>, table: ReportTable, lvl: number): ReportTable {
        const item_1 = rate.left;
        const item_2 = rate.right;
        const row = table.createRow();

        row.set('lvl', lvl);
        row.set('type', rate.type);
        row.setArray('properties', rate.getSubRate('properties'));

        row.set('left', item_1?.toObject());
        row.set('right', item_2?.toObject());

        if (item_1) {
            row.set('left_name', item_1.name);
            row.set('left_index', item_1.index);
        }
        if (item_2) {
            row.set('right_name', item_2.name);
            row.set('right_index', item_2.index);
        }
        if (item_1 && item_2) {
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

    private compareSchemas(schema1: SchemaModel, schema2: SchemaModel, options: ICompareOptions): IRate<any>[] {
        const fields = this.compareArray(Status.PARTLY, schema1.fields, schema2.fields, options);
        return fields;
    }

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
}
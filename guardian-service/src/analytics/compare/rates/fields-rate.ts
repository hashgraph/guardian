import { Status } from "../types/status.type";
import { IRate } from "../interfaces/rate.interface";
import { FieldModel } from "../models/field.model";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { PropertiesRate } from "./properties-rate";
import { Rate } from "./rate";
import { ConditionsRate } from "./conditions-rate";
import { IRateMap } from "../interfaces/rate-map.interface";
import { PropertyModel } from "../models/property.model";
import { CompareUtils } from "../utils/utils";

export class FieldsRate extends Rate<FieldModel> {
    public fields: FieldsRate[];
    public conditions: ConditionsRate[];

    public properties: PropertiesRate[];

    public propertiesRate: number;
    public indexRate: number;

    constructor(field1: FieldModel, field2: FieldModel) {
        super(field1, field2);
        if (field1 && field2) {
            this.totalRate = 100;
            this.type = Status.FULL;
        } else {
            if (field1) {
                this.type = Status.LEFT;
            } else {
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
        this.indexRate = -1;
        this.propertiesRate = -1;
    }

    private compareProp(
        field1: FieldModel,
        field2: FieldModel,
        options: ICompareOptions
    ): void {
        const list: string[] = [];
        const map: { [key: string]: IRateMap<PropertyModel<any>> } = {};

        if (field1) {
            const list1 = field1.getPropList();
            for (const item of list1) {
                list.push(item.path);
                map[item.path] = { left: item, right: null };
            }
        }

        if (field2) {
            const list2 = field2.getPropList();
            for (const item of list2) {
                if (map[item.path]) {
                    map[item.path].right = item;
                } else {
                    list.push(item.path);
                    map[item.path] = { left: null, right: item };
                }
            }
        }

        this.properties = [];
        for (const path of list) {
            const item = map[path];
            const rate = new PropertiesRate(item.left, item.right);
            rate.calc(options);
            this.properties.push(rate);
        }
    }

    public override calc(options: ICompareOptions): void {
        this.compareProp(this.left, this.right, options);

        if (!this.left || !this.right) {
            return;
        }

        this.indexRate = this.left.index === this.right.index ? 100 : 0;
        this.propertiesRate = CompareUtils.calcRate(this.properties);
        this.totalRate = CompareUtils.calcTotalRate(
            this.indexRate,
            this.propertiesRate
        );
    }

    public override getChildren<T extends IRate<any>>(): T[] {
        return this.fields as any;
    }

    public override getSubRate(name?: string): IRate<any>[] {
        return this.properties;
    }

    public override getRateValue(name: string): number {
        if (name === 'index') {
            return this.indexRate;
        }
        if (name === 'properties') {
            return this.propertiesRate;
        }
        return this.totalRate;
    }
}

import { Status } from "../types/status.type";
import { IRate } from "../interfaces/rate.interface";
import { FieldModel } from "../models/field.model";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { PropertiesRate } from "./properties-rate";
import { Rate } from "./rate";
import { ConditionsRate } from "./conditions-rate";

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

    private _calcRate<T>(rates: IRate<T>[]): number {
        let sum = 0;
        for (const item of rates) {
            if (item.totalRate > 0) {
                sum += item.totalRate;
            }
        }
        if (rates.length) {
            sum = sum / rates.length;
        } else {
            sum = 100;
        }
        sum = Math.min(Math.max(-1, Math.floor(sum)), 100);
        return sum;
    }

    private compareProp(field1: FieldModel, field2: FieldModel): void {
        const list: string[] = [];
        const map: any = {};

        if (field1) {
            const list1 = field1.getPropList();
            for (const item of list1) {
                list.push(item.path);
                map[item.path] = [item, null];
            }
        }

        if (field2) {
            const list2 = field2.getPropList();
            for (const item of list2) {
                if (map[item.path]) {
                    map[item.path][1] = item;
                } else {
                    list.push(item.path);
                    map[item.path] = [null, item];
                }
            }
        }

        this.properties = [];
        for (const path of list) {
            this.properties.push(new PropertiesRate(map[path][0], map[path][1]));
        }
    }

    public override calc(options: ICompareOptions): void {
        this.compareProp(this.left, this.right);

        if (!this.left || !this.right) {
            return;
        }

        this.indexRate = this.left.index === this.right.index ? 100 : 0;
        this.propertiesRate = this._calcRate(this.properties);
        this.totalRate = this.propertiesRate;
    }

    public override getChildren<T extends IRate<any>>(): T[] {
        return this.fields as any;
    }

    public override getSubRate(name: string): IRate<any>[] {
        if (name === 'properties' && this.properties) {
            return this.properties.map(p => p.toObject());
        }
        return null;
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

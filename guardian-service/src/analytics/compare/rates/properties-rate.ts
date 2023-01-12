import { Status } from "../types/status.type";
import { IRate } from "../interfaces/rate.interface";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { PropertyModel } from "../models/property.model";
import { PropertyType } from "../types/property.type";
import { CompareUtils } from "../utils/utils";
import { IRateMap } from "../interfaces/rate-map.interface";

export class PropertiesRate implements IRate<PropertyModel<any>> {
    public readonly left: PropertyModel<any>;
    public readonly right: PropertyModel<any>;

    public type: Status;
    public totalRate: number;

    public name: string;
    public path: string;
    public lvl: number;

    public propertiesRate: number;
    public properties: IRate<any>[];

    constructor(prop1: PropertyModel<any>, prop2: PropertyModel<any>) {
        this.left = prop1;
        this.right = prop2;
        this.propertiesRate = -1;
        this.totalRate = -1;
        this.properties = [];
        if (prop1) {
            this.name = prop1.name;
            this.path = prop1.path;
            this.lvl = prop1.lvl;
            if (prop2) {
                this.type = Status.NONE;
            } else {
                this.type = Status.LEFT;
            }
        } else {
            this.name = prop2.name;
            this.path = prop2.path;
            this.lvl = prop2.lvl;
            this.type = Status.RIGHT;
        }
    }

    public getChildren<T extends IRate<any>>(): T[] {
        return [];
    }

    public getSubRate(name?: string): IRate<any>[] {
        return this.properties;
    }

    private compareProp(
        prop1: PropertyModel<any>,
        prop2: PropertyModel<any>,
        options: ICompareOptions
    ): PropertiesRate[] {
        const list: string[] = [];
        const map: { [key: string]: IRateMap<PropertyModel<any>> } = {};

        if (prop1) {
            const list1 = prop1.getPropList();
            for (const item of list1) {
                list.push(item.path);
                map[item.path] = { left: item, right: null };
            }
        }

        if (prop2) {
            const list2 = prop2.getPropList();
            for (const item of list2) {
                if (map[item.path]) {
                    map[item.path].right = item;
                } else {
                    list.push(item.path);
                    map[item.path] = { left: null, right: item };
                }
            }
        }

        const rates: PropertiesRate[] = [];
        for (const path of list) {
            const item = map[path];
            const rate = new PropertiesRate(item.left, item.right);
            rate.calc(options);
            rates.push(rate);
        }
        return rates;
    }

    public calc(options: ICompareOptions): void {
        this.properties = this.compareProp(this.left, this.right, options);

        if (!this.left || !this.right) {
            return;
        }

        if (this.left.equal(this.right)) {
            this.totalRate = 100;
            this.type = Status.FULL;
        } else {
            this.totalRate = 0;
            this.type = Status.PARTLY;
        }

        this.propertiesRate = CompareUtils.calcRate(this.properties);
        this.totalRate = CompareUtils.calcTotalRate(this.totalRate, this.propertiesRate);
    }

    public toObject(): any {
        return {
            type: this.type,
            totalRate: this.totalRate,
            items: [
                this.left?.toObject(),
                this.right?.toObject()
            ],
            name: this.name,
            path: this.path,
            lvl: this.lvl,
        }
    }

    public getRateValue(name: string): number {
        return this.totalRate;
    }

    public total(): number {
        return this.totalRate;
    }
}

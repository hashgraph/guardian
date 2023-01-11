import { Status } from "../types/status.type";
import { IRate } from "../interfaces/rate.interface";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { PropertyModel } from "../models/property.model";

export class PropertiesRate implements IRate<PropertyModel<any>> {
    public readonly left: PropertyModel<any>;
    public readonly right: PropertyModel<any>;

    public type: Status;
    public totalRate: number;

    public name: string;
    public path: string;
    public lvl: number;

    constructor(prop1: PropertyModel<any>, prop2: PropertyModel<any>) {
        this.left = prop1;
        this.right = prop2;
        if (prop1 && prop2) {
            this.name = prop1.name;
            this.path = prop1.path;
            this.lvl = prop1.lvl;
            if (prop1.equal(prop2)) {
                this.totalRate = 100;
                this.type = Status.FULL;
            } else {
                this.totalRate = 0;
                this.type = Status.PARTLY;
            }
        } else {
            if (prop1) {
                this.name = prop1.name;
                this.path = prop1.path;
                this.lvl = prop1.lvl;
                this.type = Status.LEFT;
            } else {
                this.name = prop2.name;
                this.path = prop2.path;
                this.lvl = prop2.lvl;
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
    }

    public getChildren<T extends IRate<any>>(): T[] {
        return [];
    }

    public getSubRate(name: string): IRate<any>[] {
        return null;
    }

    public calc(options: ICompareOptions): void {
        return;
    }

    public toObject(): any {
        return {
            type: this.type,
            totalRate: this.totalRate,
            items: [this.left, this.right],
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

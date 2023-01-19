import { Status } from '../types/status.type';
import { IRate } from '../interfaces/rate.interface';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { PropertyModel } from '../models/property.model';
import { CompareUtils } from '../utils/utils';
import { IRateMap } from '../interfaces/rate-map.interface';

/**
 * Calculates the difference between two Properties
 */
export class PropertiesRate implements IRate<PropertyModel<any>> {
    /**
     * Left property
     */
    public readonly left: PropertyModel<any>;
    /**
     * Left property
     */
    public readonly right: PropertyModel<any>;
    /**
     * Degree of equality
     */
    public type: Status;
    /**
     * Total Rate (percentage)
     */
    public totalRate: number;
    /**
     * Property name
     */
    public name: string;
    /**
     * Property full path
     */
    public path: string;
    /**
     * Property nesting level
     */
    public lvl: number;
    /**
     * Properties Rate (percentage)
     */
    public propertiesRate: number;
    /**
     * Sub Properties (if value is object)
     */
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

    /**
     * Get Children Rates
     * @public
     */
    public getChildren<U extends IRate<any>>(): U[] {
        return [];
    }

    /**
     * Get sub rates by name
     * @param name - rate name
     * @public
     */
    public getSubRate(name?: string): IRate<any>[] {
        return this.properties;
    }

    /**
     * Compare two properties
     * @param prop1
     * @param prop2
     * @param options - comparison options
     * @private
     */
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

    /**
     * Calculations all rates
     * @param options - comparison options
     * @public
     */
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

    /**
     * Convert class to object
     * @public
     */
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

    /**
     * Get rate by name
     * @param name - rate name
     * @public
     */
    public getRateValue(name: string): number {
        return this.totalRate;
    }

    /**
     * Get total rate and total rate all children
     * @public
     */
    public total(): number {
        return this.totalRate;
    }
}

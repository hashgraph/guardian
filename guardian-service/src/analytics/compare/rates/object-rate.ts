import { Status } from '../types/status.type';
import { IRate } from '../interfaces/rate.interface';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { PropertiesRate } from './properties-rate';
import { Rate } from './rate';
import { IRateMap } from '../interfaces/rate-map.interface';
import { PropertyModel } from '../models/property.model';
import { CompareUtils } from '../utils/utils';
import { IWeightModel } from '../interfaces/weight-model.interface';

/**
 * Calculates the difference between two Object
 */
export class ObjectRate extends Rate<IWeightModel> {
    /**
     * Sub Properties (if value is object)
     */
    public properties: PropertiesRate[];
    /**
     * Properties Rate (percentage)
     */
    public propertiesRate: number;

    constructor(item1: IWeightModel, item2: IWeightModel) {
        super(item1, item2);
        if (item1 && item2) {
            this.totalRate = 100;
            this.type = Status.FULL;
        } else {
            if (item1) {
                this.type = Status.LEFT;
            } else {
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
        this.propertiesRate = -1;
    }

    /**
     * Compare two objects
     * @param item1
     * @param item2
     * @param options - comparison options
     * @private
     */
    private compare(item1: any, item2: any, options: ICompareOptions): void {
        const list: string[] = [];
        const map: { [key: string]: IRateMap<PropertyModel<any>> } = {};

        if (item1) {
            const list1 = item1.getPropList();
            for (const item of list1) {
                list.push(item.path);
                map[item.path] = { left: item, right: null };
            }
        }

        if (item2) {
            const list2 = item2.getPropList();
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

    /**
     * Calculations all rates
     * @param options - comparison options
     * @public
     */
    public override calc(options: ICompareOptions): void {
        this.compare(this.left, this.right, options);

        if (!this.left || !this.right) {
            return;
        }

        this.propertiesRate = CompareUtils.calcRate(this.properties);
        this.totalRate = CompareUtils.calcTotalRate(this.propertiesRate);
    }

    /**
     * Get sub rates by name
     * @param name - rate name
     * @public
     */
    public override getSubRate(name?: string): IRate<any>[] {
        return this.properties;
    }

    /**
     * Get rate by name
     * @param name - rate name
     * @public
     */
    public override getRateValue(name: string): number {
        if (name === 'properties') {
            return this.propertiesRate;
        }
        return this.totalRate;
    }
}

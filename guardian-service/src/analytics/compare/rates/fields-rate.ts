import { Status } from '../types/status.type.js';
import { IRate } from '../interfaces/rate.interface.js';
import { FieldModel } from '../models/field.model.js';
import { CompareOptions } from '../interfaces/compare-options.interface.js';
import { PropertiesRate } from './properties-rate.js';
import { Rate } from './rate.js';
import { IRateMap } from '../interfaces/rate-map.interface.js';
import { PropertyModel } from '../models/property.model.js';
import { CompareUtils } from '../utils/utils.js';

/**
 * Calculates the difference between two Fields
 */
export class FieldsRate extends Rate<FieldModel> {
    /**
     * Children
     */
    public fields: FieldsRate[];
    /**
     * Sub Properties (if value is object)
     */
    public properties: PropertiesRate[];
    /**
     * Properties Rate (percentage)
     */
    public propertiesRate: number;
    /**
     * Order Rate (percentage)
     */
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

    /**
     * Compare two fields
     * @param field1
     * @param field2
     * @param options - comparison options
     * @private
     */
    private compare(
        field1: FieldModel,
        field2: FieldModel,
        options: CompareOptions
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

        const _order = [
            'name',
            'title',
            'description',
            'required',
            'type',
            'format',
            'pattern',
            'customType',
            'unit',
            'unitSystem'
        ];
        list.sort((a, b) => {
            for (const key of _order) {
                if (a === key) {
                    return -1;
                }
                if (b === key) {
                    return 1;
                }
            }
            return a < b ? -1 : 1;
        });

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
    public override calc(options: CompareOptions): void {
        this.compare(this.left, this.right, options);

        if (!this.left || !this.right) {
            return;
        }

        this.indexRate = this.left.index === this.right.index ? 100 : 0;
        this.propertiesRate = CompareUtils.calcRate(this.properties);
        this.totalRate = CompareUtils.calcTotalRate(this.propertiesRate);
    }

    /**
     * Set children rates
     * @public
     */
    public setChildren<U extends IRate<any>>(children: U[]): void {
        this.fields = children as any;
    }

    /**
     * Get Children Rates
     * @public
     */
    public override getChildren<T extends IRate<any>>(): T[] {
        return this.fields as any;
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
        if (name === 'index') {
            return this.indexRate;
        }
        if (name === 'properties') {
            return this.propertiesRate;
        }
        return this.totalRate;
    }
}

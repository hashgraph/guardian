import { CompareOptions } from '../interfaces/compare-options.interface.js';
import { IRate } from '../interfaces/rate.interface.js';
import { Rate } from './rate.js';
import { DocumentModel } from '../models/document.model.js';
import { CompareUtils } from '../utils/utils.js';
import { IRateMap } from '../interfaces/rate-map.interface.js';
import { Status } from '../types/status.type.js';
import { PropertyModel } from '../models/property.model.js';
import { PropertiesRate } from './properties-rate.js';

/**
 * Calculates the difference between two Documents
 */
export class DocumentsRate extends Rate<DocumentModel> {
    /**
     * Document rate name
     */
    public static readonly DOCUMENTS_RATE: string = 'documents';

    /**
     * Options rate name
     */
    public static readonly OPTIONS_RATE: string = 'options';

    /**
     * Document type
     */
    public documentType: string;

    /**
     * Document schema
     */
    public schema: string;

    /**
     * Sub Blocks
     */
    public children: DocumentsRate[];

    /**
     * Document Rate (percentage)
     */
    public documentRate: number;

    /**
     * Options Rate (percentage)
     */
    public optionsRate: number;

    /**
     * Sub documents
     */
    public documents: IRate<any>[];

    /**
     * Sub options
     */
    public options: IRate<any>[];

    constructor(document1: DocumentModel, document2: DocumentModel) {
        super(document1, document2);

        this.type = Status.NONE;
        this.documentRate = -1;
        this.optionsRate = -1;
        this.documents = [];
        this.options = [];

        if (document1) {
            this.documentType = document1.type;
            this.schema = document1.key;
        } else if (document2) {
            this.documentType = document2.type;
            this.schema = document2.key;
        } else {
            throw new Error('Empty document model');
        }
    }

    /**
     * Compare two events
     * @param document1
     * @param document2
     * @param options - comparison options
     * @private
     */
    private compareDocuments(
        document1: DocumentModel,
        document2: DocumentModel,
        options: CompareOptions
    ): IRate<any>[] {
        const list: string[] = [];
        const map: { [key: string]: IRateMap<PropertyModel<any>> } = {};
        if (document1) {
            for (const item of document1.getFieldsList()) {
                map[item.key] = { left: item, right: null };
                list.push(item.key);
            }
        }
        if (document2) {
            for (const item of document2.getFieldsList()) {
                if (map[item.key]) {
                    map[item.key].right = item;
                } else {
                    map[item.key] = { left: null, right: item };
                    list.push(item.key);
                }
            }
        }
        list.sort();

        const rates: IRate<any>[] = [];
        for (const key of list) {
            const item = map[key];
            const rate = new PropertiesRate(item.left, item.right);
            rate.calc(options);
            rates.push(rate);
            const subRates = rate.getSubRate();
            for (const subRate of subRates) {
                rates.push(subRate);
            }
        }
        return rates;
    }

    /**
     * Compare two events
     * @param document1
     * @param document2
     * @param options - comparison options
     * @private
     */
    private compareOptions(
        document1: DocumentModel,
        document2: DocumentModel,
        options: CompareOptions
    ): IRate<any>[] {
        const list: string[] = [];
        const map: { [key: string]: IRateMap<PropertyModel<any>> } = {};
        if (document1) {
            for (const item of document1.getOptionsList()) {
                map[item.path] = { left: item, right: null };
                list.push(item.path);
            }
        }
        if (document2) {
            for (const item of document2.getOptionsList()) {
                if (map[item.path]) {
                    map[item.path].right = item;
                } else {
                    map[item.path] = { left: null, right: item };
                    list.push(item.path);
                }
            }
        }
        list.sort();

        const rates: IRate<any>[] = [];
        for (const path of list) {
            const item = map[path];
            const rate = new PropertiesRate(item.left, item.right);
            rate.calc(options);
            rates.push(rate);
            const subRates = rate.getSubRate();
            for (const subRate of subRates) {
                rates.push(subRate);
            }
        }
        return rates;
    }

    /**
     * Calculations all rates
     * @param options - comparison options
     * @public
     */
    public override calc(options: CompareOptions): void {
        const document1 = this.left;
        const document2 = this.right;

        this.documents = this.compareDocuments(document1, document2, options);
        this.options = this.compareOptions(document1, document2, options);

        if (!document1 || !document2) {
            return;
        }

        this.documentRate = CompareUtils.calcRate(this.documents);
        this.optionsRate = CompareUtils.calcRate(this.options);

        const rates = [];
        rates.push(this.documentRate);
        rates.push(this.optionsRate);
        this.totalRate = CompareUtils.calcTotalRates(rates);
    }

    /**
     * Set children rates
     * @public
     */
    public override setChildren<U extends IRate<any>>(children: U[]): void {
        this.children = children as any;
    }

    /**
     * Get Children Rates
     * @public
     */
    public override getChildren<T extends IRate<any>>(): T[] {
        return this.children as any;
    }

    /**
     * Get sub rates by name
     * @param name - rate name
     * @public
     */
    public getSubRate(name: string): IRate<any>[] {
        if (name === DocumentsRate.DOCUMENTS_RATE) {
            return this.documents;
        }
        if (name === DocumentsRate.OPTIONS_RATE) {
            return this.options;
        }
        return null;
    }

    /**
     * Get rate by name
     * @param name - rate name
     * @public
     */
    public override getRateValue(name: string): number {
        if (name === DocumentsRate.DOCUMENTS_RATE) {
            return this.documentRate;
        }
        if (name === DocumentsRate.OPTIONS_RATE) {
            return this.optionsRate;
        }
        return this.totalRate;
    }
}

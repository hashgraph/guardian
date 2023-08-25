import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IRate } from '../interfaces/rate.interface';
import { Rate } from './rate';
import { DocumentModel } from '../models/document.model';
import { CompareUtils } from '../utils/utils';
import { IRateMap } from '../interfaces/rate-map.interface';
import { Status } from '../types/status.type';

/**
 * Calculates the difference between two Documents
 */
export class DocumentsRate extends Rate<DocumentModel> {
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
        options: ICompareOptions
    ): IRate<any>[] {
        const rates: IRate<any>[] = [];
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
        options: ICompareOptions
    ): IRate<any>[] {
        const rates: IRate<any>[] = [];
        return rates;
    }

    /**
     * Calculations all rates
     * @param options - comparison options
     * @public
     */
    public override calc(options: ICompareOptions): void {
        const document1 = this.left;
        const document2 = this.right;

        this.documents = this.compareDocuments(document1, document2, options);
        this.options = this.compareOptions(document1, document2, options);

        if (!document1 || !document2) {
            return;
        }

        if(
            document1.id === document2.id || 
            document1.messageId === document2.messageId
        ) {
            this.documentRate = 100;
            this.optionsRate = 100;
            this.totalRate = 100;
            return;
        } else {
            this.documentRate = 0;
            this.optionsRate = 0;
            this.totalRate = 0;
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
     * Get rate by name
     * @param name - rate name
     * @public
     */
    public override getRateValue(name: string): number {
        if (name === 'document') {
            return this.documentRate;
        }
        if (name === 'options') {
            return this.optionsRate;
        }
        return this.totalRate;
    }
}
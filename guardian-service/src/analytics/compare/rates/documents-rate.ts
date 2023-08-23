import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IRate } from '../interfaces/rate.interface';
import { Rate } from './rate';
import { DocumentModel } from '../models/document.model';

/**
 * Calculates the difference between two Documents
 */
export class DocumentsRate extends Rate<DocumentModel> {
    /**
     * Sub Blocks
     */
    public children: DocumentsRate[];

    constructor(document1: DocumentModel, document2: DocumentModel) {
        super(document1, document2);
    }

    /**
     * Calculations all rates
     * @param options - comparison options
     * @public
     */
    public override calc(options: ICompareOptions): void {

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
}
import { CompareOptions, IRate } from '../interfaces/index.js';
import { Rate } from './rate.js';
import { DocumentsRate } from './documents-rate.js';
import { RecordModel } from '../models/index.js';

/**
 * Calculates the difference between two Documents
 */
export class RecordRate extends Rate<RecordModel> {
    /**
     * Sub Blocks
     */
    public children: DocumentsRate[];

    constructor(document1: RecordModel, document2: RecordModel) {
        super(document1, document2);
    }

    /**
     * Calculations all rates
     * @param options - comparison options
     * @public
     */
    public override calc(options: CompareOptions): void {
        this.totalRate = 100;
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
        return null;
    }

    /**
     * Get rate by name
     * @param name - rate name
     * @public
     */
    public override getRateValue(name: string): number {
        return this.totalRate;
    }
}

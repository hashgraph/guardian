import { CompareOptions } from '../interfaces/compare-options.interface';
import { IRate } from '../interfaces/rate.interface';
import { Rate } from './rate';
import { DocumentModel } from '../models/document.model';
import { CompareUtils } from '../utils/utils';
import { IRateMap } from '../interfaces/rate-map.interface';
import { Status } from '../types/status.type';
import { PropertyModel } from '../models/property.model';
import { PropertiesRate } from './properties-rate';
import { DocumentsRate } from './documents-rate';
import { RecordModel } from '../models/record.model';

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
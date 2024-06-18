import { Status } from '../types/index.js';
import { IRate, IModel } from '../interfaces/index.js';
import { Rate } from './rate.js';

/**
 * Root rate
 */
export class RootRate<T extends IModel> extends Rate<T> {
    /**
     * Children
     */
    public children: Rate<T>[];

    constructor() {
        super(null, null);
        this.totalRate = 100;
        this.type = Status.PARTLY;
    }

    /**
     * Set children rates
     * @public
     */
    public setChildren<U extends IRate<any>>(children: U[]): void {
        this.children = children as any;
    }

    /**
     * Get Children Rates
     * @public
     */
    public override getChildren<U extends IRate<any>>(): U[] {
        return this.children as U[];
    }
}

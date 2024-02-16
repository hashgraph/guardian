import MurmurHash3 from 'imurmurhash';

/**
 * Hash Utils
 */
export class HashUtils {
    /**
     * State
     * @private
     */
    private hashState: any;

    constructor() {
        this.hashState = MurmurHash3();
    }

    public add(data: string): HashUtils {
        this.hashState.hash(data);
        return this;
    }

    public result(): string {
        return String(this.hashState.result());
    }

    public reset(): HashUtils {
        this.hashState = MurmurHash3();
        return this;
    }

    /**
     * Aggregate hash
     * @param args - hash (array)
     * @public
     * @static
     */
    public static aggregateHash(...args: string[]): string {
        const hashState = MurmurHash3();
        for (const h of args) {
            hashState.hash(h);
        }
        return String(hashState.result());
    }
}
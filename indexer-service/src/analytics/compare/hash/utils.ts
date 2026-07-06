import MurmurHash3 from 'imurmurhash';
import * as crypto from 'node:crypto';
import bs58 from 'bs58';

/**
 * Hash Utils
 */
export class Hash3 {
    private hashState: any;

    constructor() {
        this.hashState = MurmurHash3();
    }

    public clear(): Hash3 {
        this.hashState = MurmurHash3();
        return this;
    }

    public add(data: string): Hash3 {
        if (typeof data === 'string') {
            this.hashState.hash(data);
        } else {
            this.hashState.hash(String(data));
        }
        return this;
    }

    public hash(data: string): Hash3 {
        if (typeof data === 'string') {
            this.hashState.hash(data);
        } else {
            this.hashState.hash(String(data));
        }
        return this;
    }

    public result(): string {
        return String(this.hashState.result());
    }

    /**
     * Aggregate hash
     * @param args - hash (array)
     * @public
     * @static
     */
    public static aggregate(...args: string[]): string {
        const hashState = MurmurHash3();
        for (const value of args) {
            hashState.hash(value);
        }
        return String(hashState.result());
    }
}

/**
 * Hash Utils
 */
export class Sha256 {
    public static hash(data: crypto.BinaryLike | string) {
        return crypto
            .createHash('sha256')
            .update(data || '')
            .digest()
            .toString();
    }

    public static base58(data: crypto.BinaryLike | string) {
        try {
            const sha256 = crypto
                .createHash('sha256')
                .update(data)
                .digest();
            return bs58.encode(sha256);
        } catch (error) {
            return '';
        }
    }
}

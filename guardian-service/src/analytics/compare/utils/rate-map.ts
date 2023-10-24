import { IRateMap } from '../interfaces/rate-map.interface';
import { CompareUtils } from './utils';

/**
 * Mapping items
 */
export class RateMap<T> {
    /**
     * List
     */
    private readonly map: IRateMap<T>[];

    constructor() {
        this.map = [];
    }

    /**
     * Add left item
     * @param left
     */
    public addLeft(left: T): void {
        this.map.push({ left, right: null });
    }

    /**
     * Add right item
     * @param right
     */
    public addRight(right: T): void {
        CompareUtils.mapping<T>(this.map, right);
    }

    /**
     * Push items
     * @param item
     */
    public push(item: IRateMap<T>): void {
        this.map.push(item);
    }

    /**
     * Unshift items
     * @param item
     */
    public unshift(item: IRateMap<T>): void {
        this.map.unshift(item);
    }

    /**
     * Sort items
     * @param compareFn
     */
    public sort(compareFn?: (a: IRateMap<T>, b: IRateMap<T>) => number): void {
        this.map.sort(compareFn);
    }

    /**
     * Get items
     */
    public getList(): IRateMap<T>[] {
        return this.map;
    }
}

/**
 * Mapping items
 */
export class RateKeyMap<T> {
    /**
     * Item keys
     */
    private readonly keys: string[];

    /**
     * Items by key
     */
    private readonly map: { [key: string]: IRateMap<T> };

    constructor() {
        this.keys = [];
        this.map = {};
    }

    /**
     * Add left item
     * @param key
     * @param left
     */
    public addLeft(key: string, left: T): void {
        this.map[key] = { left, right: null };
        this.keys.push(key);
    }

    /**
     * Add right item
     * @param key
     * @param right
     */
    public addRight(key: string, right: T): void {
        if (this.map[key]) {
            this.map[key].right = right;
        } else {
            this.map[key] = { left: null, right };
            this.keys.push(key);
        }
    }

    /**
     * Push items
     * @param key
     * @param item
     */
    public push(key: string, item: IRateMap<T>): void {
        this.map[key] = item;
        this.keys.push(key);
    }

    /**
     * Unshift items
     * @param key
     * @param item
     */
    public unshift(key: string, item: IRateMap<T>): void {
        this.map[key] = item;
        this.keys.unshift(key);
    }

    /**
     * Sort items
     * @param compareFn
     */
    public sort(compareFn?: (a: string, b: string) => number): void {
        this.keys.sort(compareFn);
    }

    /**
     * Get items
     */
    public getList(): IRateMap<T>[] {
        const result: IRateMap<T>[] = new Array(this.keys.length);
        for (let i = 0; i < result.length; i++) {
            result[i] = this.map[this.keys[i]];
        }
        return result;
    }
}
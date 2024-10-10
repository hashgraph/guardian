import { CSV } from '../table/csv.js';
import { IReportTable, IRateMap, IRate, IBlockRawData } from '../interfaces/index.js';
import { BlockToolModel, SchemaModel, BlockModel } from '../models/index.js';
import { Hash3, Sha256 } from '../hash/utils.js';

/**
 * Compare Utils
 */
export class CompareUtils {
    /**
     * Compare two oject
     * @param e1
     * @param e2
     * @private
     * @static
     */
    private static equal(e1: any, e2: any): boolean {
        if (typeof e1.equal === 'function') {
            return e1.equal(e2);
        }
        return e1 === e2;
    }

    /**
     * Set item in map
     * @param list
     * @param item
     * @public
     * @static
     */
    public static mapping<T>(list: IRateMap<T>[], item: T): IRateMap<T>[] {
        for (const el of list) {
            if (el.left && !el.right && CompareUtils.equal(el.left, item)) {
                el.right = item;
                return;
            }
        }
        list.push({ left: null, right: item });
    }

    /**
     * Calculate total rate
     * @param rates
     * @public
     * @static
     */
    public static calcRate<T>(rates: IRate<T>[]): number {
        if (!rates.length) {
            return 100;
        }
        let sum = 0;
        for (const item of rates) {
            if (item.totalRate > 0) {
                sum += item.totalRate;
            }
        }
        return Math.min(Math.max(-1, Math.floor(sum / rates.length)), 100);
    }

    /**
     * Aggregate total rate
     * @param args - rates (array)
     * @public
     * @static
     */
    public static calcTotalRate(...args: number[]): number {
        let total = 0;
        for (const rate of args) {
            total += rate;
        }
        return Math.floor(total / args.length);
    }

    /**
     * Aggregate total rate
     * @param rates - rates (array)
     * @public
     * @static
     */
    public static calcTotalRates(rates: number[]): number {
        if (!rates.length) {
            return 100;
        }
        let total = 0;
        for (const rate of rates) {
            total += rate;
        }
        return Math.floor(total / rates.length);
    }

    /**
     * Convert result(table) in csv file
     * @param csv
     * @param table
     * @public
     * @static
     */
    public static tableToCsv(csv: CSV, table: IReportTable): void {
        const keys: string[] = [];
        for (const col of table.columns) {
            if (col.label) {
                csv.add(col.label);
                keys.push(col.name);
            }
        }
        csv.addLine();
        for (const row of table.report) {
            for (const key of keys) {
                csv.add(row[key]);
            }
            csv.addLine();
        }
    }

    /**
     * Aggregate hash
     * @param args - hash (array)
     * @public
     * @static
     */
    public static aggregateHash(...args: string[]): string {
        const hashState = new Hash3();
        for (const h of args) {
            hashState.hash(h);
        }
        return String(hashState.result());
    }

    /**
     * Sha256
     * @param data
     * @public
     * @static
     */
    public static sha256(data: string): string {
        return Sha256.base58(data);
    }

    /**
     * Compare schemas
     * @param schemas1
     * @param schemas2
     * @public
     * @static
     */
    public static compareSchemas(schemas1: SchemaModel[], schemas2: SchemaModel[]): number {
        if (!schemas1 || !schemas2 || !schemas1.length || !schemas2.length) {
            return 0;
        }

        if (schemas1.length === 1 && schemas2.length === 1) {
            return schemas1[0].compare(schemas2[0]);
        }

        let result: number;
        let max: number;
        let min: number;

        min = 104;
        for (const schema1 of schemas1) {
            max = 0;
            for (const schema2 of schemas2) {
                result = schema1.compare(schema2);
                if (result < 0) {
                    result = result + 104;
                }
                max = Math.max(max, result);
            }
            min = Math.min(min, max);
        }

        if (min >= 103) {
            return -1;
        } else if (min >= 102) {
            return -2;
        } else if (min > 100) {
            return -3;
        } else {
            return min;
        }
    }

    /**
     * Create Block by JSON
     * @param json
     * @param index
     * @public
     * @static
     */
    public static createBlockModel(json: IBlockRawData, index: number): BlockModel {
        if (json.blockType === 'tool') {
            return new BlockToolModel(json, index + 1);
        } else {
            const block = new BlockModel(json, index + 1);
            if (Array.isArray(json.children)) {
                for (let i = 0; i < json.children.length; i++) {
                    const childJSON = json.children[i];
                    const child = CompareUtils.createBlockModel(childJSON, i);
                    block.addChildren(child);
                }
            }
            return block;
        }
    }

    /**
     * Create Block by JSON
     * @param json
     * @param index
     * @public
     * @static
     */
    public static createToolModel(json: IBlockRawData, index: number): BlockModel {
        const block = new BlockModel(json, index + 1);
        if (Array.isArray(json.children)) {
            for (let i = 0; i < json.children.length; i++) {
                const childJSON = json.children[i];
                const child = CompareUtils.createBlockModel(childJSON, i);
                block.addChildren(child);
            }
        }
        return block;
    }

    /**
     * Calculate total rate
     * @param rates
     * @private
     */
    public static total(rates: IRate<any>[]): number {
        let total = 0;
        let count = 0;

        for (const child of rates) {
            if (child.totalRate > 99) {
                total += 100;
            } else if (child.totalRate > 50) {
                total += 50;
            } else {
                total += 0;
            }
            count++;
        }

        if (count) {
            return Math.floor(total / count);
        }

        return 100;
    }

}

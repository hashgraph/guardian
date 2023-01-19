import { CSV } from '../../table/csv';
import { IReportTable } from '../interfaces/report-table.interface';
import { IRateMap } from '../interfaces/rate-map.interface';
import { IRate } from '../interfaces/rate.interface';

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
}
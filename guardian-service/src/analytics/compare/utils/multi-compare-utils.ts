import { IRateTable } from '../interfaces/rate-table.interface';
import { IReportTable } from '../interfaces/report-table.interface';

interface IMergeResult<T> {
    mainIndex: number;
    subIndex: number;
    cols: T[]
}

class ArrayMapper {
    private readonly size: number;
    private readonly indexMap: Map<number, number>;
    private readonly rowMap: Map<string, IMergeResult<any>>;

    private leftIndex: number;
    private mainIndex: number;
    private subIndex: number;

    constructor(size: number) {
        this.size = size;
        this.leftIndex = 0;
        this.mainIndex = 0;
        this.subIndex = 0;
        this.indexMap = new Map<number, number>();
        this.rowMap = new Map<string, IMergeResult<any>>();
    }

    public resetIndex(): void {
        this.leftIndex = 0;
    }

    public add(left: boolean, data: any, col: number): void {
        if (left) {
            this.leftIndex++;
            this.mainIndex = this.leftIndex;
            this.subIndex = 0;
        } else {
            const index = (this.indexMap.get(this.leftIndex) || 0) + 1;
            this.indexMap.set(this.leftIndex, index);
            this.mainIndex = this.leftIndex;
            this.subIndex = index;
        }

        const path = `${this.mainIndex}.${this.subIndex}`;

        let item: IMergeResult<any>;
        if (this.rowMap.has(path)) {
            item = this.rowMap.get(path);
        } else {
            item = {
                mainIndex: this.mainIndex,
                subIndex: this.subIndex,
                cols: new Array(this.size)
            };
            this.rowMap.set(path, item);
        }

        item.cols[col] = data;
        if (left && !item.cols[0]) {
            item.cols[0] = data;
        }
    }

    public list(): IMergeResult<any>[] {
        const rows = Array.from(this.rowMap.values());
        rows.sort((a, b) => {
            if (a.mainIndex === b.mainIndex) {
                return a.subIndex < b.subIndex ? -1 : 1;
            } else {
                return a.mainIndex < b.mainIndex ? -1 : 1;
            }
        });
        return rows;
    }
}

/**
 * Merge Utils
 */
export class MultiCompareUtils {
    /**
     * Merge IReportTable[]
     * @param rates
     * @private
     */
    public static mergeTables<T>(tables: IReportTable[]): IMergeResult<T>[] {
        const tableSize = tables.length + 1;
        const mapper = new ArrayMapper(tableSize);
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            mapper.resetIndex();
            for (const row of table.report) {
                mapper.add(!!row.left, row, i + 1);
            }
        }
        return mapper.list();
    }

    public static mergeRates<T>(rates: IRateTable<any>[][]): IMergeResult<T>[] {
        const tableSize = rates.length;
        const mapper = new ArrayMapper(tableSize);
        mapper.resetIndex();
        const leftTable = rates[0];
        if (leftTable) {
            for (const row of leftTable) {
                if (row.items[0]) {
                    mapper.add(!!row.items[0], {
                        type: row.type,
                        totalRate: row.totalRate,
                        item: row.items[0]
                    }, 0);
                }
            }
        }
        for (let i = 1; i < rates.length; i++) {
            const rightTable = rates[i];
            mapper.resetIndex();
            if (rightTable) {
                for (const row of rightTable) {
                    mapper.add(!!row.items[0], {
                        type: row.type,
                        totalRate: row.totalRate,
                        item: row.items[1]
                    }, i);
                }
            }
        }
        return mapper.list();
    }
}
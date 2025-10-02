import { Injectable } from '@angular/core';
import Papa from 'papaparse';

export interface TableData {
    columnKeys: string[];
    rows: Record<string, string>[];
}

export interface CsvBuildOptions {
    delimiter?: string;
    bom?: boolean;
    mime?: string;
}

@Injectable({ providedIn: 'root' })
export class CsvService {
    parseCsvToTable(csvText: string, delimiter: string = ','): TableData {
        const parsed = Papa.parse<string[]>(csvText, {
            header: false,
            delimiter,
            skipEmptyLines: true,
        });

        const rawRows: string[][] = (parsed.data as unknown as string[][]) ?? [];

        const columnCount: number = rawRows.reduce((maxColumns: number, row: string[]) => {
            const length = Array.isArray(row) ? row.length : 0;
            return Math.max(maxColumns, length);
        }, 0);

        const columnKeys: string[] = Array.from(
            { length: columnCount },
            (_: unknown, index: number) => `C${index + 1}`
        );

        const rows: Record<string, string>[] = rawRows.map((rawRow: string[]) => {
            const record: Record<string, string> = {};

            for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
                const key = columnKeys[columnIndex];
                const value = rawRow?.[columnIndex] ?? '';
                record[key] = value;
            }

            return record;
        });

        return { columnKeys, rows };
    }

    buildCsvFromTable(
        columnKeys: string[],
        rows: Record<string, unknown>[],
        delimiter: string = ','
    ): string {
        const normalizedRows: Record<string, unknown>[] = rows.map((row: Record<string, unknown>) => {
            const record: Record<string, unknown> = {};

            for (const key of columnKeys) {
                record[key] = row[key];
            }

            return record;
        });

        return Papa.unparse(normalizedRows, {
            delimiter,
            header: false,
            columns: columnKeys as any,
        });
    }

    toCsvBlob(
        columnKeys: string[],
        rows: Record<string, unknown>[],
        opts: CsvBuildOptions = {}
    ): Blob {
        const delimiter = opts.delimiter ?? ',';
        const mime = opts.mime ?? 'text/csv;charset=utf-8';
        const csv = this.buildCsvFromTable(columnKeys, rows, delimiter);
        const payload = opts.bom ? ['\uFEFF', csv] : [csv];
        return new Blob(payload, { type: mime });
    }

    toCsvFile(
        columnKeys: string[],
        rows: Record<string, unknown>[],

        filename: string = 'file.csv',

        opts: CsvBuildOptions = {}
    ): File {
        const blob = this.toCsvBlob(columnKeys, rows, opts);
        return new File([blob], filename, { type: blob.type });
    }
}

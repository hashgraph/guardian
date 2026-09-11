import { Injectable } from '@angular/core';
import Papa from 'papaparse';

/**
 * Parsed tabular data structure used by the table dialog.
 */
export interface TableData {
    columnKeys: string[];
    rows: Record<string, string>[];
}

/**
 * CSV helper to convert between CSV text and our internal table structure.
 */
@Injectable({ providedIn: 'root' })
export class CsvService {
    /**
     * Parse CSV text into rows and normalized column keys (C1..Cn) when headers are absent.
     * @param csvText Raw CSV text
     * @param delimiter Column delimiter, default ','
     */
    public parseCsvToTable(
        csvText: string,
        delimiter: string = ',',
        storedColumnKeys?: string[]
    ): TableData {
        const storedKeys: string[] = Array.isArray(storedColumnKeys) ? storedColumnKeys : [];
        const hasStoredKeys: boolean = storedKeys.length > 0;

        const parsed = Papa.parse<string[]>(csvText, {
            header: false,
            delimiter,
            skipEmptyLines: !hasStoredKeys
        });

        const allRows: string[][] = (parsed.data as unknown as string[][]) ?? [];
        const rawRows: string[][] = hasStoredKeys ? allRows.slice(1) : allRows;

        const widestRow: number = rawRows.reduce((maxColumns: number, row: string[]) => {
            const length: number = Array.isArray(row) ? row.length : 0;
            return Math.max(maxColumns, length);
        }, 0);

        const columnCount: number = hasStoredKeys ? storedKeys.length : widestRow;

        const columnKeys: string[] = hasStoredKeys
            ? storedKeys
            : Array.from({ length: columnCount }, (_: unknown, index: number) => `C${index + 1}`);

        const rows: Record<string, string>[] = rawRows.map((rawRow: string[]) => {
            const record: Record<string, string> = {};

            for (let columnIndex: number = 0; columnIndex < columnCount; columnIndex += 1) {
                const key: string = columnKeys[columnIndex];
                record[key] = rawRow?.[columnIndex] ?? '';
            }

            return record;
        });

        return {
            columnKeys,
            rows
        };
    }
}

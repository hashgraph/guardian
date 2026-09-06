import { Injectable } from '@angular/core';
import Papa from 'papaparse';

export interface TableData {
    columnKeys: string[];
    rows: Record<string, string>[];
}

export interface DeclaredColumn {
    name: string;
    key: string;
}

export interface CsvBuildOptions {
    delimiter?: string;
    bom?: boolean;
    mime?: string;
    headerRow?: string[];
}

@Injectable({ providedIn: 'root' })
export class CsvService {
    parseCsvToTable(
        csvText: string,
        delimiter: string = ',',
        storedColumnKeys?: string[]
    ): TableData {
        const storedKeys: string[] = Array.isArray(storedColumnKeys) ? storedColumnKeys : [];
        const hasStoredKeys: boolean = storedKeys.length > 0;

        const parsed = Papa.parse<string[]>(csvText, {
            header: false,
            delimiter,
            skipEmptyLines: !hasStoredKeys,
        });

        const allRows: string[][] = (parsed.data as unknown as string[][]) ?? [];
        const rawRows: string[][] = hasStoredKeys ? allRows.slice(1) : allRows;

        const widestRow: number = rawRows.reduce((maxColumns: number, row: string[]) => {
            const length = Array.isArray(row) ? row.length : 0;
            return Math.max(maxColumns, length);
        }, 0);

        const columnCount: number = hasStoredKeys ? storedKeys.length : widestRow;

        const columnKeys: string[] = hasStoredKeys
            ? storedKeys
            : Array.from({ length: columnCount }, (_: unknown, index: number) => `C${index + 1}`);

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

    applyDeclaredColumns(parsed: TableData, declaredColumns: DeclaredColumn[]): TableData {
        const declaredKeys: string[] = declaredColumns.map((column) => column.key);
        const sourceKeys: string[] = parsed.columnKeys;

        const dataRows: Record<string, string>[] =
            this.isDeclaredHeaderRow(parsed.rows[0], sourceKeys, declaredColumns)
                ? parsed.rows.slice(1)
                : parsed.rows;

        const rows: Record<string, string>[] = dataRows.map((sourceRow) => {
            const record: Record<string, string> = {};

            for (let index = 0; index < declaredKeys.length; index += 1) {
                record[declaredKeys[index]] = sourceRow[sourceKeys[index]] ?? '';
            }

            return record;
        });

        return { columnKeys: declaredKeys, rows };
    }

    private isDeclaredHeaderRow(
        row: Record<string, string> | undefined,
        sourceKeys: string[],
        declaredColumns: DeclaredColumn[]
    ): boolean {
        if (!row) {
            return false;
        }

        return declaredColumns.every((column, index) => {
            const cell = (row[sourceKeys[index]] ?? '').trim().toLowerCase();
            const name = (column.name || '').trim().toLowerCase();
            const key = (column.key || '').trim().toLowerCase();

            return !!cell && (cell === name || cell === key);
        });
    }

    buildCsvFromTable(
        columnKeys: string[],
        rows: Record<string, unknown>[],
        delimiter: string = ',',
        headerRow?: string[]
    ): string {
        const normalizedRows: Record<string, unknown>[] = rows.map((row: Record<string, unknown>) => {
            const record: Record<string, unknown> = {};

            for (const key of columnKeys) {
                record[key] = row[key];
            }

            return record;
        });

        const body = Papa.unparse(normalizedRows, {
            delimiter,
            header: false,
            columns: columnKeys as any,
        });

        if (!Array.isArray(headerRow) || !headerRow.length) {
            return body;
        }

        const header = Papa.unparse([headerRow], { delimiter, header: false });

        return body ? `${header}\r\n${body}` : header;
    }

    toCsvBlob(
        columnKeys: string[],
        rows: Record<string, unknown>[],
        opts: CsvBuildOptions = {}
    ): Blob {
        const delimiter = opts.delimiter ?? ',';
        const mime = opts.mime ?? 'text/csv;charset=utf-8';
        const csv = this.buildCsvFromTable(columnKeys, rows, delimiter, opts.headerRow);
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

import { firstValueFrom } from 'rxjs';
import { DB_NAME, STORES_NAME } from 'src/app/constants';
import { ArtifactService } from 'src/app/services/artifact.service';
import { CsvService } from 'src/app/services/csv.service';
import { GzipService } from 'src/app/services/gzip.service';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';

export const TABLE_TEST_MAX_ROWS = 10000;
export const TABLE_TEST_MAX_CELLS = 50000;

export interface ITableHydrationDeps {
    artifactService: Pick<ArtifactService, 'getFileBlob'>;
    gzipService: Pick<GzipService, 'gunzipToText'>;
    csvService: Pick<CsvService, 'parseCsvToTable'>;
    idb: Pick<IndexedDbRegistryService, 'get'>;
}

export interface ITableHydrationOptions {
    maxCells?: number;
}

function isTableLike(value: any): boolean {
    return !!value && typeof value === 'object' && value.type === 'table';
}

function parseTableValue(value: any): any | null {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return isTableLike(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }

    return isTableLike(value) ? value : null;
}

function trimmed(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
}

function needsRows(table: any): boolean {
    return !!trimmed(table.idbKey) || !!trimmed(table.fileId);
}

function isDeclared(table: any): boolean {
    return Array.isArray(table.columnNames)
        && table.columnNames.length > 0
        && Array.isArray(table.columnKeys)
        && table.columnKeys.length > 0;
}

function reKeyLegacyTable(table: any): any {
    const rows: Record<string, string>[] = Array.isArray(table.rows) ? table.rows : [];
    const sourceKeys: string[] = Array.isArray(table.columnKeys) ? table.columnKeys : [];
    const headerRow = rows[0];

    if (!headerRow || sourceKeys.length === 0) {
        return table;
    }

    const columnKeys = sourceKeys.map((key) => headerRow[key] ?? key);
    const dataRows = rows.slice(1).map((row) => {
        const record: Record<string, string> = {};
        for (let index = 0; index < sourceKeys.length; index += 1) {
            record[columnKeys[index]] = row[sourceKeys[index]] ?? '';
        }
        return record;
    });

    return { ...table, columnKeys, rows: dataRows };
}

async function readCsvText(table: any, deps: ITableHydrationDeps, field: string): Promise<string> {
    const idbKey = trimmed(table.idbKey);

    if (idbKey) {
        const record: any = await deps.idb.get(DB_NAME.TABLES, STORES_NAME.FILES_STORE, idbKey);
        const blob: Blob | undefined = record?.blob;

        if (blob) {
            const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
            const isGzip = head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b;
            return isGzip ? await deps.gzipService.gunzipToText(blob) : await blob.text();
        }
    }

    const fileId = trimmed(table.fileId);

    if (!fileId) {
        throw new Error(
            `Field "${field}": the uploaded file is no longer available in this browser`
            + `${idbKey ? ` (stored under "${idbKey}")` : ' (no stored file is named at all)'},`
            + ' so testing cannot read its rows. Upload the file again, then run the test.'
        );
    }

    const blob = await firstValueFrom(deps.artifactService.getFileBlob(fileId));
    return await deps.gzipService.gunzipToText(blob);
}

async function loadRows(
    table: any,
    deps: ITableHydrationDeps,
    field: string,
    options?: ITableHydrationOptions
): Promise<any> {
    const csvText = await readCsvText(table, deps, field);
    const declaredKeys = isDeclared(table) ? table.columnKeys : undefined;
    const parsed = deps.csvService.parseCsvToTable(csvText, ',', declaredKeys);

    if (parsed.rows.length > TABLE_TEST_MAX_ROWS) {
        throw new Error(
            `Field "${field}": table has ${parsed.rows.length} rows; `
            + `testing is limited to ${TABLE_TEST_MAX_ROWS}`
        );
    }

    const maxCells = options?.maxCells;

    if (maxCells) {
        const cells = parsed.rows.length * parsed.columnKeys.length;

        if (cells > maxCells) {
            throw new Error(
                `Field "${field}": table has ${cells} cells; `
                + `testing through the server is limited to ${maxCells}`
            );
        }
    }

    return {
        ...table,
        columnKeys: parsed.columnKeys,
        rows: parsed.rows
    };
}

export async function hydrateDocumentTables(
    document: any,
    deps: ITableHydrationDeps,
    options?: ITableHydrationOptions
): Promise<void> {
    if (!document || typeof document !== 'object') {
        return;
    }

    const keys = Object.keys(document);

    for (const key of keys) {
        const value = (document as any)[key];

        if (Array.isArray(value)) {
            for (const item of value) {
                await hydrateDocumentTables(item, deps, options);
            }
            continue;
        }

        const table = parseTableValue(value);

        if (table) {
            const loaded = needsRows(table) ? await loadRows(table, deps, key, options) : table;
            (document as any)[key] = isDeclared(loaded) ? loaded : reKeyLegacyTable(loaded);
            continue;
        }

        if (value && typeof value === 'object') {
            await hydrateDocumentTables(value, deps, options);
        }
    }
}

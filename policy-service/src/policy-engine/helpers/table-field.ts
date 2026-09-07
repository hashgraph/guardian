import { BlockActionError } from '../errors/index.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUtils } from '../helpers/utils.js';

import {
    DatabaseServer,
    decodeGridFileText,
    hasDeclaredTableColumns,
    isPlainObject,
    isTableValue,
    isTableWithFileId,
    parseCsvToTable,
    parseIfJson
} from '@guardian/common';
import { ITableField } from '@guardian/interfaces';

export {
    decodeGridFileText,
    hasDeclaredTableColumns,
    isPlainObject,
    isTableValue,
    isTableWithFileId,
    parseCsvToTable,
    parseIfJson
};

export type TableFileLoader = (fileId: string) => Promise<string>;

export type TableHydrationFilter = (
    table: ITableField & { fileId: string }
) => boolean;

/**
 * Loads a text file by its identifier.
 */
export async function loadFileTextById(ref: AnyBlockType, fileId: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    if (!fileId || typeof fileId !== 'string') {
        throw new BlockActionError('Invalid fileId', ref.blockType, ref.uuid);
    }

    try {
        const { buffer } = await DatabaseServer.getGridFile(fileId);

        return  await decodeGridFileText(buffer, encoding);

    } catch (e: any) {
        const message = PolicyUtils?.getErrorMessage ? PolicyUtils.getErrorMessage(e) : String(e?.message ?? e);
        throw new BlockActionError(message, ref.blockType, ref.uuid);
    }
}

function defineHidden<T extends object, K extends string>(
    obj: T,
    key: K,
    value: any
) {
    Object.defineProperty(obj, key, {
        value,
        configurable: true,
        writable: true,
        enumerable: false,
    });
}

/**
 * Recursively traverses any object/array and hydrates all table occurrences.
 */
export async function hydrateTablesInObject(
    root: unknown,
    loadFileText: TableFileLoader,
    delimiter: string = ',',
    shouldHydrate?: TableHydrationFilter
): Promise<() => void> {
    if (root === null || root === undefined) {
        return () => {
            //
        };
    }

    const disposers: (() => void)[] = [];

    const ensureTableHydrated = async (table: ITableField & { fileId: string }) => {
        const hasColumns = !!(table as any).columnKeys;
        const hasRows = !!(table as any).rows;
        if (hasColumns && hasRows) {
            return;
        }

        const hasDeclaredColumns = hasDeclaredTableColumns(table);
        const declaredColumnKeys = hasDeclaredColumns ? table.columnKeys : undefined;

        const csvText = await loadFileText(table.fileId);
        const parsed = parseCsvToTable(csvText, delimiter, declaredColumnKeys);

        if (!hasDeclaredColumns) {
            defineHidden(table, 'columnKeys', parsed.columnKeys);
            disposers.push(() => {
                delete (table as any).columnKeys;
            });
        }
        defineHidden(table, 'rows', parsed.rows);

        disposers.push(() => {
            delete (table as any).rows;
        });
    };

    const processCandidate = async (
        currentValue: unknown,
        setValue: (v: unknown) => void
    ): Promise<void> => {
        const parsed = parseIfJson(currentValue);

        if (isTableWithFileId(parsed)) {
            const tableObject = parsed as ITableField & { fileId: string };

            if (shouldHydrate && !shouldHydrate(tableObject)) {
                return;
            }

            const replaced = currentValue !== tableObject;

            if (replaced) {
                setValue(tableObject);
                disposers.push(() => setValue(currentValue));
            }

            await ensureTableHydrated(tableObject);
            await visit(tableObject);
            return;
        }

        await visit(parsed);
    };

    const visit = async (node: unknown): Promise<void> => {
        if (node === null || node === undefined) {
            return;
        }

        if (Array.isArray(node)) {
            const arrayNode = node as unknown[];
            for (let index = 0; index < arrayNode.length; index++) {
                const original = arrayNode[index];
                await processCandidate(original, (v) => { arrayNode[index] = v; });
            }
            return;
        }

        if (!isPlainObject(node)) {
            return;
        }

        const objectNode = node as Record<string, unknown>;
        const keys = Object.keys(objectNode);

        for (const key of keys) {
            const original = objectNode[key];
            await processCandidate(original, (v) => { objectNode[key] = v; });
        }
    };

    await visit(root);

    return () => {
        for (const dispose of disposers) {
            try {
                dispose();
            } catch {
                //
            }
        }
    };
}

/**
 * Recursively collects hydrated table data into the provided map:
 * fileId -> { rows, columnKeys }.
 */
export function collectTablesPack(
    root: unknown,
    tablesPack: Record<string, { rows: any[]; columnKeys: string[] }> = {}
): Record<string, { rows: any[]; columnKeys: string[] }> {
    const visit = (node: unknown): void => {
        if (!node || typeof node !== 'object') {
            return;
        }

        if (Array.isArray(node)) {
            for (const el of node) {
                visit(el)
            }
            return;
        }

        const obj = node as Record<string, unknown>;
        const maybeType = (obj as any)?.type;
        const maybeFileId = (obj as any)?.fileId;

        if (
            maybeType === 'table' &&
            typeof maybeFileId === 'string' &&
            (obj as any)?.rows &&
            (obj as any)?.columnKeys
        ) {
            tablesPack[maybeFileId] = {
                rows: (obj as any).rows,
                columnKeys: (obj as any).columnKeys
            };
        }

        for (const key of Object.keys(obj)) {
            visit((obj as any)[key]);
        }
    };

    visit(root);
    return tablesPack;
}

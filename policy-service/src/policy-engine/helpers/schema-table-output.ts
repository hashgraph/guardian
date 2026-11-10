import { isPlainObject } from '@guardian/common/helpers/table-csv';
import { GenerateUUIDv4, SchemaField } from '@guardian/interfaces';
import { BlockActionError } from '../errors/index.js';
import { IPolicyCalculateBlock } from '../policy-engine.interface.js';
import { buildPreviewTableJson, buildTableOutputCsv, isTableOutputValue } from './table-output.js';
import { IStoredTable, storeTableOutputFile } from './table-output-store.js';

export function hasTableOutputValue(value: unknown): boolean {
    const pending: unknown[] = [value];
    const visited = new WeakSet<object>();
    while (pending.length) {
        const current = pending.pop();
        if (isTableOutputValue(current)) {
            return true;
        }
        if ((Array.isArray(current) || isPlainObject(current)) && !visited.has(current)) {
            visited.add(current);
            for (const child of Object.values(current)) {
                pending.push(child);
            }
        }
    }
    return false;
}

export async function storeSchemaTableOutputs(
    ref: IPolicyCalculateBlock,
    fields: SchemaField[],
    value: unknown,
    userId: string | null,
    storedTables: IStoredTable[],
    preview: boolean
): Promise<void> {
    if (!isPlainObject(value)) {
        return;
    }
    for (const field of fields) {
        if (!Object.prototype.hasOwnProperty.call(value, field.name)) {
            continue;
        }
        const current = value[field.name];
        if (field.customType === 'table') {
            const tables = field.isArray ? (Array.isArray(current) ? current : []) : [current];
            if (!tables.some(isTableOutputValue)) {
                continue;
            }
            const columns = field.tableColumns;
            if (!Array.isArray(columns) || !columns.length) {
                throw new BlockActionError(`Table output "${field.path}" has no declared columns`, ref.blockType, ref.uuid);
            }
            const declared = new Set(columns.map((column) => column.key));
            const unknown = new Set<string>();
            for (const table of tables) {
                if (isTableOutputValue(table)) {
                    for (const row of table.rows) {
                        if (isPlainObject(row)) {
                            for (const key of Object.keys(row)) {
                                if (!declared.has(key)) {
                                    unknown.add(key);
                                }
                            }
                        }
                    }
                }
            }
            if (unknown.size) {
                throw new BlockActionError(`Table output "${field.path}" has unknown columns: ${[...unknown].join(', ')}`, ref.blockType, ref.uuid);
            }
            const values: unknown[] = [];
            for (const table of tables) {
                if (isTableOutputValue(table) && preview) {
                    values.push(buildPreviewTableJson(`preview-${GenerateUUIDv4()}`, buildTableOutputCsv(columns, table.rows), columns));
                } else if (isTableOutputValue(table)) {
                    values.push(await storeTableOutputFile(ref, table.rows, columns, userId, storedTables));
                } else {
                    values.push(table);
                }
            }
            value[field.name] = field.isArray ? values : values[0];
        } else if (field.isRef && Array.isArray(field.fields)) {
            const items = field.isArray ? (Array.isArray(current) ? current : []) : [current];
            for (const item of items) {
                await storeSchemaTableOutputs(ref, field.fields, item, userId, storedTables, preview);
            }
        }
    }
}

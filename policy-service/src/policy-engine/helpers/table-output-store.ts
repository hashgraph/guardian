import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { IPFS } from '@guardian/common/helpers/ipfs';
import { IPolicyCalculateBlock } from '../policy-engine.interface.js';
import { PolicyUtils } from './utils.js';
import { buildCompactTableJson, buildTableOutputCsv, gzipTableCsv, ITableOutputColumn } from './table-output.js';

export interface IStoredTable {
    fileId: string;
    cid: string | null;
}

export async function storeTableOutputFile(
    ref: IPolicyCalculateBlock,
    rows: unknown[],
    columns: ITableOutputColumn[],
    userId: string | null,
    storedTables: IStoredTable[]
): Promise<string> {
    const buffer = await gzipTableCsv(buildTableOutputCsv(columns, rows));
    const { fileId } = await DatabaseServer.upsertGridFile({
        buffer,
        filename: 'table.csv.gz',
        contentType: 'application/gzip'
    });
    const stored: IStoredTable = { fileId, cid: null };
    storedTables.push(stored);

    if (!ref.dryRun) {
        const { cid } = await IPFS.addFile(buffer, { userId, interception: null });
        stored.cid = cid;
    }

    return buildCompactTableJson(stored.fileId, stored.cid, columns);
}

export async function deleteTableOutputFiles(
    ref: IPolicyCalculateBlock,
    storedTables: IStoredTable[]
): Promise<void> {
    for (const stored of storedTables) {
        try {
            await DatabaseServer.deleteGridFile(stored.fileId);
        } catch (error) {
            ref.warn(`Failed to delete result table ${stored.fileId}: ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}

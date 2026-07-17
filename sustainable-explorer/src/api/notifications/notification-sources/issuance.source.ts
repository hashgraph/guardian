import type { DataSource } from 'typeorm';
import type { NotificationSource } from './notification-source.interface';

export interface IssuanceEventRow {
    mint_consensus_timestamp: string;
    project_key: string;
    token_id: string | null;
    amount: string | number | null;
    mint_date: string | null;
}

/**
 * Issuance notifications — new mints on `project_mint_link` (network DB).
 * Ported verbatim from the pre-refactor `scanIssuance` (same query, same
 * `issuance:{mint_consensus_timestamp}` dedupe key, same watermark advance)
 * so existing watermarks/dedupe rows keep working unchanged.
 */
export const issuanceSource: NotificationSource<IssuanceEventRow> = {
    type: 'issuance',
    watermarkSource: 'issuance',

    async fetchBatch(netDs: DataSource, since: string, limit: number): Promise<IssuanceEventRow[]> {
        return netDs.query(
            `SELECT mint_consensus_timestamp, project_key, token_id, amount, mint_date
               FROM project_mint_link
              WHERE mint_consensus_timestamp > $1
              ORDER BY mint_consensus_timestamp ASC
              LIMIT $2`,
            [since, limit],
        );
    },

    nextWatermark(batch: IssuanceEventRow[]): string {
        return batch[batch.length - 1].mint_consensus_timestamp;
    },

    dedupeKey(row: IssuanceEventRow): string {
        return `issuance:${row.mint_consensus_timestamp}`;
    },

    projectKeyOf(row: IssuanceEventRow): string {
        return row.project_key;
    },

    buildPayload(row, enrich) {
        return {
            displayName: enrich?.displayName ?? null,
            relatedTopicId: enrich?.relatedTopicId ?? null,
            registryName: enrich?.registryName ?? null,
            methodology: enrich?.methodology ?? null,
            tokenId: row.token_id,
            amount: row.amount,
            mintDate: row.mint_date,
            mintConsensusTimestamp: row.mint_consensus_timestamp,
        };
    },
};

import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES, getWorkerOptions } from '@shared/config/bullmq.config';
import { HederaService } from '../services/hedera.service';

export interface TokenSyncJobData {
    tokenId: string;
    fetchNfts?: boolean;
    fromSerial?: number;
}

/**
 * Walks one treasury account's CRYPTOTRANSFER history, ingesting the serial
 * movements of every token that account issued.
 *
 * The unit of work is the account rather than the token because Mirror Node
 * offers no per-token transfer feed — transfers can only be read from an
 * account's transaction list, and one registry treasury commonly issues
 * hundreds of tokens.
 */
export interface TreasuryTransferJobData {
    treasury: string;
}

/** Job name for {@link TreasuryTransferJobData}; anything else is a token sync. */
export const TREASURY_TRANSFERS_JOB = 'treasury-transfers';

@Processor(QUEUE_NAMES.TOKEN_SYNC, getWorkerOptions(QUEUE_NAMES.TOKEN_SYNC))
export class TokenSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(TokenSyncProcessor.name);

    constructor(
        private readonly hederaService: HederaService,
        private readonly dataSource: DataSource,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<TokenSyncJobData | TreasuryTransferJobData>): Promise<void> {
        if (job.name === TREASURY_TRANSFERS_JOB) {
            await this.syncTreasuryTransfers((job.data as TreasuryTransferJobData).treasury);
            return;
        }

        const { tokenId, fetchNfts = true, fromSerial = 0 } = job.data as TokenSyncJobData;

        this.logger.log(`Syncing token ${tokenId} from serial ${fromSerial}`);

        // Fetch token info
        const token = await this.hederaService.getToken(tokenId);
        const now = Date.now().toString();

        // Upsert token_cache
        await this.dataSource.query(
            `INSERT INTO token_cache (
                "tokenId",
                status,
                "lastUpdate",
                "serialNumber",
                "hasNext",
                name,
                symbol,
                type,
                treasury,
                memo,
                "totalSupply",
                decimals,
                "createdTimestamp"
            ) VALUES ($1, 'SYNCED', $2, $3, false, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT ("tokenId") DO UPDATE SET
                status = 'SYNCED',
                "lastUpdate" = EXCLUDED."lastUpdate",
                name = EXCLUDED.name,
                symbol = EXCLUDED.symbol,
                type = EXCLUDED.type,
                treasury = EXCLUDED.treasury,
                memo = EXCLUDED.memo,
                "totalSupply" = EXCLUDED."totalSupply",
                decimals = EXCLUDED.decimals,
                "createdTimestamp" = EXCLUDED."createdTimestamp"`,
            [
                tokenId,
                now,
                fromSerial,
                token.name || null,
                token.symbol || null,
                token.type || null,
                token.treasury_account_id || null,
                token.memo || null,
                token.total_supply || null,
                token.decimals ? parseInt(token.decimals, 10) : null,
                token.created_timestamp || null,
            ],
        );

        // If NFT type and fetchNfts is enabled, fetch serials
        if (token.type === 'NON_FUNGIBLE_UNIQUE' && fetchNfts) {
            await this.syncNftSerials(tokenId, fromSerial, now);
            // Transfer history is not fetched here. It is read from the treasury
            // account, which usually issues many tokens, so it is swept once per
            // account by TREASURY_TRANSFERS_JOB rather than repeated per token.
        } else if (token.type === 'FUNGIBLE_COMMON' && token.treasury_account_id) {
            await this.syncFungibleMints(tokenId, token.treasury_account_id, token.created_timestamp, now);
        }

        this.logger.log(`Token ${tokenId} synced successfully`);
    }

    // Guardian stamps the mint VP-Document's consensus timestamp on-chain in one
    // of two places depending on token type: base64 in each NFT's metadata, or
    // base64 in the fungible TOKENMINT transaction's memo. Same encoding, same
    // validation — anything that doesn't decode to that exact shape
    // (non-Guardian tokens, IPFS CIDs, empty memos, arbitrary bytes) maps to null.
    private static readonly VP_TIMESTAMP_RE = /^\d{10}\.\d{9}$/;

    /** Pages of TOKENMINT history to walk per job. The watermark persists, so a
     *  treasury with a longer history simply finishes on later passes rather
     *  than holding one job open indefinitely. */
    private static readonly MINT_TX_MAX_PAGES = 20;

    /** Pages of a treasury's CRYPTOTRANSFER history to walk per job. The walk
     *  re-enqueues itself while history remains, so this bounds one job's
     *  runtime rather than the total depth reachable for an account. */
    private static readonly TRANSFER_MAX_PAGES = 20;

    /** Pulls the `timestamp=gt:<ts>` position out of a Mirror Node pagination
     *  link, so an empty page still advances the cursor past its time window. */
    private static cursorFromNextLink(nextLink: string | null): string | null {
        if (!nextLink) {
            return null;
        }
        return /[?&]timestamp=gt:(\d+\.\d+)/.exec(nextLink)?.[1] ?? null;
    }

    private decodeVpTimestamp(encoded: string | null): string | null {
        if (!encoded) {
            return null;
        }
        try {
            const decoded = Buffer.from(encoded, 'base64').toString('utf8');
            return TokenSyncProcessor.VP_TIMESTAMP_RE.test(decoded) ? decoded : null;
        } catch {
            return null;
        }
    }

    /**
     * Ingests the real amounts a fungible token's mints put on the ledger.
     *
     * Fungible tokens have no per-unit metadata, so the MintToken VC's declared
     * `amount` is the only figure the system has ever had — and it is a
     * declaration, not a record. The TOKENMINT transaction carries both the
     * actual minted amount and (in its memo) the mint VP-Document's timestamp,
     * which is what ties it back to a project_mint_link row.
     *
     * Mirror Node cannot filter transactions by token, only by account, so this
     * walks the treasury's TOKENMINT history and keeps the transfers belonging
     * to this token. The cursor advances past skipped transactions too —
     * otherwise a treasury holding several tokens would rescan them forever.
     *
     * Two Mirror Node behaviours shape this loop:
     *   - an ascending query needs a tight lower bound, so the first pass is
     *     anchored to the token's creation rather than to the beginning of time;
     *   - quiet periods come back as empty pages that still carry a `next` link,
     *     so the loop follows the link instead of stopping on a short page.
     */
    private async syncFungibleMints(
        tokenId: string,
        treasury: string,
        createdTimestamp: string,
        now: string,
    ): Promise<void> {
        const [row]: Array<{ mintTxWatermark: string | null }> = await this.dataSource.query(
            `SELECT "mintTxWatermark" FROM token_cache WHERE "tokenId" = $1`,
            [tokenId],
        );
        let watermark = row?.mintTxWatermark ?? null;
        let filter = watermark ? `gt:${watermark}` : `gte:${createdTimestamp}`;
        let ingested = 0;

        for (let page = 0; page < TokenSyncProcessor.MINT_TX_MAX_PAGES; page++) {
            const { transactions, nextLink } = await this.hederaService.getTokenMintTransactions(treasury, filter);

            for (const tx of transactions) {
                const minted = (tx.token_transfers ?? [])
                    .filter((t) => t.token_id === tokenId && t.amount > 0)
                    .reduce((sum, t) => sum + t.amount, 0);

                // A non-fungible mint by the same treasury, or a mint of one of
                // its other tokens — nothing of ours on this transaction.
                if (minted > 0) {
                    await this.dataSource.query(
                        `INSERT INTO token_mint_tx (
                            consensus_timestamp, token_id, vp_consensus_timestamp, amount_raw, last_update
                         ) VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (consensus_timestamp) DO UPDATE SET
                            token_id               = EXCLUDED.token_id,
                            vp_consensus_timestamp = EXCLUDED.vp_consensus_timestamp,
                            amount_raw             = EXCLUDED.amount_raw,
                            last_update            = EXCLUDED.last_update`,
                        [tx.consensus_timestamp, tokenId, this.decodeVpTimestamp(tx.memo_base64), minted, now],
                    );
                    ingested++;
                }
            }

            // Advance the cursor. Results come back `order: asc`, so the last row
            // is the newest; on an empty page fall back to the position encoded in
            // Mirror Node's own `next` link so quiet windows aren't rescanned.
            const cursor = transactions.length > 0
                ? transactions[transactions.length - 1].consensus_timestamp
                : TokenSyncProcessor.cursorFromNextLink(nextLink);

            if (cursor) {
                watermark = cursor;
                await this.dataSource.query(
                    `UPDATE token_cache SET "mintTxWatermark" = $1, "lastUpdate" = $2 WHERE "tokenId" = $3`,
                    [watermark, now, tokenId],
                );
                filter = `gt:${watermark}`;
            }

            // No next link means the history is exhausted. A short page does not.
            if (!nextLink || !cursor) {
                break;
            }
        }

        if (ingested > 0) {
            this.logger.log(`Token ${tokenId}: ingested ${ingested} fungible mint transaction(s)`);
        }
    }

    private async syncNftSerials(tokenId: string, fromSerial: number, now: string): Promise<void> {
        const { nfts } = await this.hederaService.getSerials(tokenId, fromSerial);

        let maxSerial = fromSerial;

        for (const nft of nfts) {
            const metadata = nft.metadata || null;
            await this.dataSource.query(
                `INSERT INTO nft_cache ("tokenId", "serialNumber", "lastUpdate", metadata, "metadataTimestamp", "accountId", deleted)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT ("tokenId", "serialNumber") DO UPDATE SET
                    "lastUpdate" = EXCLUDED."lastUpdate",
                    metadata = EXCLUDED.metadata,
                    "metadataTimestamp" = EXCLUDED."metadataTimestamp",
                    "accountId" = EXCLUDED."accountId",
                    deleted = EXCLUDED.deleted`,
                [tokenId, nft.serial_number, now, metadata, this.decodeVpTimestamp(metadata), nft.account_id ?? null, nft.deleted ?? false],
            );

            if (nft.serial_number > maxSerial) {
                maxSerial = nft.serial_number;
            }
        }

        // Update token_cache with watermark
        const hasMore = nfts.length >= 100;
        await this.dataSource.query(
            `UPDATE token_cache
             SET "serialNumber" = $1, "hasNext" = $2, "lastUpdate" = $3
             WHERE "tokenId" = $4`,
            [maxSerial, hasMore, now, tokenId],
        );

        // If more serials exist, enqueue self with updated fromSerial
        if (hasMore) {
            await this.tokenQueue.add('sync', {
                tokenId,
                fetchNfts: true,
                fromSerial: maxSerial,
            }, {
                jobId: `token-${tokenId}-${maxSerial}`,
                delay: 100,
            });
        }
    }

    /**
     * Records credits leaving a registry treasury.
     *
     * Guardian issues a document for minting and for retirement, but nothing at
     * all for a transfer — the Hedera CRYPTOTRANSFER is the only evidence a
     * credit changed hands. Scanning the treasury captures the registry → holder
     * hop, which is the issuance-to-beneficiary movement; onward trades between
     * holders are not covered, and the disclosure copy says so.
     *
     * The account is the unit of work because Mirror Node has no per-token
     * transfer feed: transfers are only readable from an account's transaction
     * list. One walk therefore serves every token the treasury issued, and each
     * page's serial movements are filed against whichever of those tokens they
     * name. A walk resumes from the account's watermark and re-enqueues itself
     * while history remains, so a long account converges over successive jobs
     * instead of being restarted from the beginning on every pass.
     */
    private async syncTreasuryTransfers(treasury: string): Promise<void> {
        // The tokens this account issued, their shared scan position, and the
        // earliest creation timestamp among them — there is nothing to find
        // before the first token existed. All three come from the one row set,
        // since the watermark is held per token but advanced per treasury.
        const [scope]: Array<{
            token_ids: string[] | null;
            earliest: string | null;
            watermark: string | null;
        }> = await this.dataSource.query(
            // Deliberately single-table and index-backed (treasury): this runs
            // once per treasury per sweep — thousands of times — so the lower
            // bound is read from a column seeded at bootstrap rather than joined
            // out of project_mint_link here.
            `SELECT ARRAY_AGG("tokenId")        AS token_ids,
                    MIN("createdTimestamp")     AS earliest,
                    MAX("transferTxWatermark")  AS watermark
             FROM token_cache
             WHERE treasury = $1 AND type = 'NON_FUNGIBLE_UNIQUE'`,
            [treasury],
        );

        const tracked = new Set(scope?.token_ids ?? []);
        if (tracked.size === 0) {
            return;
        }

        let watermark = scope?.watermark ?? null;
        let filter = watermark
            ? `gt:${watermark}`
            : `gte:${scope?.earliest ?? '0.0'}`;
        let ingested = 0;
        let exhausted = false;

        for (let page = 0; page < TokenSyncProcessor.TRANSFER_MAX_PAGES; page++) {
            const { transactions, nextLink } = await this.hederaService.getAccountNftTransfers(treasury, filter);

            for (const tx of transactions) {
                for (const t of tx.nft_transfers ?? []) {
                    // Treasuries also hold tokens outside Guardian's scope; only
                    // credits we can trace back to an issuance are recorded.
                    if (!tracked.has(t.token_id)) {
                        continue;
                    }
                    await this.dataSource.query(
                        `INSERT INTO token_transfer_event (
                            consensus_timestamp, token_id, serial_number, sender_account_id, receiver_account_id
                         ) VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (consensus_timestamp, token_id, serial_number) DO UPDATE SET
                            sender_account_id   = EXCLUDED.sender_account_id,
                            receiver_account_id = EXCLUDED.receiver_account_id`,
                        [tx.consensus_timestamp, t.token_id, t.serial_number, t.sender_account_id, t.receiver_account_id],
                    );
                    ingested++;
                }
            }

            // An empty page still advances: Mirror Node applies the type filter
            // after windowing, so pages with no CRYPTOTRANSFER are routine and
            // must not be mistaken for the end of the history.
            const cursor = transactions.length > 0
                ? transactions[transactions.length - 1].consensus_timestamp
                : TokenSyncProcessor.cursorFromNextLink(nextLink);

            if (cursor) {
                watermark = cursor;
                await this.advanceTreasuryWatermark(treasury, watermark);
                filter = `gt:${watermark}`;
            }

            if (!nextLink || !cursor) {
                exhausted = true;
                break;
            }
        }

        if (ingested > 0) {
            this.logger.log(
                `Treasury ${treasury}: ingested ${ingested} serial transfer(s) across ${tracked.size} token(s)`,
            );
        }

        // History left to walk — continue in a fresh job rather than holding this
        // one open, so one long account cannot stall the rest of the sweep.
        if (!exhausted) {
            await this.tokenQueue.add(
                TREASURY_TRANSFERS_JOB,
                { treasury },
                { jobId: `treasury-${treasury}-${watermark ?? 'start'}`, delay: 100 },
            );
        }
    }

    /**
     * Moves every token of a treasury to the account's new scan position.
     *
     * Written across the whole treasury because one walk covers all of its
     * tokens: leaving the others behind would make them look unscanned and
     * invite a second walk of history already ingested.
     */
    private async advanceTreasuryWatermark(treasury: string, watermark: string): Promise<void> {
        await this.dataSource.query(
            `UPDATE token_cache
             SET "transferTxWatermark" = $2
             WHERE treasury = $1 AND type = 'NON_FUNGIBLE_UNIQUE'`,
            [treasury, watermark],
        );
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<TokenSyncJobData>, error: Error): void {
        this.logger.error(
            `Token sync job ${job.id} failed for ${job.data.tokenId}: ${error.message}`,
            error.stack,
        );
    }
}

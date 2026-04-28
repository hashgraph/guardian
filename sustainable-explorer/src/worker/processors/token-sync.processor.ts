import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { HederaService } from '../services/hedera.service';

export interface TokenSyncJobData {
    tokenId: string;
    fetchNfts?: boolean;
    fromSerial?: number;
}

@Processor(QUEUE_NAMES.TOKEN_SYNC)
export class TokenSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(TokenSyncProcessor.name);

    constructor(
        private readonly hederaService: HederaService,
        private readonly dataSource: DataSource,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<TokenSyncJobData>): Promise<void> {
        const { tokenId, fetchNfts = true, fromSerial = 0 } = job.data;

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
                decimals
            ) VALUES ($1, 'SYNCED', $2, $3, false, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT ("tokenId") DO UPDATE SET
                status = 'SYNCED',
                "lastUpdate" = EXCLUDED."lastUpdate",
                name = EXCLUDED.name,
                symbol = EXCLUDED.symbol,
                type = EXCLUDED.type,
                treasury = EXCLUDED.treasury,
                memo = EXCLUDED.memo,
                "totalSupply" = EXCLUDED."totalSupply",
                decimals = EXCLUDED.decimals`,
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
            ],
        );

        // If NFT type and fetchNfts is enabled, fetch serials
        if (token.type === 'NON_FUNGIBLE_UNIQUE' && fetchNfts) {
            await this.syncNftSerials(tokenId, fromSerial, now);
        }

        this.logger.log(`Token ${tokenId} synced successfully`);
    }

    private async syncNftSerials(tokenId: string, fromSerial: number, now: string): Promise<void> {
        const { nfts } = await this.hederaService.getSerials(tokenId, fromSerial);

        let maxSerial = fromSerial;

        for (const nft of nfts) {
            await this.dataSource.query(
                `INSERT INTO nft_cache ("tokenId", "serialNumber", "lastUpdate", metadata, deleted)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT ("tokenId", "serialNumber") DO UPDATE SET
                    "lastUpdate" = EXCLUDED."lastUpdate",
                    metadata = EXCLUDED.metadata,
                    deleted = EXCLUDED.deleted`,
                [tokenId, nft.serial_number, now, nft.metadata || null, nft.deleted ?? false],
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

    @OnWorkerEvent('failed')
    onFailed(job: Job<TokenSyncJobData>, error: Error): void {
        this.logger.error(
            `Token sync job ${job.id} failed for ${job.data.tokenId}: ${error.message}`,
            error.stack,
        );
    }
}

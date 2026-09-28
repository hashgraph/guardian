import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES, getWorkerOptions } from '@shared/config/bullmq.config';
import { HederaService } from '../services/hedera.service';
import { RETIRE_EXECUTED_TOPIC, decodeRetireEvent } from '../services/retire-event.decoder';

export interface RetireSyncJobData {
    contractId: string;
}

/**
 * Ingests executed retirement events from one Guardian RETIRE contract.
 *
 * Retirement has until now been *inferred* from Mirror Node marking an NFT
 * serial deleted, which yields a count and nothing else — no date, no actor, and
 * nothing at all for fungible tokens. The retire contract emits the real record:
 * who retired, which token, how much, and exactly which serials.
 *
 * Only RETIRE_EXECUTED_TOPIC is ingested; see the decoder for why the visually
 * identical request event must not be counted.
 */
@Processor(QUEUE_NAMES.RETIRE_SYNC, getWorkerOptions(QUEUE_NAMES.RETIRE_SYNC))
export class RetireSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(RetireSyncProcessor.name);

    /** Pages of contract history per job. The watermark persists, so a contract
     *  with a longer history finishes on later passes. */
    private static readonly MAX_PAGES = 20;

    /** EVM address → Hedera account ID, memoised across jobs (see resolveAccountId). */
    private readonly accountIdByAddress = new Map<string, string>();

    constructor(
        private readonly hederaService: HederaService,
        private readonly dataSource: DataSource,
        @InjectQueue(QUEUE_NAMES.RETIRE_SYNC) private readonly retireQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<RetireSyncJobData>): Promise<void> {
        const { contractId } = job.data;

        const [row]: Array<{ log_watermark: string | null }> = await this.dataSource.query(
            `SELECT log_watermark FROM contract_cache WHERE contract_id = $1`,
            [contractId],
        );
        let watermark = row?.log_watermark ?? null;
        let ingested = 0;
        let morePages = false;

        for (let page = 0; page < RetireSyncProcessor.MAX_PAGES; page++) {
            const { logs, nextLink } = await this.hederaService.getContractLogs(contractId, watermark);
            if (logs.length === 0) {
                break;
            }

            for (const log of logs) {
                if (log.topics?.[0] !== RETIRE_EXECUTED_TOPIC) {
                    continue;
                }
                const event = decodeRetireEvent(log.data);
                if (!event) {
                    // Right signature, unexpected payload — flag rather than guess.
                    this.logger.warn(
                        `Contract ${contractId} log ${log.timestamp}#${log.index} matched the retire ` +
                        `signature but did not decode — skipped`,
                    );
                    continue;
                }

                const accountId = event.accountId ?? await this.resolveAccountId(event.accountAddress);

                for (const token of event.tokens) {
                    if (!token.tokenId) {
                        // A retirement that names no identifiable token cannot be
                        // attributed to a project's credits; recording it under a
                        // guessed ID would misstate another token's retired total.
                        this.logger.warn(
                            `Contract ${contractId} log ${log.timestamp}#${log.index} retired token ` +
                            `${token.tokenAddress}, which is not a Hedera token address — skipped`,
                        );
                        continue;
                    }
                    // count vs serials is resolved downstream against the token's
                    // real type: several events populate both fields.
                    await this.dataSource.query(
                        `INSERT INTO token_retire_event (
                            consensus_timestamp, log_index, token_id, contract_id, account_id, amount, serials
                         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                         ON CONFLICT (consensus_timestamp, log_index, token_id) DO UPDATE SET
                            contract_id = EXCLUDED.contract_id,
                            account_id  = EXCLUDED.account_id,
                            amount      = EXCLUDED.amount,
                            serials     = EXCLUDED.serials`,
                        [
                            log.timestamp,
                            log.index,
                            token.tokenId,
                            contractId,
                            accountId,
                            token.count,
                            token.serials,
                        ],
                    );
                    ingested++;
                }
            }

            watermark = logs[logs.length - 1].timestamp;
            await this.dataSource.query(
                `UPDATE contract_cache SET log_watermark = $1, last_update = $2 WHERE contract_id = $3`,
                [watermark, Date.now().toString(), contractId],
            );

            if (!nextLink) {
                break;
            }
            // Still more history than this job's page budget allows.
            morePages = page === RetireSyncProcessor.MAX_PAGES - 1;
        }

        if (ingested > 0) {
            this.logger.log(`Contract ${contractId}: ingested ${ingested} retirement record(s)`);
        }

        // Carry on where this job stopped. Without this a contract with more
        // than MAX_PAGES of history only advanced one job's worth per process
        // restart, because nothing else re-enqueues RETIRE_SYNC between boots.
        // The watermark is part of the jobId so consecutive continuations get
        // distinct ids — re-adding the id of a job that is still active is a
        // silent no-op in BullMQ and would end the chain here.
        if (morePages && watermark) {
            await this.retireQueue.add(
                'sync',
                { contractId },
                {
                    jobId: `retire-${contractId}-${watermark}`,
                    delay: 5000,
                    removeOnComplete: true,
                },
            );
            this.logger.debug(
                `Contract ${contractId}: page budget reached at ${watermark} — continuing`,
            );
        }
    }

    /**
     * Turns the retiring party's EVM address into a Hedera account ID.
     *
     * A retirement submitted from an ECDSA account is signed by a key-derived
     * address that encodes no account number, so only the ledger can name the
     * account. Results are memoised for the life of the worker: retirements
     * cluster heavily on a handful of registry accounts, and this would
     * otherwise cost one mirror-node call per event.
     *
     * When the address resolves to nothing, the address itself is kept. The
     * retirement is real either way, and an on-chain address still identifies
     * the party — dropping the record instead would understate retired volume.
     */
    private async resolveAccountId(evmAddress: string): Promise<string> {
        const cached = this.accountIdByAddress.get(evmAddress);
        if (cached !== undefined) {
            return cached;
        }
        const resolved = (await this.hederaService.getAccountId(evmAddress)) ?? evmAddress;
        this.accountIdByAddress.set(evmAddress, resolved);
        return resolved;
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<RetireSyncJobData>, error: Error): void {
        this.logger.error(
            `Retire sync job ${job.id} failed for ${job.data.contractId}: ${error.message}`,
            error.stack,
        );
    }
}

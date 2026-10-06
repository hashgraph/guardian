import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES, getWorkerOptions } from '@shared/config/bullmq.config';
import { IpfsService } from '../services/ipfs.service';
import { ProjectMapperService } from '../services/project-mapper.service';
import { IpfsFetchFailureRepository } from '../repositories/ipfs-fetch-failure.repository';

export interface IpfsFetchJobData {
    cid: string;
    messageTimestamp: string;
}


@Processor(QUEUE_NAMES.IPFS_FETCH, getWorkerOptions(QUEUE_NAMES.IPFS_FETCH))
export class IpfsFetchProcessor extends WorkerHost implements OnModuleInit {
    private readonly logger = new Logger(IpfsFetchProcessor.name);
    private readonly failureRepo: IpfsFetchFailureRepository;

    constructor(
        private readonly ipfsService: IpfsService,
        private readonly dataSource: DataSource,
        private readonly projectMapperService: ProjectMapperService,
        @Inject('REDICT_PUB') private readonly redis: Redis,
    ) {
        super();
        this.failureRepo = new IpfsFetchFailureRepository(this.dataSource);
    }

    /**
     * Ensures the ipfs_fetch_failure table exists before processing begins.
     */
    async onModuleInit(): Promise<void> {
        await this.failureRepo.ensureTable();
    }

    async process(job: Job<IpfsFetchJobData>): Promise<void> {
        const { cid, messageTimestamp } = job.data;

        this.logger.debug(`Fetching IPFS content for CID ${cid}`);

        // Check if the bytes are already cached. IMPORTANT: this only tells us the
        // CID has been downloaded before — NOT that THIS job's message row got its
        // documents written or went through project mapping. A prior job for the
        // same CID (this one or an earlier message sharing it) can have inserted
        // into ipfs_files and then died before reaching the write-back/mapping
        // steps below (worker crash, OOM, restart) — with no self-healing path,
        // since every future job for that CID would otherwise take this shortcut
        // forever. So we skip only the network round-trip when cached; the
        // write-back and project-mapping steps always run.
        const existing: Array<{ content: Buffer }> = await this.dataSource.query(
            `SELECT content FROM ipfs_files WHERE cid = $1 LIMIT 1`,
            [cid],
        );

        let content: Buffer;
        if (existing.length > 0) {
            this.logger.debug(`CID ${cid} already exists in ipfs_files, reusing cached content`);
            content = existing[0].content;
            // deleteFailure/publishEvent('ipfs-fetch-recovered') run unconditionally
            // at the end of this method — no need to duplicate them here.
            await this.markCidFetched(cid);
        } else {
            // Fetch content from IPFS — classify and handle errors
            try {
                content = await this.ipfsService.fetchContent(cid);
            } catch (err: unknown) {
                const error = err instanceof Error ? err : new Error(String(err));
                const category = IpfsService.classifyError(error);

                if (category === 'permanent') {
                    // Permanent failures (404, invalid CID, 410) should not be retried —
                    // wrap in UnrecoverableError so BullMQ skips remaining attempts.
                    throw new UnrecoverableError(error.message);
                }

                // Transient failure — rethrow so BullMQ retries per backoff config
                throw error;
            }

            // Store in ipfs_files
            await this.dataSource.query(
                `INSERT INTO ipfs_files (cid, content, size, "createdAt")
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (cid) DO NOTHING`,
                [cid, content, content.length],
            );
            await this.markCidFetched(cid);
        }

        // Try to parse as JSON and update message.documents
        let parsedDocument: Record<string, unknown> | null = null;
        try {
            const text = content.toString('utf-8');
            parsedDocument = JSON.parse(text);
        } catch {
            // Not JSON - that is fine, could be binary content
            this.logger.debug(`CID ${cid} content is not valid JSON`);
        }

        if (parsedDocument) {
            // Update the message's documents field with the parsed content
            await this.dataSource.query(
                `UPDATE message
                 SET documents = $1
                 WHERE files @> ARRAY[$2]`,
                [
                    JSON.stringify(parsedDocument),
                    cid,
                ],
            );

            // If this looks like a VC, attempt eager project mapping.
            // Errors here are non-fatal — the batch reconciler is the safety net.
            const isVc = Array.isArray(parsedDocument['credentialSubject']);
            if (!isVc) {
                this.logger.warn(
                    `VC-shaped document cid=${cid} msg=${messageTimestamp} has no usable credentialSubject array`,
                );
            }
            else {
                // Stamp policyId on the message row from credentialSubject[0].policyId
                // so VC -> policy version lookups become a simple indexed query.
                // Non-project VCs (StandardRegistry, MintToken, UserRole) have
                // no policyId — column stays null. The "no policyId" warning
                // (only for VCs that LOOK like project VCs but are missing it)
                // is emitted by upsertProjectFromVc, where it can be ordered
                // correctly against the non-project-type skip.
                const cs = parsedDocument['credentialSubject'] as Array<Record<string, unknown>>;
                const policyId = cs[0] && typeof cs[0] === 'object'
                    ? (cs[0]['policyId'] as string | undefined) ?? null
                    : null;
                if (policyId) {
                    await this.dataSource.query(
                        `UPDATE message SET "policyId" = $1 WHERE files @> ARRAY[$2]`,
                        [policyId, cid],
                    );
                }

                try {
                    await this.projectMapperService.upsertProjectFromVc(messageTimestamp);
                } catch (err) {
                    this.logger.warn(
                        `Eager project mapping failed for vc=${messageTimestamp} cid=${cid}: ` +
                        `${err instanceof Error ? err.message : String(err)}`,
                    );
                }
            }
        }

        // Remove any stale failure record — this CID is now successfully fetched
        await this.failureRepo.deleteFailure(cid);

        // Publish recovery event (covers both first-time successes and retried successes)
        await this.publishEvent({ type: 'ipfs-fetch-recovered', cid, timestamp: Date.now() });

        // Publish document-loaded event for real-time consumers
        await this.publishEvent({
            type: 'document-loaded',
            messageId: messageTimestamp,
            cid,
            contentLength: content.length,
            hasDocument: !!parsedDocument,
        });

        this.logger.log(`IPFS content fetched for CID ${cid} (${content.length} bytes)`);
    }

    /**
     * Keeps message_ipfs_cid.status in sync — see its column comment in
     * schema-bootstrap.ts. Called from both places in this file that mean
     * "this CID is fetched": a fresh successful fetch, and the early-return
     * path for a CID that already had an ipfs_files row (which may predate
     * this column, or may not have gone through the reconcile path yet).
     */
    private async markCidFetched(cid: string): Promise<void> {
        await this.dataSource.query(
            `UPDATE message_ipfs_cid SET status = 'fetched' WHERE cid = $1 AND status <> 'fetched'`,
            [cid],
        );
    }

    private async publishEvent(payload: Record<string, unknown>): Promise<void> {
        try {
            await this.redis.publish('se:events', JSON.stringify(payload));
        } catch (err) {
            this.logger.warn(`Failed to publish se:events: ${(err as Error).message}`);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<IpfsFetchJobData>, error: Error): void {
        void this.handleFailure(job, error);
    }

    private async handleFailure(job: Job<IpfsFetchJobData>, error: Error): Promise<void> {
        try {
            const category = IpfsService.classifyError(error);
            this.logger.error(
                `IPFS fetch job ${job.id} failed for CID ${job.data.cid} [${category}]: ${error.message}`,
                error.stack,
            );

            await this.failureRepo.upsertFailure(
                job.data.cid,
                error.message.slice(0, 1000),
                category,
                job.data.messageTimestamp ?? null,
            );

            await this.publishEvent({
                type: 'ipfs-fetch-failed',
                cid: job.data.cid,
                errorCategory: category,
                attemptCount: job.attemptsMade,
                lastError: error.message.slice(0, 500),
                timestamp: Date.now(),
            });
        } catch (handlerErr) {
            this.logger.error('Failed to handle IPFS failure event', handlerErr);
        }
    }
}

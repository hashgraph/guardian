import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { IpfsService } from '../services/ipfs.service';
import { ProjectMapperService } from '../services/project-mapper.service';
import { IpfsFetchFailureRepository } from '../repositories/ipfs-fetch-failure.repository';

export interface IpfsFetchJobData {
    cid: string;
    messageTimestamp: string;
}

@Processor(QUEUE_NAMES.IPFS_FETCH)
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

        // Check if already fetched
        const existing = await this.dataSource.query(
            `SELECT id FROM ipfs_files WHERE cid = $1 LIMIT 1`,
            [cid],
        );

        if (existing.length > 0) {
            this.logger.debug(`CID ${cid} already exists in ipfs_files, skipping fetch`);
            // Clean up any stale failure record and publish recovery event
            await this.failureRepo.deleteFailure(cid);
            await this.publishEvent({ type: 'ipfs-fetch-recovered', cid, timestamp: Date.now() });
            return;
        }

        // Fetch content from IPFS — classify and handle errors
        let content: Buffer;
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
            if (isVc) {
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

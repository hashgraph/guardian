import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { IpfsService } from '../services/ipfs.service';
import { ProjectMapperService } from '../services/project-mapper.service';

export interface IpfsFetchJobData {
    cid: string;
    messageTimestamp: string;
}

@Processor(QUEUE_NAMES.IPFS_FETCH)
export class IpfsFetchProcessor extends WorkerHost {
    private readonly logger = new Logger(IpfsFetchProcessor.name);

    constructor(
        private readonly ipfsService: IpfsService,
        private readonly dataSource: DataSource,
        private readonly projectMapperService: ProjectMapperService,
        @Inject('REDICT_PUB') private readonly redis: Redis,
    ) {
        super();
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
            return;
        }

        // Fetch content from IPFS
        const content = await this.ipfsService.fetchContent(cid);

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

        // Publish event to Redict for real-time consumers
        await this.redis.publish('se:events', JSON.stringify({
            type: 'document-loaded',
            messageId: messageTimestamp,
            cid,
            contentLength: content.length,
            hasDocument: !!parsedDocument,
        }));

        this.logger.log(`IPFS content fetched for CID ${cid} (${content.length} bytes)`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<IpfsFetchJobData>, error: Error): void {
        this.logger.error(
            `IPFS fetch job ${job.id} failed for CID ${job.data.cid}: ${error.message}`,
            error.stack,
        );
    }
}

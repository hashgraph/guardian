import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { QueueRegistry } from '../queues/queue.registry';
import { BASE_QUEUE_NAMES } from '@shared/config/bullmq.config';
import { PolicyDecodeJobData } from '@worker/processors/policy-decode.processor';
import { ProjectReparseJobData } from '@worker/processors/project-reparse.processor';

@Injectable()
export class PoliciesService {
    private readonly logger = new Logger(PoliciesService.name);
    private readonly zipStorageRoot: string;

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly queueRegistry: QueueRegistry,
    ) {
        this.zipStorageRoot = resolve(process.env.POLICY_ZIP_STORAGE_PATH || './data/policy-zips');
    }

    /**
     * Clears the policy decode state and re-enqueues a policy-decode job for
     * the latest CID associated with the given policyTopicId.
     *
     * When forceRedownload=true, deletes the cached zip from local storage so
     * the processor will re-download from IPFS before decoding.
     */
    async redecodePolicy(
        network: string,
        topicId: string,
        forceRedownload: boolean,
    ): Promise<{ enqueued: boolean; jobId: string; sourceCid: string }> {
        const ds = this.dataSources.getDataSource(network);

        const policyRows: Array<{ sourceCid: string }> = await ds.query(
            `SELECT "sourceCid"
             FROM policy
             WHERE "policyTopicId" = $1
             ORDER BY "createdAt" DESC
             LIMIT 1`,
            [topicId],
        );

        if (policyRows.length === 0) {
            throw new NotFoundException(
                `No policy row found for policyTopicId "${topicId}" on ${network}.`,
            );
        }

        const { sourceCid } = policyRows[0];

        if (forceRedownload) {
            await this.deleteZip(sourceCid);
        }

        // Reset the decode state so the processor re-processes.
        await ds.query(
            `UPDATE policy
             SET "decodeStatus" = 'pending',
                 attempts       = 0,
                 "policyMapping" = NULL,
                 "schemaFields"  = NULL,
                 "mappingSource" = 'auto',
                 error           = NULL,
                 "updatedAt"     = now()
             WHERE "policyTopicId" = $1`,
            [topicId],
        );

        // Recover the message timestamp so the processor can locate the source message.
        const msgRows: Array<{ consensusTimestamp: string }> = await ds.query(
            `SELECT "consensusTimestamp"
             FROM message
             WHERE type = 'Instance-Policy'
               AND action = 'publish-policy'
               AND "topicId" = $1
             ORDER BY "consensusTimestamp" DESC
             LIMIT 1`,
            [topicId],
        );

        const messageTimestamp = msgRows[0]?.consensusTimestamp ?? '0.0';

        const jobData: PolicyDecodeJobData = {
            cid: sourceCid,
            messageTimestamp,
            policyTopicId: topicId,
        };

        const jobId = `policy-redecode-${topicId}-${Date.now()}`;
        const queue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.POLICY_DECODE);
        await queue.add('decode', jobData, { jobId });

        this.logger.log(
            `Enqueued redecode for policyTopicId=${topicId} cid=${sourceCid} ` +
            `forceRedownload=${forceRedownload} jobId=${jobId}`,
        );

        return { enqueued: true, jobId, sourceCid };
    }

    /**
     * Enqueues PROJECT_REPARSE jobs for every VC-Document linked to policies
     * with the given policyTopicId, using the current policyMapping (manual
     * edits are preserved).
     */
    async reparseProjects(
        network: string,
        topicId: string,
    ): Promise<{ enqueued: number }> {
        const ds = this.dataSources.getDataSource(network);

        // Find all policyIds for this topic.
        const policyIdRows: Array<{ policyId: string }> = await ds.query(
            `SELECT "policyId" FROM policy WHERE "policyTopicId" = $1 AND "decodeStatus" = 'decoded'`,
            [topicId],
        );

        if (policyIdRows.length === 0) {
            this.logger.log(
                `reparseProjects: no decoded policy rows for policyTopicId=${topicId} on ${network}`,
            );
            return { enqueued: 0 };
        }

        const policyIds = policyIdRows.map(r => r.policyId);

        const vcRows: Array<{ consensusTimestamp: string }> = await ds.query(
            `SELECT "consensusTimestamp"
             FROM message
             WHERE "policyId" = ANY($1::varchar[])
               AND type = 'VC-Document'
               AND documents IS NOT NULL`,
            [policyIds],
        );

        const queue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.PROJECT_REPARSE);

        let enqueued = 0;
        for (const row of vcRows) {
            const canonicalJobId = `project-reparse-${row.consensusTimestamp}`;
            try {
                const stale = await queue.getJob(canonicalJobId);
                if (stale) await stale.remove();
            } catch {
                // ignore — job missing is fine
            }
            const jobData: ProjectReparseJobData = {
                messageConsensusTimestamp: row.consensusTimestamp,
            };
            await queue.add('reparse', jobData, {
                jobId: `project-reparse-${row.consensusTimestamp}-${Date.now()}`,
            });
            enqueued++;
        }

        this.logger.log(
            `reparseProjects: enqueued ${enqueued} job(s) for policyTopicId=${topicId} on ${network}`,
        );

        return { enqueued };
    }

    private async deleteZip(cid: string): Promise<void> {
        if (!/^[A-Za-z0-9]+$/.test(cid)) {
            this.logger.warn(`deleteZip: skipping invalid CID "${cid}"`);
            return;
        }
        const path = join(this.zipStorageRoot, `${cid}.zip`);
        try {
            await fs.unlink(path);
            this.logger.log(`Deleted cached zip for cid=${cid}`);
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') throw err;
        }
    }
}

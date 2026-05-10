import {
    Processor,
    WorkerHost,
    OnWorkerEvent,
    InjectQueue,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import {
    ParsedMessage,
    decodeBase64Message,
    parseMessageJson,
    extractDiscoverableTopics,
    extractTokenIds,
} from '@shared/utils/message-parser';

export interface MessageProcessJobData {
    consensusTimestamp: string;
    topicId: string;
}

// Message types for which IPFS fetch is always enqueued immediately (not VCs).
const EAGER_IPFS_TYPES = new Set([
    'Standard Registry',
    'Policy',
    'Instance-Policy',
    'Module',
    'Tool',
    'Token',
    'Schema',
]);

@Processor(QUEUE_NAMES.MESSAGE_PARSE)
export class MessageProcessProcessor extends WorkerHost {
    private readonly logger = new Logger(MessageProcessProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_DECODE) private readonly policyDecodeQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<MessageProcessJobData>): Promise<void> {
        const { consensusTimestamp, topicId } = job.data;

        // Read from message_cache
        const rows = await this.dataSource.query(
            `SELECT * FROM message_cache WHERE "consensusTimestamp" = $1 LIMIT 1`,
            [consensusTimestamp],
        );

        if (rows.length === 0) {
            this.logger.warn(
                `Message cache entry not found for ${consensusTimestamp}`,
            );
            return;
        }

        const cacheEntry = rows[0];

        // Base64 decode the message
        const decoded = decodeBase64Message(cacheEntry.message);
        if (!decoded) {
            this.logger.warn(
                `Failed to base64 decode message ${consensusTimestamp}`,
            );
            await this.updateCacheStatus(consensusTimestamp, 'DECODE_ERROR');
            return;
        }

        // Parse JSON
        const parsed = parseMessageJson(decoded);
        if (!parsed) {
            this.logger.warn(
                `Failed to parse JSON for message ${consensusTimestamp}`,
            );
            await this.updateCacheStatus(consensusTimestamp, 'PARSE_ERROR');
            return;
        }

        // Upsert into message table
        await this.dataSource.query(
            `INSERT INTO message (
                "consensusTimestamp",
                "topicId",
                owner,
                uuid,
                type,
                action,
                status,
                "statusReason",
                "statusMessage",
                lang,
                "responseType",
                "sequenceNumber",
                files,
                options,
                topics,
                tokens,
                "dataSource",
                "lastUpdate",
                "createdAt",
                "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'mirror_node', $17, NOW(), NOW())
            ON CONFLICT ("consensusTimestamp") DO UPDATE SET
                owner = COALESCE(EXCLUDED.owner, message.owner),
                uuid = COALESCE(EXCLUDED.uuid, message.uuid),
                type = EXCLUDED.type,
                action = EXCLUDED.action,
                status = COALESCE(EXCLUDED.status, message.status),
                "statusReason" = COALESCE(EXCLUDED."statusReason", message."statusReason"),
                "statusMessage" = COALESCE(EXCLUDED."statusMessage", message."statusMessage"),
                lang = COALESCE(EXCLUDED.lang, message.lang),
                "responseType" = COALESCE(EXCLUDED."responseType", message."responseType"),
                "sequenceNumber" = EXCLUDED."sequenceNumber",
                files = EXCLUDED.files,
                options = COALESCE(message.options, '{}'::jsonb) || COALESCE(EXCLUDED.options, '{}'::jsonb),
                topics = EXCLUDED.topics,
                tokens = EXCLUDED.tokens,
                "dataSource" = CASE
                    WHEN message."dataSource" = 'guardian_api' THEN 'both'
                    ELSE 'mirror_node'
                END,
                "lastUpdate" = EXCLUDED."lastUpdate",
                "updatedAt" = NOW()`,
            [
                consensusTimestamp,
                topicId,
                parsed.owner || cacheEntry.owner,
                parsed.uuid,
                parsed.type,
                parsed.action,
                parsed.status,
                parsed.statusReason,
                parsed.statusMessage,
                parsed.lang,
                parsed.responseType,
                cacheEntry.sequenceNumber,
                parsed.files.length > 0 ? parsed.files : null,
                Object.keys(parsed.options).length > 0
                    ? JSON.stringify(parsed.options)
                    : null,
                parsed.topics.length > 0 ? parsed.topics : null,
                parsed.tokens.length > 0 ? parsed.tokens : null,
                Date.now().toString(),
            ],
        );

        const isPublishedPolicy =
            parsed.type === 'Instance-Policy' &&
            (parsed.action || '').toLowerCase() === 'publish-policy';

        if (isPublishedPolicy) {
            const optionTopicId = parsed.options['topicId'];
            const policyTopicId = typeof optionTopicId === 'string' && optionTopicId.length > 0
                ? optionTopicId
                : topicId;

            for (const cid of parsed.files) {
                await this.policyDecodeQueue.add('decode', {
                    cid,
                    messageTimestamp: consensusTimestamp,
                    policyTopicId,
                }, {
                    jobId: `policy-decode-${policyTopicId}-${cid}`,
                });
            }
        }

        // ── IPFS fetch strategy ────────────────────────────────────────────────
        // VC-Document fetches are deferred until the parent policy is decoded
        // so we don't waste gateway slots on VCs from broken methodologies.
        // All other types (Schema, Standard Registry, Instance-Policy, etc.)
        // are fetched eagerly as before.
        if (parsed.type === 'VC-Document') {
            await this.enqueueVcIpfsFetchIfReady(parsed, consensusTimestamp, topicId);
        } else if (EAGER_IPFS_TYPES.has(parsed.type)) {
            for (const cid of parsed.files) {
                await this.ipfsQueue.add(
                    'fetch',
                    { cid, messageTimestamp: consensusTimestamp },
                    { jobId: `ipfs-${cid}` },
                );
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Discover and enqueue child topics
        const discoveredTopics = extractDiscoverableTopics(parsed, topicId);
        for (const topic of discoveredTopics) {
            await this.topicQueue.add(
                'sync',
                {
                    topicId: topic.topicId,
                    fromSequenceNumber: 0,
                    isOrgTopic: topic.isOrgTopic,
                },
                {
                    jobId: `topic-${topic.topicId}-0`,
                    priority: topic.isOrgTopic ? 1 : 10,
                },
            );
        }

        // Enqueue token sync for discovered tokens
        const tokenIds = extractTokenIds(parsed);
        for (const tokenId of tokenIds) {
            await this.tokenQueue.add(
                'sync',
                {
                    tokenId,
                    fetchNfts: true,
                    fromSerial: 0,
                },
                {
                    jobId: `token-${tokenId}`,
                },
            );
        }

        // Update cache status
        await this.updateCacheStatus(consensusTimestamp, 'PROCESSED');

        this.logger.debug(
            `Processed message ${consensusTimestamp}: type=${parsed.type} action=${parsed.action}`,
        );
    }

    /**
     * For a VC-Document: walk the topic parent chain to find the nearest policy
     * topic ID, then check policy_decode_status. Enqueues IPFS fetch only when the
     * policy is decoded successfully. If the policy topic cannot be resolved, or
     * its status is not 'success', the fetch is deferred; it will be backfilled by
     * PolicyDecodeProcessor once that policy succeeds, or by the boot-time backfill
     * in SyncSchedulerService.
     */
    private async enqueueVcIpfsFetchIfReady(
        parsed: ParsedMessage,
        consensusTimestamp: string,
        topicId: string,
    ): Promise<void> {
        if (parsed.files.length === 0) return;

        const policyTopicId = await this.resolveParentPolicyTopicId(topicId);
        if (!policyTopicId) {
            this.logger.debug(
                `VC ${consensusTimestamp}: could not resolve policy topic — deferring IPFS fetch`,
            );
            return;
        }

        const statusRows: Array<{ status: string }> = await this.dataSource.query(
            `SELECT status FROM policy_decode_status WHERE "policyTopicId" = $1 LIMIT 1`,
            [policyTopicId],
        );

        if (statusRows.length === 0 || statusRows[0].status !== 'success') {
            this.logger.debug(
                `VC ${consensusTimestamp}: policy=${policyTopicId} not yet decoded — deferring IPFS fetch`,
            );
            return;
        }

        for (const cid of parsed.files) {
            await this.ipfsQueue.add(
                'fetch',
                { cid, messageTimestamp: consensusTimestamp },
                { jobId: `ipfs-${cid}` },
            );
        }
    }

    /**
     * Walks the topic parent chain (via Topic messages) to find the Instance-Policy
     * topic ID that is the logical policy owner for a given topic.
     *
     * Stops at the first ancestor that appears in message as an Instance-Policy row.
     * Returns null if the chain is exhausted without finding a policy topic.
     *
     * Cached per-call with a local Map to avoid repeated DB round trips when
     * multiple VCs from the same topic are processed in one job batch.
     */
    private async resolveParentPolicyTopicId(topicId: string): Promise<string | null> {
        // Walk up to 12 hops — the parent chain is always shallow in practice.
        let currentTopicId: string | null = topicId;
        const visited = new Set<string>();

        for (let i = 0; i < 12; i++) {
            if (!currentTopicId || visited.has(currentTopicId)) break;
            visited.add(currentTopicId);

            // Check if this topic is itself an Instance-Policy topic
            const policyRows: Array<{ topicId: string }> = await this.dataSource.query(
                `SELECT "topicId"
                 FROM message
                 WHERE type = 'Instance-Policy'
                   AND action = 'publish-policy'
                   AND "topicId" = $1
                 LIMIT 1`,
                [currentTopicId],
            );
            if (policyRows.length > 0) return currentTopicId;

            // Also check instanceTopicId — policies reference their instance topic
            const instRows: Array<{ topicId: string }> = await this.dataSource.query(
                `SELECT "topicId"
                 FROM message
                 WHERE type = 'Instance-Policy'
                   AND action = 'publish-policy'
                   AND options->>'instanceTopicId' = $1
                 LIMIT 1`,
                [currentTopicId],
            );
            if (instRows.length > 0) return instRows[0].topicId;

            // Walk one level up via Topic parentId
            const parentRows: Array<{ parent_id: string | null }> = await this.dataSource.query(
                `SELECT options->>'parentId' AS parent_id
                 FROM message
                 WHERE type = 'Topic' AND "topicId" = $1
                 LIMIT 1`,
                [currentTopicId],
            );
            currentTopicId = parentRows[0]?.parent_id ?? null;
        }

        return null;
    }

    private async updateCacheStatus(
        consensusTimestamp: string,
        status: string,
    ): Promise<void> {
        await this.dataSource.query(
            `UPDATE message_cache SET status = $1, "lastUpdate" = $2 WHERE "consensusTimestamp" = $3`,
            [status, Date.now().toString(), consensusTimestamp],
        );
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<MessageProcessJobData>, error: Error): void {
        this.logger.error(
            `Message process job ${job.id} failed for ${job.data.consensusTimestamp}: ${error.message}`,
            error.stack,
        );
    }
}

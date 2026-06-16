import {
    Processor,
    WorkerHost,
    OnWorkerEvent,
    InjectQueue,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';
import { ROOT_TOPICS } from '@shared/config/configuration';
import {
    ParsedMessage,
    parseMessageJson,
    extractDiscoverableTopics,
    extractTokenIds,
} from '@shared/utils/message-parser';
import { isTopicBlocked } from '@shared/config/topic-blocklist';
import { isRegistryAllowlistActive, isTopicAllowedFromSeed } from '@shared/config/registry-allowlist';

export interface MessageProcessJobData {
    consensusTimestamp: string;
    topicId: string;
}

// Message types for which IPFS fetch is always enqueued immediately (not VCs).
const EAGER_IPFS_TYPES = new Set([
    'Standard Registry',
    'Tag',
    'Token',
    //'VP-Document' TODO: Check the relationship attribute whether we can use it
]);

@Processor(QUEUE_NAMES.MESSAGE_PARSE)
export class MessageProcessProcessor extends WorkerHost {
    private readonly logger = new Logger(MessageProcessProcessor.name);
    private readonly seedTopicId: string;

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
        @InjectQueue(QUEUE_NAMES.POLICY_DECODE) private readonly policyDecodeQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOPIC_SYNC) private readonly topicQueue: Queue,
        @InjectQueue(QUEUE_NAMES.TOKEN_SYNC) private readonly tokenQueue: Queue,
    ) {
        super();
        const network = this.configService.get<string>('app.hedera.network') || 'testnet';
        this.seedTopicId = this.configService.get<string>('app.seedTopicId')
            || ROOT_TOPICS[network]
            || '';
    }

    async process(job: Job<MessageProcessJobData>): Promise<void> {
        const { consensusTimestamp, topicId } = job.data;

        if (isTopicBlocked(topicId)) {
            this.logger.debug(`Topic ${topicId} is blocklisted — skipping message ${consensusTimestamp}`);
            return;
        }

        // Read from message_cache
        // TODO: Optimise to read bulk
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

        // Reassemble HCS chunks if needed. Hedera caps each consensus message at
        // 1024 bytes; larger payloads ship as multiple chunks sharing a chunkId.
        // Each chunk is independent base64 — decode each to bytes, concat bytes,
        // then UTF-8 decode the whole thing.
        const decoded = await this.decodeMessage(cacheEntry, consensusTimestamp);
        if (decoded === null) return;       // waiting for more chunks
        if (decoded === '') {
            this.logger.warn(`Failed to base64 decode message ${consensusTimestamp}`);
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

            const optionInstanceTopicId = parsed.options['instanceTopicId'];
            const instanceTopicId = typeof optionInstanceTopicId === 'string' && optionInstanceTopicId.length > 0
                ? optionInstanceTopicId
                : null;

            for (const cid of parsed.files) {
                await this.policyDecodeQueue.add('decode', {
                    cid,
                    messageTimestamp: consensusTimestamp,
                    policyTopicId,
                    instanceTopicId,
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

        // Discover and enqueue child topics.
        // When ONLY_REGISTRY_TOPIC is set, only follow topics from the seed
        // topic that appear in the allowlist. Deeper discoveries are unfiltered.
        const discoveredTopics = extractDiscoverableTopics(parsed, topicId);
        const filterSeedDiscovery = topicId === this.seedTopicId && isRegistryAllowlistActive();
        for (const topic of discoveredTopics) {
            if (filterSeedDiscovery && !isTopicAllowedFromSeed(topic.topicId)) {
                this.logger.debug(
                    `Skipping topic ${topic.topicId} — not in ONLY_REGISTRY_TOPIC allowlist`,
                );
                continue;
            }
            // No priority: prioritized jobs are starved here because the
            // continuous topic re-poll stream keeps the `wait` list non-empty,
            // so the worker never drains the `prioritized` set. Enqueueing
            // discovery on the same `wait` FIFO guarantees it is processed.
            await this.topicQueue.add(
                'sync',
                {
                    topicId: topic.topicId,
                    fromSequenceNumber: 0,
                    isOrgTopic: topic.isOrgTopic,
                },
                {
                    jobId: `topic-${topic.topicId}-0`,
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
     * topic ID, then check the policy table. Enqueues IPFS fetch only when the
     * policy is decoded successfully. If the policy topic cannot be resolved, or
     * its decodeStatus is not 'decoded', the fetch is deferred; it will be
     * backfilled by PolicyDecodeProcessor once that policy succeeds, or by the
     * boot-time backfill in SyncSchedulerService.
     */
    private async enqueueVcIpfsFetchIfReady(
        parsed: ParsedMessage,
        consensusTimestamp: string,
        topicId: string,
    ): Promise<void> {
        if (parsed.files.length === 0) return;

        // Registry profile topics aren't under any policy. Their VCs carry the
        // OrganizationName used as the registry display-name fallback in
        // BusinessViewBuilderProcessor, so they must fetch eagerly.
        if (await this.isStandardRegistryProfileTopic(topicId)) {
            for (const cid of parsed.files) {
                await this.ipfsQueue.add(
                    'fetch',
                    { cid, messageTimestamp: consensusTimestamp },
                    { jobId: `ipfs-${cid}` },
                );
            }
            return;
        }

        const policyTopicId = await this.resolveParentPolicyTopicId(topicId);
        if (!policyTopicId) {
            this.logger.debug(
                `VC ${consensusTimestamp}: could not resolve policy topic — deferring IPFS fetch`,
            );
            return;
        }

        const statusRows: Array<{ decodeStatus: string }> = await this.dataSource.query(
            `SELECT "decodeStatus" FROM policy WHERE "policyTopicId" = $1 LIMIT 1`,
            [policyTopicId],
        );

        if (statusRows.length === 0 || statusRows[0].decodeStatus !== 'decoded') {
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
     * Returns true if the given topic is the profile/DID topic of any Standard
     * Registry (i.e., referenced by `options.topicId` on a `Standard Registry`
     * announcement message in the root topic).
     */
    // TODO: Optimise this get, cache all the standard registries in memory, to reduct DB load
    private async isStandardRegistryProfileTopic(topicId: string): Promise<boolean> {
        const rows: Array<{ ok: number }> = await this.dataSource.query(
            `SELECT 1 AS ok
             FROM message
             WHERE type = 'Standard Registry'
               AND options->>'topicId' = $1
             LIMIT 1`,
            [topicId],
        );
        return rows.length > 0;
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

    /**
     * Returns the assembled UTF-8 payload, OR:
     *   - `null` when this is a multi-chunk message and not all chunks have
     *     landed yet (the last chunk's processing run will reassemble).
     *   - `''` when base64 decoding fails (caller marks DECODE_ERROR).
     */
    private async decodeMessage(
        cacheEntry: { message: string; chunkId: string | null; chunkTotal: number | null },
        consensusTimestamp: string,
    ): Promise<string | null> {
        const total = cacheEntry.chunkTotal ?? 1;
        if (!cacheEntry.chunkId || total <= 1) {
            try {
                return Buffer.from(cacheEntry.message, 'base64').toString('utf-8');
            } catch {
                return '';
            }
        }

        const chunks: Array<{ message: string }> = await this.dataSource.query(
            `SELECT message FROM message_cache
             WHERE "chunkId" = $1
             ORDER BY "chunkNumber"`,
            [cacheEntry.chunkId],
        );
        if (chunks.length < total) {
            this.logger.debug(
                `Message ${consensusTimestamp} chunk ${chunks.length}/${total} — waiting for more`,
            );
            return null;
        }

        try {
            const buffers = chunks.map(c => Buffer.from(c.message, 'base64'));
            return Buffer.concat(buffers).toString('utf-8');
        } catch {
            return '';
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<MessageProcessJobData>, error: Error): void {
        this.logger.error(
            `Message process job ${job.id} failed for ${job.data.consensusTimestamp}: ${error.message}`,
            error.stack,
        );
    }
}

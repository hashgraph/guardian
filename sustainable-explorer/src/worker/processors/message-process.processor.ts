import {
    Processor,
    WorkerHost,
    OnWorkerEvent,
    InjectQueue,
} from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { DataSource } from "typeorm";
import { QUEUE_NAMES } from "@shared/config/bullmq.config";
import {
    ParsedMessage,
    decodeBase64Message,
    parseMessageJson,
    extractDiscoverableTopics,
    extractTokenIds,
} from "@shared/utils/message-parser";

export interface MessageProcessJobData {
    consensusTimestamp: string;
    topicId: string;
}

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
            await this.updateCacheStatus(consensusTimestamp, "DECODE_ERROR");
            return;
        }

        // Parse JSON
        const parsed = parseMessageJson(decoded);
        if (!parsed) {
            this.logger.warn(
                `Failed to parse JSON for message ${consensusTimestamp}`,
            );
            await this.updateCacheStatus(consensusTimestamp, "PARSE_ERROR");
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

        // Enqueue IPFS fetch jobs for each CID in files
        for (const cid of parsed.files) {
            await this.ipfsQueue.add(
                "fetch",
                {
                    cid,
                    messageTimestamp: consensusTimestamp,
                },
                {
                    jobId: `ipfs-${cid}`,
                },
            );
        }

        // Discover and enqueue child topics
        const discoveredTopics = extractDiscoverableTopics(parsed, topicId);
        for (const topic of discoveredTopics) {
            await this.topicQueue.add(
                "sync",
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

        // // Enqueue token sync for discovered tokens
        const tokenIds = extractTokenIds(parsed);
        for (const tokenId of tokenIds) {
            await this.tokenQueue.add(
                "sync",
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
        await this.updateCacheStatus(consensusTimestamp, "PROCESSED");

        this.logger.debug(
            `Processed message ${consensusTimestamp}: type=${parsed.type} action=${parsed.action}`,
        );
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

    @OnWorkerEvent("failed")
    onFailed(job: Job<MessageProcessJobData>, error: Error): void {
        this.logger.error(
            `Message process job ${job.id} failed for ${job.data.consensusTimestamp}: ${error.message}`,
            error.stack,
        );
    }
}

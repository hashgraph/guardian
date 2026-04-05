import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';

export interface MessageProcessJobData {
    consensusTimestamp: string;
    topicId: string;
}

interface ParsedMessage {
    type: string;
    action: string | null;
    lang: string | null;
    uuid: string | null;
    owner: string | null;
    status: string | null;
    statusReason: string | null;
    statusMessage: string | null;
    responseType: string | null;
    files: string[];
    topics: string[];
    tokens: string[];
    options: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.MESSAGE_PARSE)
export class MessageProcessProcessor extends WorkerHost {
    private readonly logger = new Logger(MessageProcessProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        @InjectQueue(QUEUE_NAMES.IPFS_FETCH) private readonly ipfsQueue: Queue,
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
            this.logger.warn(`Message cache entry not found for ${consensusTimestamp}`);
            return;
        }

        const cacheEntry = rows[0];

        // Base64 decode the message
        let decoded: string;
        try {
            decoded = Buffer.from(cacheEntry.message, 'base64').toString('utf-8');
        } catch {
            this.logger.warn(`Failed to base64 decode message ${consensusTimestamp}`);
            await this.updateCacheStatus(consensusTimestamp, 'DECODE_ERROR');
            return;
        }

        // Parse JSON
        let parsed: ParsedMessage;
        try {
            const json = JSON.parse(decoded);
            parsed = this.extractFields(json);
        } catch {
            this.logger.warn(`Failed to parse JSON for message ${consensusTimestamp}`);
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
                Object.keys(parsed.options).length > 0 ? JSON.stringify(parsed.options) : null,
                parsed.topics.length > 0 ? parsed.topics : null,
                parsed.tokens.length > 0 ? parsed.tokens : null,
                Date.now().toString(),
            ],
        );

        // Enqueue IPFS fetch jobs for each CID in files
        for (const cid of parsed.files) {
            await this.ipfsQueue.add('fetch', {
                cid,
                messageTimestamp: consensusTimestamp,
            }, {
                jobId: `ipfs-${cid}`,
            });
        }

        // Discover and enqueue all child/related topics found in message options.
        // Different message types use different fields to reference child topics:
        //   Topic:             childId, topicId
        //   Policy:            instanceTopicId, topicId
        //   Standard Registry: registrantTopicId, topicId
        // const topicFields = ['childId', 'instanceTopicId', 'registrantTopicId', 'topicId'];
        // const discoveredTopics = new Set<string>();

        // for (const field of topicFields) {
        //     const value = parsed.options[field] as string | undefined;
        //     if (value && !discoveredTopics.has(value) && value !== topicId) {
        //         discoveredTopics.add(value);
        //         const isOrg = field === 'registrantTopicId';
        //         await this.topicQueue.add('sync', {
        //             topicId: value,
        //             fromSequenceNumber: 0,
        //             isOrgTopic: isOrg,
        //         }, {
        //             jobId: `topic-${value}-0`,
        //             priority: isOrg ? 1 : 10,
        //         });
        //     }
        // }

        // If options has tokenId, enqueue token-sync
        // const tokenId = parsed.options['tokenId'] as string | undefined;
        // if (tokenId) {
        //     await this.tokenQueue.add('sync', {
        //         tokenId,
        //         fetchNfts: true,
        //         fromSerial: 0,
        //     }, {
        //         jobId: `token-${tokenId}`,
        //     });
        // }

        // Update cache status
        await this.updateCacheStatus(consensusTimestamp, 'PROCESSED');

        this.logger.debug(`Processed message ${consensusTimestamp}: type=${parsed.type} action=${parsed.action}`);
    }

    /**
     * Simplified message parser. Extracts type, action, options, files
     * from the parsed JSON based on the type field.
     */
    private extractFields(json: Record<string, unknown>): ParsedMessage {
        const type = (json['type'] as string) || 'Unknown';
        const action = (json['action'] as string) || null;

        const result: ParsedMessage = {
            type,
            action,
            lang: (json['lang'] as string) || null,
            uuid: (json['id'] as string) || (json['uuid'] as string) || null,
            owner: (json['did'] as string) || (json['owner'] as string) || null,
            status: (json['status'] as string) || null,
            statusReason: (json['statusReason'] as string) || null,
            statusMessage: (json['statusMessage'] as string) || null,
            responseType: (json['responseType'] as string) || null,
            files: [],
            topics: [],
            tokens: [],
            options: {},
        };

        // Extract CIDs from various locations
        const cids = json['cid'] || json['urls'] || json['files'];
        if (Array.isArray(cids)) {
            result.files = cids.filter((c): c is string => typeof c === 'string');
        } else if (typeof cids === 'string') {
            result.files = [cids];
        }

        // Build options based on type
        switch (type) {
            case 'Topic':
                result.options = {
                    childId: json['childId'] || json['topicId'] || null,
                    parentId: json['parentId'] || null,
                    name: json['name'] || null,
                    description: json['description'] || null,
                    owner: json['owner'] || json['did'] || null,
                    messageType: json['messageType'] || null,
                };
                break;

            case 'Policy':
                result.options = {
                    name: json['name'] || null,
                    description: json['description'] || null,
                    topicDescription: json['topicDescription'] || null,
                    version: json['version'] || null,
                    policyTag: json['policyTag'] || null,
                    owner: json['owner'] || null,
                    topicId: json['topicId'] || null,
                    instanceTopicId: json['instanceTopicId'] || null,
                    synchronizationTopicId: json['synchronizationTopicId'] || null,
                    hash: json['hash'] || null,
                    hashMap: json['hashMap'] || null,
                    tools: json['tools'] || null,
                    registryId: json['registryId'] || null,
                };
                if (json['tokenId']) {
                    result.tokens.push(json['tokenId'] as string);
                }
                if (Array.isArray(json['tokenIds'])) {
                    result.tokens.push(...(json['tokenIds'] as string[]));
                }
                if (json['instanceTopicId']) {
                    result.topics.push(json['instanceTopicId'] as string);
                }
                break;

            case 'VC-Document':
            case 'VP-Document':
            case 'DID-Document':
                result.options = {
                    issuer: json['issuer'] || null,
                    relationships: json['relationships'] || null,
                    schema: json['schema'] || null,
                    tokenId: json['tokenId'] || null,
                    amount: json['amount'] || null,
                    memo: json['memo'] || null,
                };
                if (json['tokenId']) {
                    result.tokens.push(json['tokenId'] as string);
                }
                break;

            case 'Standard Registry': {
                const attributes = json['attributes'] as Record<string, unknown> | undefined;
                result.options = {
                    did: json['did'] || null,
                    registrantTopicId: json['registrantTopicId'] || null,
                    name: json['name'] || attributes?.['tags'] || null,
                    description: json['description'] || null,
                    lang: json['lang'] || null,
                    topicId: json['topicId'] || null,
                    action: json['action'] || null,
                    geography: attributes?.['geography'] || null,
                    law: attributes?.['law'] || null,
                    tags: attributes?.['tags'] || null,
                    attributes: attributes || null,
                };
                break;
            }

            case 'Token':
                result.options = {
                    tokenId: json['tokenId'] || null,
                    tokenName: json['tokenName'] || null,
                    tokenSymbol: json['tokenSymbol'] || null,
                    tokenType: json['tokenType'] || null,
                    memo: json['memo'] || null,
                };
                if (json['tokenId']) {
                    result.tokens.push(json['tokenId'] as string);
                }
                break;

            case 'Module':
            case 'Tool':
            case 'Schema':
            case 'Role-Document':
            case 'Contract':
            default:
                result.options = {
                    name: json['name'] || null,
                    description: json['description'] || null,
                    topicId: json['topicId'] || null,
                    tokenId: json['tokenId'] || null,
                };
                if (json['tokenId']) {
                    result.tokens.push(json['tokenId'] as string);
                }
                break;
        }

        return result;
    }

    private async updateCacheStatus(consensusTimestamp: string, status: string): Promise<void> {
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

import { MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';
import { RequiredEntityData } from '@mikro-orm/core';
import { MessageService } from './message-service.js';
import { LogService } from './log-service.js';
import { Parser } from '../utils/parser.js';
import { HederaService } from '../loaders/hedera-service.js';
import { DataBaseHelper, IndexerMessageAPI, Job, MessageCache, TopicCache, TopicMessage, Utils } from '@indexer/common';
import { TokenService } from './token-service.js';
import { MessageStatus, PriorityOptions, PriorityStatus } from '@indexer/interfaces';
import { ChannelService } from 'api/channel.service.js';

export class TopicService {
    public static CYCLE_TIME: number = 30 * 60 * 1000; // 30 minutes
    public static CHANNEL: ChannelService | null;

    public static async updateTopic(job: Job) {
        try {
            const em = DataBaseHelper.getEntityManager();
            const row = await TopicService.randomTopic(em);
            if (!row) {
                job.sleep();
                return;
            }

            const data = await HederaService.getMessages(row.topicId, row.messages);

            if (data && data.messages.length) {
                const priorityOptions: PriorityOptions = {
                    priorityDate: row.priorityDate,
                    priorityStatus: row.priorityStatus as PriorityStatus || PriorityStatus.NONE,
                    priorityStatusDate: row.priorityStatusDate,
                    priorityTimestamp: row.priorityTimestamp
                }

                const rowMessages = await TopicService.saveMessages(data.messages, priorityOptions);
                if (rowMessages) {
                    const compressed = await TopicService.compressMessages(rowMessages);
                    await MessageService.saveImmediately(compressed, priorityOptions);
                    await TopicService.saveRelationships(compressed, priorityOptions);
                    await em.nativeUpdate(TopicCache, { topicId: row.topicId }, {
                        messages: data.messages[data.messages.length - 1].sequence_number,
                        lastUpdate: Date.now(),
                        hasNext: !!data.links.next,
                        priorityDate: !!data.links.next ? row.priorityDate : null,
                        priorityStatus: !!data.links.next ? PriorityStatus.RUNNING : PriorityStatus.FINISHED,
                    });
                    TopicService.onTopicFinished(row);
                }
            } else if (row.priorityDate) {
                await em.nativeUpdate(TopicCache, { topicId: row.topicId }, {
                    priorityDate: null,
                    priorityStatus: PriorityStatus.FINISHED,
                });
                TopicService.onTopicFinished(row);
            }

        } catch (error) {
            await LogService.error(error, 'update topic');
        }
    }

    public static onTopicFinished(row: TopicCache) {
        if (TopicService.CHANNEL && row.priorityTimestamp) {
            TopicService.CHANNEL.publicMessage(IndexerMessageAPI.ON_PRIORITY_DATA_LOADED, {
                priorityTimestamp: row.priorityTimestamp,
            });
        }
    }

    public static async addTopic(topicId: string, priorityOptions?: PriorityOptions): Promise<boolean> {
        try {
            const em = DataBaseHelper.getEntityManager();
            const old = await em.findOne(TopicCache, { topicId });
            if (!old) {
                await em.persistAndFlush(em.create(TopicCache, {
                    topicId,
                    status: MessageStatus.NONE,
                    lastUpdate: 0,
                    messages: 0,
                    hasNext: false,
                    priorityDate: priorityOptions?.priorityDate,
                    priorityStatus: priorityOptions?.priorityStatus || PriorityStatus.NONE,
                    priorityStatusDate: priorityOptions?.priorityStatusDate,
                    priorityTimestamp: priorityOptions?.priorityTimestamp
                }));
                return true;
            } else {
                return false;
            }
        } catch (error) {
            await LogService.error(error, 'add topic');
            return false;
        }
    }

    public static async addTopics(topicIds: Iterable<string>, priorityOptions?: PriorityOptions): Promise<void> {
        for (const topicId of topicIds) {
            if (topicId && typeof topicId === 'string' && Utils.isTopic(topicId)) {
                await TopicService.addTopic(topicId, priorityOptions);
            }
        }
    }

    private static async randomTopic(em: MongoEntityManager<MongoDriver>): Promise<TopicCache> {
        const now = Date.now();
        const delay = now - TopicService.CYCLE_TIME;

        const setParams = {
            lastUpdate: now,
            hasNext: false
        };

        const collection = await em.getCollection(TopicCache);

        // Try to get priority topics first
        const priorityTopic = await collection.findOneAndUpdate(
            { priorityDate: { $ne: null }},
            { $set: setParams },
            { sort: { priorityDate: -1 }, returnDocument: 'after' }
        );

        if (priorityTopic) {
            return em.map(TopicCache, priorityTopic);
        }

        // Selection from new topics and topics with more data
        let topic = await collection.findOneAndUpdate(
            { $or: [{ lastUpdate: 0 }, { hasNext: true }] },
            { $set: setParams },
            { sort: { lastUpdate: 1 } , returnDocument: 'after' }
        );

        // Selection from all eligible topics
        if (!topic) {
            topic = await collection.findOneAndUpdate(
                { lastUpdate: { $lt: delay } },
                { $set: setParams },
                { sort: { lastUpdate: 1 }, returnDocument: 'after' }
            );
        }

        return topic ? em.map(TopicCache, topic) : null;
    }

    public static async saveMessages(messages: TopicMessage[], priorityOptions?: PriorityOptions): Promise<MessageCache[]> {
        try {
            const em = DataBaseHelper.getEntityManager();
            const rows = [];
            for (const message of messages) {
                const item = TopicService.createMessageCache(message, priorityOptions);
                const row = await TopicService.insertMessage(item, em);
                if (!row) {
                    return;
                }
                rows.push(row);
            }
            return rows;
        } catch (error) {
            await LogService.error(error, 'save message');
            return null;
        }
    }

    public static async insertMessage(
        message: RequiredEntityData<MessageCache>,
        em: MongoEntityManager<MongoDriver>
    ): Promise<MessageCache> {
        try {
            const row = em.create(MessageCache, message);
            em.persist(row);
            await em.flush();
            return row;
        } catch (error) {
            return await em.findOne(MessageCache, { consensusTimestamp: message.consensusTimestamp });
        }
    }

    public static async saveRelationships(messages: MessageCache[], priorityOptions?: PriorityOptions) {
        try {
            const { topics, tokens } = TopicService.findRelationships(messages);
            await TopicService.addTopics(topics, priorityOptions);
            await TokenService.addTokens(tokens);
        } catch (error) {
            await LogService.error(error, 'Save relationships');
        }
    }

    public static findRelationships(messages: MessageCache[]) {
        const topics = new Set<string>();
        const tokens = new Set<string>();
        for (const message of messages) {
            const json = Parser.parseMassage(message);
            if (json) {
                if (Array.isArray(json.topics)) {
                    for (const topicId of json.topics) {
                        topics.add(topicId);
                    }
                }
                if (Array.isArray(json.tokens)) {
                    for (const tokenId of json.tokens) {
                        tokens.add(tokenId);
                    }
                }
            }
        }
        return { topics, tokens };
    }

    private static createMessageCache(message: TopicMessage, priorityOptions?: PriorityOptions): RequiredEntityData<MessageCache> {
        const item: RequiredEntityData<MessageCache> = {};
        item.consensusTimestamp = message.consensus_timestamp;
        item.topicId = message.topic_id;
        item.message = message.message;
        item.sequenceNumber = message.sequence_number;
        item.owner = message.payer_account_id;
        item.lastUpdate = 0;
        if (priorityOptions) {
            item.priorityDate = priorityOptions.priorityDate;
            item.priorityStatus = priorityOptions.priorityStatus;
            item.priorityStatusDate = priorityOptions.priorityStatusDate;
            item.priorityTimestamp = priorityOptions.priorityTimestamp;
        }
        if (message?.chunk_info?.initial_transaction_id) {
            item.chunkId = message.chunk_info.initial_transaction_id.transaction_valid_start;
            item.chunkNumber = message.chunk_info.number;
            item.chunkTotal = message.chunk_info.total;
        } else {
            item.chunkId = null;
            item.chunkNumber = 1;
            item.chunkTotal = 1;
        }
        item.type = item.chunkNumber === 1 ? 'Message' : 'Chunk';
        item.data = null;

        if (item.chunkId && item.chunkTotal > 1) {
            item.status = MessageStatus.COMPRESSING;
        } else {
            item.status = MessageStatus.COMPRESSED;
            item.data = TopicService.compressData(item.message);
        }

        return item;
    }

    public static async compressMessages(messages: MessageCache[]): Promise<MessageCache[] | null> {
        try {
            const em = DataBaseHelper.getEntityManager();
            const compressing = new Set<string>();
            const compressed = [];
            for (const message of messages) {
                if (message.status === MessageStatus.COMPRESSING) {
                    compressing.add(message.chunkId);
                } else if (message.status === MessageStatus.COMPRESSED) {
                    compressed.push(message);
                }
            }
            for (const chunkId of compressing) {
                const message = await TopicService.compressChunks(chunkId, em);
                if (message) {
                    compressed.push(message);
                }
            }
            await em.flush();
            return compressed;
        } catch (error) {
            await LogService.error(error, 'compress messages');
            return null;
        }
    }

    public static async compressChunks(chunkId: string, em: MongoEntityManager<MongoDriver>): Promise<MessageCache> {
        try {
            const chunks = await em.find(MessageCache, { chunkId });
            const first = chunks.find((e) => e.chunkNumber === 1);
            if (!first || first.chunkTotal !== chunks.length) {
                return null;
            }

            const buffers: string[] = new Array(chunks.length);
            for (const row of chunks) {
                row.status = MessageStatus.COMPRESSED;
                buffers[row.chunkNumber - 1] = row.message;
            }

            first.data = TopicService.compressData(buffers);
            // await em.flush();

            return first;
        } catch (error) {
            LogService.error(error, 'compress data').then();
            return null;
        }
    }

    public static compressData(messages: string | string[]): string | null {
        try {
            if (Array.isArray(messages)) {
                let data: string = '';
                for (const message of messages) {
                    if (typeof message === 'string') {
                        data += Buffer.from(message, 'base64').toString();
                    } else {
                        return null;
                    }
                }
                return data;
            } else {
                return Buffer.from(messages, 'base64').toString();
            }
        } catch (error) {
            LogService.error(error, 'compress data').then();
            return null;
        }
    }
}

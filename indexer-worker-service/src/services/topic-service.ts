import { MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';
import { RequiredEntityData } from '@mikro-orm/core';
import { MessageService } from './message-service.js';
import { LogService } from './log-service.js';
import { Parser } from '../utils/parser.js';
import { HederaService } from '../loaders/hedera-service.js';
import { DataBaseHelper, Job, MessageCache, TopicCache, TopicMessage, Utils } from '@indexer/common';
import { TokenService } from './token-service.js';

export class TopicService {
    public static CYCLE_TIME: number = 0;

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
                const rowMessages = await TopicService.saveMessages(data.messages);
                if (rowMessages) {
                    const compressed = await TopicService.compressMessages(rowMessages);
                    await MessageService.saveImmediately(compressed);
                    await TopicService.saveRelationships(compressed);
                    await em.nativeUpdate(TopicCache, { topicId: row.topicId }, {
                        messages: data.messages[data.messages.length - 1].sequence_number,
                        lastUpdate: Date.now(),
                        hasNext: !!data.links.next
                    });
                }
            }

        } catch (error) {
            await LogService.error(error, 'update topic');
        }
    }

    public static async addTopic(topicId: string): Promise<boolean> {
        try {
            const em = DataBaseHelper.getEntityManager();
            const old = await em.findOne(TopicCache, { topicId });
            if (!old) {
                await em.persistAndFlush(em.create(TopicCache, {
                    topicId,
                    status: '',
                    lastUpdate: 0,
                    messages: 0,
                    hasNext: false
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

    public static async addTopics(topicIds: Iterable<string>): Promise<void> {
        for (const topicId of topicIds) {
            if (topicId && typeof topicId === 'string' && Utils.isTopic(topicId)) {
                await TopicService.addTopic(topicId);
            }
        }
    }

    private static async randomTopic(em: MongoEntityManager<MongoDriver>): Promise<TopicCache> {
        const delay = Date.now() - TopicService.CYCLE_TIME;
        const rows = await em.find(TopicCache,
            {
                $or: [
                    { lastUpdate: { $lt: delay } },
                    { hasNext: true }
                ]
            },
            {
                limit: 50
            }
        )
        const index = Math.min(Math.floor(Math.random() * rows.length), rows.length - 1);
        const row = rows[index];

        if (!row) {
            return null;
        }

        const now = Date.now();
        const count = await em.nativeUpdate(TopicCache, {
            topicId: row.topicId,
            $or: [
                { lastUpdate: { $lt: delay } },
                { hasNext: true }
            ]
        }, {
            messages: row.messages,
            lastUpdate: now,
            hasNext: false
        });

        if (count) {
            return row;
        } else {
            return null;
        }

        // const ref = em.getReference(TopicCache, row._id);
        // ref.lastUpdate = Date.now();
        // ref.hasNext = false;
        // await em.flush();
    }

    public static async saveMessages(messages: TopicMessage[]): Promise<MessageCache[]> {
        try {
            const em = DataBaseHelper.getEntityManager();
            const rows = [];
            for (const message of messages) {
                const item = TopicService.createMessageCache(message);
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

    public static async saveRelationships(messages: MessageCache[]) {
        try {
            const { topics, tokens } = TopicService.findRelationships(messages);
            await TopicService.addTopics(topics);
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

    private static createMessageCache(message: TopicMessage): RequiredEntityData<MessageCache> {
        const item: RequiredEntityData<MessageCache> = {};
        item.consensusTimestamp = message.consensus_timestamp;
        item.topicId = message.topic_id;
        item.message = message.message;
        item.sequenceNumber = message.sequence_number;
        item.owner = message.payer_account_id;
        item.lastUpdate = 0;
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
            item.status = 'COMPRESSING';
        } else {
            item.status = 'COMPRESSED';
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
                if (message.status === 'COMPRESSING') {
                    compressing.add(message.chunkId);
                } else if (message.status === 'COMPRESSED') {
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
                row.status = 'COMPRESSED';
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

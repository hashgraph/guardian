import { BaseEntity, DatabaseServer, MessageResponse, NatsService, PinoLogger } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import axios from 'axios';
import process from 'process';
import { Entity, Enum, Property } from '@mikro-orm/core';

@Entity()
class ListenerCollection extends BaseEntity {
    @Property()
    topicId: string;

    @Property()
    name: string;

    @Property()
    index: number;
}

enum ListenerEvents {
    ADD_TOPIC_LISTENER = 'ADD_TOPIC_LISTENER',
    REMOVE_TOPIC_LISTENER = 'REMOVE_TOPIC_LISTENER',
    GET_LISTENER_MESSAGE = 'GET_LISTENER_MESSAGE',
}

interface IListenerOptions {
    name?: string;
    topicId: string;
}

interface ChunkInfo {
    initial_transaction_id: {
        account_id: string;
        nonce: number;
        scheduled: boolean;
        transaction_valid_start: string;
    };
    number: number;
    total: number;
}

interface TopicMessage {
    chunk_info: ChunkInfo;
    consensus_timestamp: string;
    message: string;
    payer_account_id: string;
    running_hash: string;
    running_hash_version: number;
    sequence_number: number;
    topic_id: string;
}

interface TopicInfo {
    links: {
        next: string | null;
    };
    messages: TopicMessage[];
    _status?: {
        messages: {
            message: string;
        }[];
    };
}

/**
 * Worker class
 */
export class ListenerService extends NatsService {
    public messageQueueName = 'listeners-queue';
    public replySubject = 'listeners-queue-reply-' + GenerateUUIDv4();

    private delay: number = 60 * 1000;
    private map: Map<string, Listener>;

    constructor(
        private readonly serviceID: string,
        private readonly logger: PinoLogger
    ) {
        super();
        this.map = new Map<string, Listener>();
    }

    /**
     * Initialize worker
     */
    public async init(): Promise<void> {
        await super.init();
        await this.start();

        this.getMessages(ListenerEvents.ADD_TOPIC_LISTENER, async (options: IListenerOptions) => {
            try {
                const result = await this.addListener(options);
                return new MessageResponse({ result })
            } catch (error) {
                this.logger.error(`Update settings error, ${error.message}`, [this.serviceID, 'WORKER']);
                return new MessageResponse({ result: null })
            }
        })

        this.subscribe(ListenerEvents.REMOVE_TOPIC_LISTENER, async (name: string) => {
            try {
                const result = await this.removeListener(name);
                return new MessageResponse({ result })
            } catch (error) {
                this.logger.error(`Update settings error, ${error.message}`, [this.serviceID, 'WORKER']);
                return new MessageResponse({ result: null })
            }
        });

        this.search().then();
    }

    private async addListener(options: IListenerOptions): Promise<string> {
        const dataBaseServer = new DatabaseServer();
        if (options.name && this.map.has(options.name)) {
            return options.name;
        }
        const row = await dataBaseServer.save(ListenerCollection,
            dataBaseServer.create(
                ListenerCollection,
                {
                    topicId: options.topicId,
                    name: options.name,
                    index: -1
                },
            ));
        const listener = new Listener(this, row);
        this.map.set(listener.name, listener);
        return listener.name;
    }

    private async removeListener(name: string): Promise<boolean> {
        const dataBaseServer = new DatabaseServer();
        const listener = this.map.get(name);
        if (listener) {
            this.map.delete(name);
            const row = await dataBaseServer.findOne(ListenerCollection, { id: listener.id });
            if (row) {
                await dataBaseServer.remove(ListenerCollection, row);
            }
        }
        return true;
    }

    private async start(): Promise<void> {
        const rows = await (new DatabaseServer()).findAll(ListenerCollection);
        this.map.clear();
        for (const row of rows) {
            const listener = new Listener(this, row);
            this.map.set(listener.name, listener);
        }
    }

    private async search(): Promise<void> {
        while (true) {
            for (const listener of this.map.values()) {
                await listener.search();
            }
            await new Promise(resolve => setTimeout(resolve, this.delay));
        }
    }
}

class Listener {
    public readonly id: string;
    public readonly name: string;
    public readonly topicId: string;
    public readonly index: number;

    private readonly channel: ListenerService;

    public static readonly REST_API_MAX_LIMIT: number = 100;
    public static readonly MIRROR_NODE_URL: string = 'https://testnet.mirrornode.hedera.com/api/v1/';

    private _messages: Message[];
    private _lock: boolean;

    constructor(
        channel: ListenerService,
        listener: ListenerCollection
    ) {
        this.id = listener.id.toString();
        this.name = listener.name || this.id;
        this.topicId = listener.topicId;
        this.index = listener.index;

        this.channel = channel;

        this._messages = [];
        this._lock = false;
    }

    public async search(): Promise<void> {
        const data = await this.getMessages(this.topicId, this.index);
        if (data && data.messages.length) {
            this.saveMessages(data.messages);
        }
        this.push();
    }

    public saveMessages(messages: TopicMessage[]): void {
        for (const message of messages) {
            this.addMessages(message);
        }
    }

    public addMessages(message: TopicMessage): void {
        const chunkId = Message.getChunkId(message);
        if (chunkId) {
            for (const item of this._messages) {
                if (item.chunkId === chunkId) {
                    item.addChunk(message);
                    return;
                }
            }
        }
        const item = new Message();
        item.addChunk(message);
        this._messages.push(item);
    }

    public async getMessages(topicId: string, lastNumber: number): Promise<TopicInfo | null> {
        try {
            const url = Listener.MIRROR_NODE_URL + 'topics/' + topicId + '/messages';
            const option: any = {
                params: {
                    limit: Listener.REST_API_MAX_LIMIT
                },
                responseType: 'json',
                timeout: 2 * 60 * 1000,
            };
            if (lastNumber > 0) {
                option.params.sequencenumber = `gt:${lastNumber}`;
            }
            const response = await axios.get(url, option);
            const topicInfo = response?.data as TopicInfo;
            if (topicInfo && Array.isArray(topicInfo.messages)) {
                if (!topicInfo.links) {
                    topicInfo.links = { next: null };
                }
                return topicInfo;
            } else {
                return null;
            }
        } catch (error) {
            console.log('getMessages ', topicId, error.message);
            throw error;
        }
    }

    public async push() {
        try {
            if (this._lock) {
                return;
            }
            this._lock = true;
            let next = this.next();
            while (next) {
                await this.channel.publish(ListenerEvents.GET_LISTENER_MESSAGE, next.data);
                this._messages.shift();
                next = this.next();
            }
            this._lock = false;
        } catch (error) {
            this._lock = false;
        }
    }

    private next(): Message | null {
        if (this._messages.length && this._messages[0].status === 'COMPRESSED') {
            return this._messages[0];
        } else {
            return null;
        }
    }
}

class Message {
    public messages: any[];
    public status: 'COMPRESSING' | 'COMPRESSED';
    public data: string | null;
    public chunkId: string | null;

    constructor() {
        this.messages = [];
    }

    public static getChunkId(message: TopicMessage): string | null {
        if (
            message &&
            message.chunk_info &&
            message.chunk_info.initial_transaction_id
        ) {
            return message.chunk_info.initial_transaction_id.transaction_valid_start;
        } else {
            return null;
        }
    }

    public addChunk(message: TopicMessage): void {
        const item: any = {};
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
        this.messages.push(item);
        this.compressMessages();
    }

    public compressMessages() {
        const first = this.messages[0];
        this.chunkId = first.chunkId;
        if (first.chunkTotal === this.messages.length) {
            this.status = 'COMPRESSED';
            this.data = this.compressData();
        } else {
            this.status = 'COMPRESSING';
            this.data = null;
        }
    }

    public compressData(): string | null {
        try {
            let data: string = '';
            for (const item of this.messages) {
                if (typeof item.message === 'string') {
                    data += Buffer.from(item.message, 'base64').toString();
                } else {
                    return null;
                }
            }
            return data;
        } catch (error) {
            return null;
        }
    }
}
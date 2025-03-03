import { TopicMessage } from '../interface/index.js';

export interface ITopicMessage {
    sequenceNumber: number;
    message: string;
    topicId: string;
    consensusTimestamp: string;
    owner: string;
}

export class Message {
    public messages: any[];
    public status: 'COMPRESSING' | 'COMPRESSED';
    public data: string | null;
    public chunkId: string | null;
    public index: number;
    public topicId: string;
    public consensusTimestamp: string;
    public owner: string;

    constructor() {
        this.messages = [];
        this.index = -1;
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
        this.index = first.sequenceNumber;
        this.chunkId = first.chunkId;

        this.topicId = first.topicId;
        this.consensusTimestamp = first.consensusTimestamp;
        this.owner = first.owner;


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

    public toJson(): ITopicMessage {
        return {
            sequenceNumber: this.index,
            message: this.data,
            topicId: this.topicId,
            consensusTimestamp: this.consensusTimestamp,
            owner: this.owner,
        }
    }
}
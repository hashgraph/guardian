import { DatabaseServer } from '@guardian/common';
import { TopicListener as ListenerCollection } from '../entity/index.js';
import { ListenerEvents, TopicInfo, TopicMessage } from '../interface/index.js';
import { ListenerService } from './listener-service.js';
import { Message } from './message.js';
import axios from 'axios';

export class Listener {
    public readonly id: string;
    public readonly name: string;
    public readonly topicId: string;

    private readonly channel: ListenerService;

    public static readonly REST_API_MAX_LIMIT: number = 100;
    public static readonly MIRROR_NODE_URL: string = 'https://testnet.mirrornode.hedera.com/api/v1/';

    private _messages: Message[];
    private _lock: boolean;

    private _searchIndex: number;
    private _sendIndex: number;

    constructor(
        channel: ListenerService,
        listener: ListenerCollection
    ) {
        this.id = listener.id.toString();
        this.name = listener.name || this.id;
        this.topicId = listener.topicId;

        const _index = Math.min(listener.searchIndex, listener.sendIndex);
        this._searchIndex = _index;
        this._sendIndex = _index;

        this.channel = channel;

        this._messages = [];
        this._lock = false;
    }

    public async search(): Promise<void> {
        const data = await this.getMessages(this.topicId, this._searchIndex);
        if (data && data.messages.length) {
            await this.saveMessages(data.messages);
        }
        this.push();
    }

    public async saveMessages(messages: TopicMessage[]): Promise<void> {
        for (const message of messages) {
            this.addMessages(message);
        }
        await (new DatabaseServer()).update(
            ListenerCollection,
            { id: this.id },
            {
                searchIndex: this._searchIndex
            }
        );
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
        this._searchIndex = message.sequence_number;
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
                await this.sendMessage(next);
                this._messages.shift();
                next = this.next();
            }
            this._lock = false;
        } catch (error) {
            this._lock = false;
        }
    }

    private async sendMessage(message: Message) {
        this._sendIndex = message.index;
        await this.channel.publish(`${ListenerEvents.GET_LISTENER_MESSAGE}.${this.name}`, message.data);
        await (new DatabaseServer()).update(
            ListenerCollection,
            { id: this.id },
            {
                sendIndex: this._sendIndex
            }
        );
    }

    private next(): Message | null {
        const first = this._messages[0];
        if (first && first.status === 'COMPRESSED') {
            return first;
        } else {
            return null;
        }
    }
}
import { DatabaseServer, Environment } from '@guardian/common';
import { TopicListener as ListenerCollection } from '../entity/index.js';
import { TopicInfo, TopicMessage } from '../interface/index.js';
import { ListenerService } from './listener-service.js';
import { Message } from './message.js';
import { ListenerEvents } from '@guardian/interfaces';
import { Subscription } from 'nats';
import axios from 'axios';

export class Listener {
    public readonly id: string;
    public readonly name: string;
    public readonly topicId: string;

    private readonly channel: ListenerService;

    public static readonly REST_API_MAX_LIMIT: number = 100;

    private _messages: Message[];

    private _searchIndex: number;
    private _sendIndex: number;
    private _subscription: Subscription;

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
    }

    public init() {
        this._subscription = this.channel
            .subscribe(`${ListenerEvents.CONFIRM_LISTENER_MESSAGE}.${this.name}`, async (index: number) => {
                await this.confirmData(index);
            });
    }

    public close() {
        if (this._subscription) {
            this._subscription.unsubscribe();
            this._subscription = null;
        }
    }

    public async restart(index: number): Promise<boolean> {
        this._searchIndex = index;
        this._sendIndex = index;
        await (new DatabaseServer()).update(
            ListenerCollection,
            { id: this.id },
            {
                searchIndex: this._searchIndex,
                sendIndex: this._sendIndex
            }
        );
        return true;
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
            for (const m of this._messages) {
                if (m.chunkId === chunkId) {
                    m.addChunk(message);
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
            const url = `${Environment.HEDERA_TOPIC_API}${topicId}/messages`;
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
            const message = this.next();
            if (message) {
                await this.channel
                    .publish(`${ListenerEvents.GET_LISTENER_MESSAGE}.${this.name}`, message.toJson());
            }
        } catch (error) {
            console.log('push', error);
        }
    }

    public async confirmData(index: number): Promise<void> {
        try {
            if (typeof index !== 'number') {
                return;
            }
            this._sendIndex = index;
            await (new DatabaseServer()).update(
                ListenerCollection,
                { id: this.id },
                {
                    sendIndex: this._sendIndex
                }
            );
            this._messages = this._messages.filter((m) => m.index > index);
            this.push();
        } catch (error) {
            console.log('confirm', error);
        }
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
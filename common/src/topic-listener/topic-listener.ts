import { GenerateUUIDv4, IListenerOptions, ListenerEvents } from '@guardian/interfaces';
import { NatsConnection, Subscription } from 'nats';
import { Singleton } from '../decorators/singleton.js';
import { NatsService } from '../mq/index.js';

export interface ITopicMessage {
    sequenceNumber: number;
    message: string;
    topicId: string;
    consensusTimestamp: string;
    owner: string;
}

export type ListenerCallback = (data: ITopicMessage) => Promise<boolean> | boolean;
export type ErrorCallback = (error: Error) => Promise<void> | void;

@Singleton
export class TopicListenerService extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = `topic-listener-service-${GenerateUUIDv4()}`;

    /**
     * Reply subject
     * @private
     */
    public replySubject = `topic-listener-service-reply-${GenerateUUIDv4()}`;
}

export class TopicListener {
    private static readonly channel = new TopicListenerService();

    private readonly topicId: string;

    private _name: string;
    private _startNumber: number | null;
    private _listenerId: string | null;
    private _subscription: Subscription;

    private _observable: ListenerCallback | null;
    private _error: ErrorCallback | null;

    constructor(topicId: string) {
        this.topicId = topicId;

        this._startNumber = null;
        this._observable = null;
        this._listenerId = null;
    }

    public setListenerName(name: string): TopicListener {
        if (name && typeof name === 'string') {
            this._name = name;
        }
        return this;
    }

    public setStartMessage(sequenceNumber: number): TopicListener {
        if (typeof sequenceNumber === 'number') {
            if (isFinite(sequenceNumber) && sequenceNumber > -2) {
                this._startNumber = sequenceNumber;
            } else {
                throw new Error('Invalid arguments');
            }
        } else {
            throw new Error('Invalid arguments');
        }
        return this;
    }

    public async subscribe(
        callback: ListenerCallback,
        error?: ErrorCallback
    ): Promise<TopicListener> {
        if (typeof callback === 'function') {
            if (this._observable) {
                throw new Error('Observable already exists');
            } else {
                this._observable = callback;
                this._error = error;
                await this._start();
            }
        } else {
            throw new Error('Invalid arguments');
        }
        return this;
    }

    public async close(): Promise<TopicListener> {
        if (this._observable) {
            this._observable = null;
            await this._close();
        }
        return this;
    }

    private async sendData(message: ITopicMessage): Promise<boolean> {
        try {
            if (!this._observable || !message) {
                return false;
            }

            const index = message.sequenceNumber;
            if (index > this._startNumber) {
                this._startNumber = index;
                await this._observable(message);
            }

            await TopicListener.channel.publish(`${ListenerEvents.CONFIRM_LISTENER_MESSAGE}.${this._listenerId}`, index);

            return true;
        } catch (error) {
            return false;
        }
    }

    private async sendError(error: any): Promise<void> {
        try {
            if (this._error) {
                await this._error(error);
            }
        } catch (e) {
            console.error(e);
        }
    }

    private async _start(): Promise<void> {
        try {
            const options: IListenerOptions = {
                topicId: this.topicId
            };
            if (this._name) {
                options.name = this._name;
            }
            if (this._startNumber) {
                options.index = this._startNumber;
            }
            const result = await TopicListener.channel
                .sendMessage<{ result: string | null } | null>(ListenerEvents.ADD_TOPIC_LISTENER, options);
            this._listenerId = result?.result || null;

            if (!this._listenerId) {
                await this.sendError(new Error(`Failed to create listener (${this.topicId})`));
                return;
            }

            this._subscription = TopicListener.channel
                .subscribe(`${ListenerEvents.GET_LISTENER_MESSAGE}.${this._listenerId}`, async (msg: any) => {
                    await this.sendData(msg);
                });
        } catch (error) {
            await this.sendError(error);
        }
    }

    private async _close(): Promise<void> {
        if (this._listenerId) {
            await TopicListener.channel
                .publish(ListenerEvents.REMOVE_TOPIC_LISTENER, this._listenerId);
            this._listenerId = null;
        }
        if (this._subscription) {
            this._subscription.unsubscribe();
            this._subscription = null;
        }
    }

    public static async init(connection: NatsConnection): Promise<boolean> {
        await TopicListener.channel.setConnection(connection).init();
        return true;
    }
}
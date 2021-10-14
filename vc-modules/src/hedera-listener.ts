import { Client, Timestamp, TopicId, TopicMessage, TopicMessageQuery } from "@hashgraph/sdk";
import { HcsDidMessage, HcsDidTopicListener, HcsVcMessage, HcsVcTopicListener, Message, MessageEnvelope, MessageListener } from "did-sdk-js";

export interface IListener<T> {
    on: (topicId: string, message: T) => Promise<boolean>;
    error: (topicId: string, error: Error) => Promise<boolean>;
}

export enum ListenerType {
    VC = "VC",
    MRV = "MRV",
    DID = "DID"
}


class Listener {
    public readonly type: ListenerType;
    public readonly topicId: string;

    private _listener: MessageListener<any> | undefined;
    private _response: (message: any) => void;
    private _error: (error: Error) => void;
    private subscribed: boolean;
    private startDate: Date;
    private _timeoutId:any;

    public get status(): boolean {
        return this.subscribed;
    }

    public get startTime(): Date {
        return this.startDate;
    }

    constructor(type: ListenerType, topicId: string) {
        this.startDate = new Date();

        console.log("Create Listener", type, topicId, this.startDate);

        this.type = type;
        this.topicId = topicId;
        const _topicId = TopicId.fromString(topicId);

        if (type == ListenerType.VC || type == ListenerType.MRV) {
            this._listener = new HcsVcTopicListener(_topicId);
        } else if (type == ListenerType.DID) {
            this._listener = new HcsDidTopicListener(_topicId);
        }
        this._listener.setStartTime(Timestamp.fromDate(this.startDate));
        this.subscribed = false;
    }

    public waitAndSubscribe(client: Client, wait: boolean | number): void {
        const timeout = Number.isFinite(wait) ? Number(wait) : 30000;
        this._timeoutId = setTimeout(() => {
            this.subscribe(client)
        }, timeout);
    }

    public subscribe(client: Client): void {
        if (this._listener) {
            this.startDate = new Date(0);
            this._listener.setStartTime(Timestamp.fromDate(this.startDate));
            this._listener.onError(this._error);
            this._listener.subscribe(client, this._response);
            this.subscribed = true;
            console.log("Subscribe", this.type, this.topicId);
        }
    }

    public unsubscribe(): void {
        clearTimeout(this._timeoutId);
        if (this.subscribed && this._listener) {
            this._listener.unsubscribe();
        }
        this.subscribed = false;
    }

    public onResponse(response: (env: MessageEnvelope<any>) => void): void {
        this._response = response;
    }

    public onError(error: (error: Error) => void): void {
        this._error = error;
    }
}

class Subscriber {
    public readonly type: ListenerType[];
    public readonly topicId: string | null;
    public readonly callback: IListener<any>;

    constructor(type: ListenerType[], topicId: string | null, callback: IListener<any>) {
        console.log("Subscriber", type, topicId)
        this.type = type || [];
        this.topicId = topicId;
        this.callback = callback;
    }

    public filter(listener: Listener): boolean {
        if (this.type.indexOf(listener.type) == -1) {
            return false;
        }
        if (this.topicId && this.topicId != listener.topicId) {
            return false;
        }
        return true;
    }
}

export class HederaListener {
    private listeners: Listener[];
    private subscribers: Subscriber[];
    private client: Client;

    constructor() {
        this.client = Client.forTestnet();
        this.listeners = [];
        this.subscribers = [];
    }

    public addListener(type: ListenerType, topicId: string, wait?: boolean | number): void {
        if (this.listeners.findIndex(e => e.topicId == topicId) > -1) {
            return;
        }

        const listener = new Listener(type, topicId);

        listener.onError(this.buildError(listener));
        listener.onResponse(this.buildResponse(listener));

        this.listeners.push(listener);

        if (wait) {
            listener.waitAndSubscribe(this.client, wait);
        } else {
            listener.subscribe(this.client);
        }
    }

    public removeListeners(): void {
        for (let i = 0; i < this.listeners.length; i++) {
            const element = this.listeners[i];
            element.unsubscribe();
        }
        this.listeners.length = 0;
    }

    public subscribe(type: ListenerType[], topicId: string | null, callback: IListener<any>): void {
        const subscriber = new Subscriber(type, topicId, callback);
        this.subscribers.push(subscriber);
    }

    public unsubscribe(): void {
        this.subscribers.length = 0;
    }

    private async _response(listener: Listener, message: any) {
        for (let i = 0; i < this.subscribers.length; i++) {
            const subscriber = this.subscribers[i];
            if (subscriber.filter(listener)) {
                const result = await subscriber.callback.on(listener.topicId, message);
                if (!result) {
                    return;
                }
            }
        }
    }

    private async _error(listener: Listener, error: any) {
        for (let i = 0; i < this.subscribers.length; i++) {
            const subscriber = this.subscribers[i];
            if (subscriber.filter(listener)) {
                const result = await subscriber.callback.error(listener.topicId, error);
                if (!result) {
                    return;
                }
            }
        }
    }

    private buildResponse(listener: Listener): (env: MessageEnvelope<any>) => void {
        return ((env: MessageEnvelope<any>) => {
            console.log("onResponse", listener.topicId);
            const message = env.open();
            this._response(listener, message);
        }).bind(this);
    }

    private buildError(listener: Listener): (error: Error) => void {
        return ((error: Error) => {
            console.log("onError", listener.topicId, error);
            this._error(listener, error);
        }).bind(this);
    }

    public getListeners(): Listener[] {
        return this.listeners;
    }
}
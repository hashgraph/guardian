import { GenerateUUIDv4 } from '@guardian/interfaces';

export interface ITopicMessage {
    chunk_info: {
        initial_transaction_id: {
            account_id: string;
            nonce: number;
            scheduled: boolean;
            transaction_valid_start: string;
        };
        number: number;
        total: number;
    };
    consensus_timestamp: string;
    message: string;
    payer_account_id: string;
    running_hash: string;
    running_hash_version: number;
    sequence_number: number;
    topic_id: string;
}

export type ListenerCallback = (data: ITopicMessage) => Promise<boolean>;

export class TopicListener {
    private readonly topicId: string;

    private _name: string;
    private _startTimestamp: string | null;
    private _startNumber: number | null;

    private _observable: ListenerCallback | null;

    constructor(topicId: string) {
        this.topicId = topicId;

        this._startNumber = null;
        this._startTimestamp = null;
        this._observable = null;

        this._name = GenerateUUIDv4();
    }

    public setListenerName(name: string): TopicListener {
        if (name && typeof name === 'string') {
            this._name = name;
        }
        return this;
    }

    public setStartMessage(consensusTimestamp: string): TopicListener
    public setStartMessage(sequenceNumber: number): TopicListener
    public setStartMessage(arg: number | string): TopicListener {
        if (typeof arg === 'number') {
            if (isFinite(arg) && arg > 0) {
                this._startNumber = arg;
            } else {
                throw new Error('Invalid arguments');
            }
        } else if (typeof arg === 'string') {
            this._startTimestamp = arg;
        } else {
            throw new Error('Invalid arguments');
        }
        return this;
    }

    public subscribe(callback: ListenerCallback): TopicListener {
        if (typeof callback === 'function') {
            if (this._observable) {
                throw new Error('Observable already exists');
            } else {
                this._observable = callback
                this._start();
            }
        } else {
            throw new Error('Invalid arguments');
        }
        return this;
    }

    public close(): TopicListener {
        if (this._observable) {
            this._observable = null;
            this._close();
        }
        return this;
    }

    private async send(message: ITopicMessage) {
        if (!this._observable) {
            return;
        }
        if (this._startNumber) {
            return;
        }
        if (this._startTimestamp) {
            return;
        }
        const result = await this._observable(message);
        if(result) {
            
        }
    }

    private _start(): void {

    }

    private _close(): void {

    }
}
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

    /**
     * The mirror node rate limit is per source IP and is shared with every other
     * process behind it, so a throttled listener has to yield instead of retrying
     * at full rate.
     */
    public static readonly REQUEST_TIMEOUT_MS: number =
        parseInt(process.env.LISTENER_REQUEST_TIMEOUT_MS, 10) || 15 * 1000;
    public static readonly ERROR_BACKOFF_MIN_MS: number =
        parseInt(process.env.LISTENER_ERROR_BACKOFF_MIN_MS, 10) || 5 * 1000;
    public static readonly ERROR_BACKOFF_MAX_MS: number =
        parseInt(process.env.LISTENER_ERROR_BACKOFF_MAX_MS, 10) || 5 * 60 * 1000;
    public static readonly IDLE_BACKOFF_STEP_MS: number =
        parseInt(process.env.LISTENER_IDLE_BACKOFF_STEP_MS, 10) || 10 * 1000;
    public static readonly IDLE_BACKOFF_MAX_MS: number =
        parseInt(process.env.LISTENER_IDLE_BACKOFF_MAX_MS, 10) || 60 * 1000;

    private _messages: Message[];

    private _searchIndex: number;
    private _sendIndex: number;
    private _subscription: Subscription;

    private _errorCount: number;
    private _idleCount: number;
    private _nextPollAt: number;

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

        this._errorCount = 0;
        this._idleCount = 0;
        this._nextPollAt = 0;
    }

    /**
     * True when this listener is allowed to call the mirror node again
     */
    public isPollDue(now: number = Date.now()): boolean {
        return now >= this._nextPollAt;
    }

    /**
     * Spread retries so every listener does not wake up at the same moment.
     * Jitters downwards only, so the configured caps stay hard limits.
     */
    private static jitter(delay: number): number {
        return Math.round(delay * (Math.random() * 0.2 + 0.8));
    }

    /**
     * `Retry-After` in seconds or as an HTTP date, in ms; null when absent/unusable
     */
    private static parseRetryAfter(value: any): number | null {
        if (value === undefined || value === null) {
            return null;
        }
        const seconds = Number(value);
        if (isFinite(seconds)) {
            return seconds > 0 ? seconds * 1000 : null;
        }
        const date = Date.parse(String(value));
        if (isFinite(date)) {
            const delay = date - Date.now();
            return delay > 0 ? delay : null;
        }
        return null;
    }

    /**
     * Clear the backoff so the next cycle polls immediately
     */
    private resetBackoff(): void {
        this._errorCount = 0;
        this._idleCount = 0;
        this._nextPollAt = 0;
    }

    /**
     * Back off harder the longer a topic stays silent, capped so a topic that
     * does become active is still picked up promptly.
     */
    private onPollSuccess(hasMessages: boolean): void {
        this._errorCount = 0;
        if (hasMessages) {
            this._idleCount = 0;
            this._nextPollAt = 0;
            return;
        }
        this._idleCount++;
        const delay = Math.min(
            Listener.IDLE_BACKOFF_MAX_MS,
            Listener.IDLE_BACKOFF_STEP_MS * Math.pow(2, Math.min(this._idleCount - 1, 30))
        );
        this._nextPollAt = Date.now() + Listener.jitter(delay);
    }

    /**
     * Honour `Retry-After` on 429, exponential backoff otherwise; returns the applied delay
     */
    private onPollError(error: any): number {
        this._errorCount++;
        const retryAfter = Listener.parseRetryAfter(error?.response?.headers?.['retry-after']);
        const delay = retryAfter === null
            ? Listener.jitter(Math.min(
                Listener.ERROR_BACKOFF_MAX_MS,
                Listener.ERROR_BACKOFF_MIN_MS * Math.pow(2, Math.min(this._errorCount - 1, 30))
            ))
            : Math.min(Listener.ERROR_BACKOFF_MAX_MS, retryAfter);
        this._nextPollAt = Date.now() + delay;
        return delay;
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
        this.resetBackoff();
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

    /**
     * Returns true when the mirror node was actually called, so the scheduler only
     * spends its rate limit budget on listeners that are due.
     */
    public async search(): Promise<boolean> {
        if (!this.isPollDue()) {
            this.push();
            return false;
        }
        try {
            const data = await this.getMessages(this.topicId, this._searchIndex);
            const hasMessages = !!(data && data.messages.length);
            this.onPollSuccess(hasMessages);
            if (hasMessages) {
                await this.saveMessages(data.messages);
            }
            this.push();
        } catch (error) {
            const delay = this.onPollError(error);
            //one line per failure instead of a full stack: a throttling window can
            //otherwise bury every other log line
            console.error(
                `[Listener] ${this.name} (${this.topicId}) ${error?.message}; ` +
                `attempt ${this._errorCount}, retry in ${Math.round(delay / 1000)}s`
            );
        }
        return true;
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
                    //continuation chunks must advance the index too, otherwise the next poll
                    //re-fetches them forever and the group never completes.
                    //Safe on restart: the constructor resumes from min(searchIndex, sendIndex),
                    //so an incomplete in-memory group is re-fetched whole.
                    this._searchIndex = message.sequence_number;
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
            const url = `${Environment.HEDERA_TOPIC_API}/${topicId}/messages`;
            const option: any = {
                params: {
                    limit: Listener.REST_API_MAX_LIMIT
                },
                responseType: 'json',
                //the scheduler is sequential, so one hung request stalls every other listener
                timeout: Listener.REQUEST_TIMEOUT_MS,
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
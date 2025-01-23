import { NatsConnection, headers, Subscription } from 'nats';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { ZipCodec } from './zip-codec.js';
import { IMessageResponse } from '../models/index.js';

type CallbackFunction = (body: any, error?: string, code?: number) => void;

class MessageError extends Error {
    public code: number;
    constructor(message: any, code?: number) {
        super(message);
        this.code = code;
    }
}

/**
 * Nats service
 */
export abstract class NatsService {
    /**
     * messageQueueName
     */
    public abstract messageQueueName: string;

    /**
     * replySubject
     */
    public abstract replySubject: string;

    /**
     * jsonCodec
     */
    protected readonly codec;

    /**
     * connection
     */
    protected connection: NatsConnection;

    /**
     * responseCallbacksMap
     */
    protected responseCallbacksMap: Map<string, CallbackFunction> = new Map();

    constructor() {
        this.codec = ZipCodec();
        // this.codec = JSONCodec();
    }

    /**
     * Init
     */
    public async init(): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection must set first');
        }
        this.connection.subscribe(this.replySubject, {
            callback: async (error, msg) => {
                if (!error) {
                    const messageId = msg.headers.get('messageId');
                    const fn = this.responseCallbacksMap.get(messageId);
                    if (fn) {
                        const message = (await this.codec.decode(msg.data)) as IMessageResponse<any>;
                        if (!message) {
                            fn(null)
                        } else {
                            fn(message.body, message.error, message.code);
                        }
                        this.responseCallbacksMap.delete(messageId)
                    }
                } else {
                    console.error(error);
                }
            }
        });
    }

    /**
     * Set connection
     * @param cn
     */
    public setConnection(cn: NatsConnection): NatsService {
        this.connection = cn;
        return this
    }

    /**
     * Publish
     * @param subject
     * @param data
     * @param replySubject
     */
    public async publish(subject: string, data?: unknown, replySubject?: string): Promise<void> {
        const opts: any = {};

        if (replySubject) {
            opts.reply = replySubject;
        }

        this.connection.publish(subject, await this.codec.encode(data), opts);
    }

    /**
     * Subscribe
     * @param subject
     * @param cb
     */
    public subscribe(subject: string, cb: Function): Subscription {
        const sub = this.connection.subscribe(subject);
        const fn = async (_sub: Subscription) => {
            for await (const m of _sub) {
                try {
                    cb(await this.codec.decode(m.data));
                } catch (e) {
                    console.error(e.message);
                }
            }
        }
        fn(sub);
        return sub;
    }

    /**
     * Send message
     * @param subject
     * @param data
     */
    public sendMessage<T>(subject: string, data?: unknown): Promise<T> {
        const messageId = GenerateUUIDv4();
        return new Promise(async (resolve, reject) => {
            const head = headers();
            head.append('messageId', messageId);
            this.responseCallbacksMap.set(messageId, (body: T, error?: string, code?: number) => {
                if (error) {
                    reject(new MessageError(error, code));
                } else {
                    resolve(body);
                }
            })

            this.connection.publish(subject, await this.codec.encode(data), {
                reply: this.replySubject,
                headers: head
            })
        });
    }

    /**
     * Send message with timeout
     * @param subject
     * @param timeout
     * @param data
     */
    public sendMessageWithTimeout<T>(subject: string, timeout: number, data?: unknown): Promise<T> {
        return Promise.race([
            this.sendMessage<T>(subject, data),
            new Promise<T>((_, reject) => {
                setTimeout(() => { reject(new Error('Timeout exceed')) }, timeout)
            })
        ])
    }

    /**
     * Send raw message
     * @param subject
     * @param data
     */
    public sendRawMessage<T>(subject: string, data?: unknown): Promise<T> {
        const messageId = GenerateUUIDv4();
        return new Promise(async (resolve, reject) => {
            const head = headers();
            head.append('messageId', messageId);
            // head.append('rawMessage', 'true');

            this.responseCallbacksMap.set(messageId, (body: T, error?: string, code?: number) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            })

            this.connection.publish(subject, await this.codec.encode(data), {
                reply: this.replySubject,
                headers: head
            })
        });
    }

    /**
     * Get messages
     * @param subject
     * @param cb
     * @param noRespond
     */
    public getMessages<T, A>(subject: string, cb: Function, noRespond = false): Subscription {
        return this.connection.subscribe(subject, {
            queue: this.messageQueueName,
            callback: async (error, msg) => {
                try {
                    const messageId = msg.headers?.get('messageId');
                    // const isRaw = msg.headers.get('rawMessage');
                    const head = headers();
                    if (messageId) {
                        head.append('messageId', messageId);
                    }
                    // head.append('rawMessage', isRaw);
                    if (!noRespond) {
                        msg.respond(await this.codec.encode(await cb(await this.codec.decode(msg.data), msg.headers)), { headers: head });
                    } else {
                        cb(await this.codec.decode(msg.data), msg.headers);
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        });
    }
}

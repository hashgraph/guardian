import { NatsConnection, headers, Subscription } from 'nats';
import { GenerateUUIDv4, WalletEvents } from '@guardian/interfaces';
import { ZipCodec } from './zip-codec.js';
import { IMessageResponse } from '../models/index.js';
import { ForbiddenException } from '@nestjs/common';
import { JwtServicesValidator } from '../security/index.js';

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

    /**
     * availableEvents
     */
    private availableEvents: string[] = [];

    constructor() {
        this.codec = ZipCodec();
        JwtServicesValidator.setWhiteList([
            WalletEvents.SET_GLOBAL_APPLICATION_KEY,
            WalletEvents.SET_KEY,
            WalletEvents.GET_GLOBAL_APPLICATION_KEY,
            WalletEvents.GET_KEY,
        ], ['settings-reply-']);

        // this.codec = JSONCodec();
    }

    /**
     * configure available events
     */
    public configureAvailableEvents(availableEvents: string[]): void {
        this.availableEvents = availableEvents;
    }

    /**
     * add additional available events
     */
    public addAdditionalAvailableEvents(availableEvents: string[]): void {
        this.availableEvents = [...this.availableEvents, ...availableEvents];
    }

    /**
     * Init
     */
    public async init(): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection must set first');
        }

        JwtServicesValidator.setWhiteList([
            WalletEvents.SET_GLOBAL_APPLICATION_KEY,
            WalletEvents.SET_KEY,
            WalletEvents.GET_GLOBAL_APPLICATION_KEY,
            WalletEvents.GET_KEY,
        ], ['settings-reply-']);

        this.addAdditionalAvailableEvents([this.replySubject]);

        this.connection.subscribe(this.replySubject, {
            callback: async (error, msg) => {
                if (!error) {
                    const messageId = msg.headers?.get('messageId');
                    const serviceToken = msg.headers?.get('serviceToken');
                    const fn = this.responseCallbacksMap.get(messageId);
                    if (fn) {
                        const message = (await this.codec.decode(msg.data)) as IMessageResponse<any>;
                        if (!message) {
                            fn(null)
                        } else {
                            try {
                                if (this.availableEvents && !this.availableEvents.includes(msg.subject)) {
                                    throw new Error(`NATS: subscription to "${msg.subject}" not allowed`);
                                }

                                try {
                                    await JwtServicesValidator.verify(serviceToken, msg.subject);
                                } catch (err) {
                                    throw err;
                                }
                            fn(message.body, message.error, message.code);
                            } catch (e: any) {
                                console.error('Reply validation failed:', e.message);
                                fn(null, e.message, 401);
                            }
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
        const token = await JwtServicesValidator.sign(subject);
        const head = headers();
        head.append('serviceToken', token);
        const opts: any = {
            serviceToken: token
        };

        if (replySubject) {
            opts.reply = replySubject;
            head.append('reply', replySubject);
        }

        opts.headers = head;

        this.connection.publish(subject, await this.codec.encode(data), opts);
    }

    /**
     * Subscribe
     * @param subject
     * @param cb
     */
    public subscribe(subject: string, cb: Function): Subscription {
        this.addAdditionalAvailableEvents([subject]);
        const sub = this.connection.subscribe(subject);

        const fn = async (_sub: Subscription) => {
            for await (const m of _sub) {
                let data = null;
                try {
                    const serviceToken = m.headers?.get('serviceToken');
                    if (this.availableEvents && !this.availableEvents.includes(m.subject)) {
                        throw new Error(`NATS: subscription to "${subject}" not allowed`);
                    }
                    data = await this.codec.decode(m.data);
                    try {
                        await JwtServicesValidator.verify(serviceToken, m.subject);
                    } catch (err) {
                        throw err;
                    }

                    cb(data);
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
     * @param isResponseCallback
     * @param externalMessageId
     */
    public sendMessage<T>(subject: string, data?: unknown, isResponseCallback: boolean = true, externalMessageId?: string): Promise<T> {
        const messageId = externalMessageId ?? GenerateUUIDv4();

        return new Promise(async (resolve, reject) => {
            const head = headers();
            head.append('messageId', messageId);
            if (isResponseCallback) {
                this.responseCallbacksMap.set(messageId, (body: T, error?: string, code?: number) => {
                    if (error) {
                        reject(new MessageError(error, code));
                    } else {
                        resolve(body);
                    }
                })
            } else {
                resolve(null);
            }
            const token = await JwtServicesValidator.sign(subject);
            head.append('serviceToken', token);

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
        const messageId = GenerateUUIDv4();

        const messagePromise = this.sendMessage<T>(subject, data, true, messageId);

        const timeoutPromise = new Promise<T>((_, reject) => {
            setTimeout(() => {
                this.responseCallbacksMap.delete(messageId);
                reject(new Error(`Timeout exceed (${subject})`));
            }, timeout);
        });

        return Promise.race([messagePromise, timeoutPromise]);
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

            const token = await JwtServicesValidator.sign(subject);
            head.append('serviceToken', token);

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
        this.addAdditionalAvailableEvents([subject]);
        return this.connection.subscribe(subject, {
            queue: this.messageQueueName,
            callback: async (error, msg) => {
                try {
                    const messageId = msg.headers?.get('messageId');
                    const serviceToken = msg.headers?.get('serviceToken');
                    // const isRaw = msg.headers.get('rawMessage');
                    const head = headers();
                    if (messageId) {
                        head.append('messageId', messageId);
                    }
                    if (!noRespond) {
                        const token = await JwtServicesValidator.sign(msg.subject);
                        head.append('serviceToken', token);
                    }

                    // head.append('rawMessage', isRaw);
                    if (this.availableEvents && !this.availableEvents.includes(msg.subject)) {
                        if (!noRespond) {
                            return msg.respond(await this.codec.encode({
                                body: null,
                                error: 'Forbidden',
                                code: 403,
                                name: 'Forbidden',
                                message: 'Forbidden'
                              }), { headers: head });
                        } else {
                            throw new ForbiddenException();
                        }
                    }

                    try {
                        await JwtServicesValidator.verify(serviceToken, msg.subject);
                    } catch (err) {
                        throw err;
                    }
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

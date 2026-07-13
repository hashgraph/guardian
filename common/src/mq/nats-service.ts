import { NatsConnection, headers, Subscription } from 'nats';
import { GenerateUUIDv4 } from '@guardian/interfaces';
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

        this.addAdditionalAvailableEvents([this.replySubject]);

        this.connection.subscribe(this.replySubject, {
            callback: async (error, msg) => {
                if (!error) {
                    const messageId = msg.headers?.get('messageId');
                    const serviceToken = msg.headers?.get('serviceToken');
                    const fn = this.responseCallbacksMap.get(messageId);
                    if (fn) {
                        let message: IMessageResponse<any>;
                        try {
                            message = (await this.codec.decode(msg.data)) as IMessageResponse<any>;
                        } catch (e: any) {
                            // Decode may fetch a large-payload directLink; a failure here (e.g.
                            // ECONNREFUSED when the responder died mid-request) must fail this
                            // request rather than throw out of the async callback and crash the process.
                            // Log the detail server-side; return a generic message to the caller so
                            // internal exception text (e.g. the directLink URL) is not leaked.
                            console.error('Reply decode failed:', e.message);
                            fn(null, 'Failed to decode reply payload', 500);
                            this.responseCallbacksMap.delete(messageId);
                            return;
                        }
                        if (!message) {
                            fn(null)
                        } else {
                            try {
                                if (this.availableEvents && !this.availableEvents.includes(msg.subject)) {
                                    throw new Error(`NATS: subscription to "${msg.subject}" not allowed`);
                                }

                                try {
                                    await JwtServicesValidator.verify(serviceToken);
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
                        await JwtServicesValidator.verify(serviceToken);
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

        return new Promise((resolve, reject) => {
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
            // Run the async work outside the Promise executor: a rejection from
            // sign/encode/publish inside an async executor is neither caught nor
            // settles this promise (it becomes an unhandledRejection and the
            // caller hangs). Route it to reject and clean up the callback instead.
            (async () => {
                const token = await JwtServicesValidator.sign(subject);
                head.append('serviceToken', token);

                this.connection.publish(subject, await this.codec.encode(data), {
                    reply: this.replySubject,
                    headers: head
                })
            })().catch((e) => {
                this.responseCallbacksMap.delete(messageId);
                reject(e instanceof Error ? e : new Error(String(e)));
            });
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
     * Core NATS request over a dedicated inbox: a subject with no subscribers
     * fails fast ("no responders") instead of waiting out the timeout. Throws
     * Error{code:'NO_RESPONDERS'} (not delivered - safe to retry),
     * Error{code:'REQUEST_TIMEOUT'} (maybe delivered - do NOT retry) or
     * MessageError(code); otherwise returns the response body.
     */
    public async requestOrThrow<T>(
        subject: string,
        data?: unknown,
        timeout: number = 1000,
        extraHeaders?: Record<string, string>
    ): Promise<T> {
        const head = headers();
        head.append('messageId', GenerateUUIDv4());
        if (extraHeaders) {
            for (const [key, value] of Object.entries(extraHeaders)) {
                head.append(key, value);
            }
        }
        const token = await JwtServicesValidator.sign(subject);
        head.append('serviceToken', token);

        let msg;
        try {
            msg = await this.connection.request(subject, await this.codec.encode(data), { timeout, headers: head });
        } catch (error: any) {
            // nats: NoResponders -> '503', Timeout -> 'TIMEOUT'
            if (error?.code === '503' || /no responders/i.test(error?.message || '')) {
                const e = new Error(`No responders for "${subject}"`);
                (e as any).code = 'NO_RESPONDERS';
                throw e;
            }
            if (error?.code === 'TIMEOUT' || /timeout/i.test(error?.message || '')) {
                const e = new Error(`Timeout for "${subject}"`);
                (e as any).code = 'REQUEST_TIMEOUT';
                throw e;
            }
            throw error;
        }

        // Mirror the replySubject handler in init(): guard the decode so a
        // failure (e.g. a directLink fetch that ECONNREFUSEs when the responder
        // died mid-request) fails this request with a generic message instead of
        // leaking internal exception text (the directLink URL).
        let message: IMessageResponse<T>;
        try {
            message = (await this.codec.decode(msg.data)) as IMessageResponse<T>;
        } catch (e: any) {
            console.error('Reply decode failed:', e.message);
            throw new MessageError('Failed to decode reply payload', 500);
        }

        // Verify the reply's serviceToken before trusting the body, so with
        // QM_VERIFICATION enabled the reply-side auth check is not dropped.
        const serviceToken = msg.headers?.get('serviceToken');
        try {
            await JwtServicesValidator.verify(serviceToken);
        } catch (e: any) {
            console.error('Reply validation failed:', e.message);
            throw new MessageError(e.message, 401);
        }

        if (message && message.error) {
            throw new MessageError(message.error, message.code);
        }
        return message ? message.body : null;
    }

    /**
     * Send raw message
     * @param subject
     * @param data
     */
    public sendRawMessage<T>(subject: string, data?: unknown): Promise<T> {
        const messageId = GenerateUUIDv4();
        return new Promise((resolve, reject) => {
            const head = headers();
            head.append('messageId', messageId);
            // head.append('rawMessage', 'true');

            this.responseCallbacksMap.set(messageId, (body: T, error?: string, code?: number) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });

            // See sendMessage: keep async work out of the Promise executor so a
            // sign/encode/publish failure rejects this promise (and clears the
            // callback) instead of becoming an unhandledRejection.
            (async () => {
                const token = await JwtServicesValidator.sign(subject);
                head.append('serviceToken', token);

                this.connection.publish(subject, await this.codec.encode(data), {
                    reply: this.replySubject,
                    headers: head
                })
            })().catch((e) => {
                this.responseCallbacksMap.delete(messageId);
                reject(e instanceof Error ? e : new Error(String(e)));
            });
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
                        await JwtServicesValidator.verify(serviceToken);
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

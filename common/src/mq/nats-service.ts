import { Subscription, NatsConnection, StringCodec, connect, JSONCodec, headers } from 'nats';
import { Codec } from 'nats/lib/nats-base-client/codec';
import { GenerateUUIDv4 } from '@guardian/interfaces';

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
    protected readonly jsonCodec: Codec<unknown>;

    /**
     * stringCodec
     */
    protected readonly stringCodec: Codec<string>

    /**
     * connection
     */
    protected connection: NatsConnection;

    /**
     * responseCallbacksMap
     */
    protected responseCallbacksMap: Map<string, Function> = new Map();

    constructor() {
        this.jsonCodec = JSONCodec<unknown>();
        this.stringCodec = StringCodec();
    }

    /**
     * Init
     */
    public async init(): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection must set first');
        }
        this.connection.subscribe(this.replySubject, {
            callback: (error, msg) => {;
                if (!error) {
                    const messageId = msg.headers.get('messageId');
                    const isRaw = msg.headers.get('isRaw') === 'true';
                    const fn = this.responseCallbacksMap.get(messageId);
                    if (fn) {
                        if (isRaw) {
                            fn(msg.data);
                        } else {
                            const message = this.jsonCodec.decode(msg.data) as any;
                            if (!message) {
                                fn(null)
                            } else {
                                fn(message.body, message.error);
                            }
                        }
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
     * Send message
     * @param subject
     * @param data
     */
    public sendMessage<T>(subject: string, data?: unknown): Promise<T>{
        const messageId = GenerateUUIDv4();
        const head = headers();
        head.append('messageId', messageId);

        return new Promise((resolve, reject) => {
            this.responseCallbacksMap.set(messageId, (d: T, error?) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(d);
            })

            this.connection.publish(subject, this.jsonCodec.encode(data) , {
                reply: this.replySubject,
                headers: head
            })
        });
    }

    /**
     * Send raw message
     * @param subject
     * @param data
     */
    public sendRawMessage<T>(subject: string, data?: unknown): Promise<T>{
        const messageId = GenerateUUIDv4();
        const head = headers();
        head.append('messageId', messageId);
        head.append('isRaw', 'true');

        return new Promise((resolve, reject) => {
            this.responseCallbacksMap.set(messageId, (d: T, error?) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(d);
            })

            this.connection.publish(subject, this.jsonCodec.encode(data) , {
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
    public getMessages<T, A>(subject: string, cb: Function, noRespond = false) {
        this.connection.subscribe(subject, {
            queue: this.messageQueueName,
            callback: async (error, msg) => {
                const messageId = msg.headers.get('messageId');
                const head = headers();
                head.append('messageId', messageId);
                if (!noRespond) {
                    msg.respond(this.jsonCodec.encode(await cb(this.jsonCodec.decode(msg.data), msg.headers)), {headers: head});
                } else {
                    cb(this.jsonCodec.decode(msg.data), msg.headers);;
                }
            }
        });
    }
}

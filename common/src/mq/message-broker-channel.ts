import assert from 'assert';
import { Subscription, NatsConnection, StringCodec, connect, JSONCodec, headers } from 'nats';
import { IMessageResponse, MessageError } from '../models/message-response';
import { GenerateUUIDv4 } from '@guardian/interfaces';

const MQ_TIMEOUT = 300000;
/**
 * Message Chunk Size ~ 1 MB
 */
const MQ_MESSAGE_CHUNK = 1000000;
const reqMap = new Map<string, any>();
const chunkMap = new Map<string, any>();
/**
 * Message broker channel
 */
export class MessageBrokerChannel {
    constructor(
        private readonly channel: NatsConnection,
        public channelName: string
    ) {
        const fn = async (_sub: Subscription) => {
            for await (const m of _sub) {
                if (!m.headers) {
                    console.error('No headers');
                    continue;
                }

                const messageId = m.headers.get('messageId');
                const chunkNumber = m.headers.get('chunk');
                const countChunks = m.headers.get('chunks');
                let requestChunks: any;
                if (chunkMap.has(messageId)) {
                    requestChunks = chunkMap.get(messageId);
                    requestChunks.push({ data: m.data, index: chunkNumber });
                } else {
                    requestChunks = [{ data: m.data, index: chunkNumber }];
                    chunkMap.set(messageId, requestChunks);
                }

                if (requestChunks.length < countChunks) {
                    continue;
                } else {
                    chunkMap.delete(messageId);
                }

                if (reqMap.has(messageId)) {
                    const requestChunksSorted = new Array<Buffer>(requestChunks.length);
                    for (const requestChunk of requestChunks) {
                        requestChunksSorted[requestChunk.index - 1] = requestChunk.data;
                    }
                    const dataObj = JSON.parse(Buffer.concat(requestChunksSorted).toString());
                    const func = reqMap.get(messageId);
                    func(dataObj);
                } else {
                    continue;
                }
            }
        }

        fn(this.channel.subscribe('response-message', { queue: process.env.SERVICE_CHANNEL })).then();
    }

    /**
     * Get target
     * @param eventType
     * @private
     */
    private getTarget(eventType: string) {
        if (eventType.includes(this.channelName) || eventType.includes('*')) {
            return eventType;
        }
        return `${this.channelName}.${eventType}`;
    }

    /**
     * Subscribe to the MQ event
     * @param eventType : target event type @example  ipfs-clients.get-file
     * @param handleFunc: the call back function to process the request
     */
    public async response<TData, TResponse>(eventType: string, handleFunc: (data: TData) => Promise<IMessageResponse<TResponse>>) {
        const target = this.getTarget(eventType);
        // console.log('MQ subscribed: %s', target);
        const sub = this.channel.subscribe(target, { queue: process.env.SERVICE_CHANNEL });
        const fn = async (_sub: Subscription) => {
            for await (const m of _sub) {
                const messageId = m.headers.get('messageId');
                const chunkNumber = m.headers.get('chunk');
                const countChunks = m.headers.get('chunks');
                let requestChunks: any;

                if (chunkMap.has(messageId)) {
                    requestChunks = chunkMap.get(messageId);
                    requestChunks.push({ data: m.data, index: chunkNumber });
                } else {
                    requestChunks = [{ data: m.data, index: chunkNumber }];
                    chunkMap.set(messageId, requestChunks);
                }

                if (requestChunks.length < countChunks) {
                    m.respond(new Uint8Array(0));
                    continue;
                } else {
                    chunkMap.delete(messageId);
                    m.respond(new Uint8Array(0));
                }

                const requestChunksSorted = new Array<Buffer>(requestChunks.length);
                for (const requestChunk of requestChunks) {
                    requestChunksSorted[requestChunk.index - 1] = requestChunk.data;
                }

                const payload = JSON.parse(Buffer.concat(requestChunksSorted).toString());
                let responseMessage: IMessageResponse<TResponse>;
                try {
                    responseMessage = await handleFunc(payload);
                } catch (error) {
                    responseMessage = new MessageError(error, error.code);
                }

                const head = headers();
                head.append('messageId', messageId);

                const payloadBuffer = Buffer.from(JSON.stringify(responseMessage));
                let offset = 0;
                const chunks: Buffer[] = [];
                while(offset < payloadBuffer.length) {
                    chunks.push(
                        payloadBuffer.subarray(offset, offset + MQ_MESSAGE_CHUNK > payloadBuffer.length ? payloadBuffer.length : offset + MQ_MESSAGE_CHUNK)
                    );
                    offset = offset + MQ_MESSAGE_CHUNK;
                }

                head.set('chunks', chunks.length.toString());
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    head.set('chunk', (i+1).toString());
                    this.channel.publish('response-message', chunk, { headers: head });
                }
            }
        };
        try {
            await fn(sub);
        } catch (error) {
            console.error(error.message);
        }
    }

    /**
     * sending the request to the MQ and waiting for response
     * @param eventType target subscription , it should follow the pattern: target subscription . event type (ex : ipfs-clients.get-file)
     * @param payload input data for event
     * @param timeout timeout in milliseconds, this will overwrite default env var MQ_TIMEOUT varlue @default 30000
     * @returns MessageResponse or Error response
     */
    public request<T, TResponse>(eventType: string, payload: T, timeout?: number): Promise<IMessageResponse<TResponse>> {
        try {
            const messageId = GenerateUUIDv4();
            const head = headers();
            head.append('messageId', messageId);

            let stringPayload: string;
            switch (typeof payload) {
                case 'string':
                    stringPayload = payload;
                    break;

                case 'object':
                    stringPayload = JSON.stringify(payload);
                    break;

                default:
                    stringPayload = '{}';
            }

            return new Promise<IMessageResponse<TResponse>>((resolve, reject) => {
                reqMap.set(messageId, (data) => {
                    resolve(data);
                    reqMap.delete(messageId);
                });

                const payloadBuffer = Buffer.from(stringPayload);
                let offset = 0;
                const chunks: Buffer[] = [];
                while(offset < payloadBuffer.length) {
                    chunks.push(
                        payloadBuffer.subarray(offset, offset + MQ_MESSAGE_CHUNK > payloadBuffer.length ? payloadBuffer.length : offset + MQ_MESSAGE_CHUNK)
                    );
                    offset = offset + MQ_MESSAGE_CHUNK;
                }

                head.set('chunks', chunks.length.toString());

                let errorHandler = (error) => {
                    reqMap.delete(messageId);
                    // Nats no subscribe error
                    if (error.code === '503') {
                        console.warn('No listener for message event type =  %s', eventType);
                        resolve(null);
                    } else {
                        console.error(error.message, error.stack, error);
                        reject(error);
                    }
                };

                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    head.set('chunk', (i+1).toString());
                    this.channel.request(eventType, chunk, {
                        timeout: timeout || MQ_TIMEOUT,
                        headers: head
                    }).then(() => null, (error) => {
                        if (errorHandler) {
                            errorHandler(error);
                            errorHandler = null;
                        }
                    });
                }
            });
        } catch (error) {
            return new Promise<IMessageResponse<TResponse>>((resolve, reject) => {
                // Nats no subscribe error
                if (error.code === '503') {
                    console.warn('No listener for message event type =  %s', eventType);
                    resolve(null);
                    return;
                }

                console.error(error.message, error.stack, error);
                reject(error);
            });
        }
    }

    /**
     * Publish message to all Nats client subscribers
     * @param eventType
     * @param data
     * @param allowError
     */
    public publish<T>(eventType: string, data: T, allowError = true) {
        try {
            console.log('MQ publish: %s', eventType);
            console.log(data);
            const messageId = GenerateUUIDv4();
            const head = headers();
            head.append('messageId', messageId);

            const sc = JSONCodec();
            this.channel.publish(eventType, sc.encode(data), { headers: head });
        } catch (e) {

            console.error(e.message, e.stack, e);
            if (!allowError) {
                throw e;
            }
        }
    }

    /**
     * Subscribe for subject
     * @param subj
     * @param callback
     */
    public subscribe(subj: string, callback: (data: unknown) => void | Promise<void>): void {
        const sub = this.channel.subscribe(subj, { queue: process.env.SERVICE_CHANNEL });
        const fn = async (_sub: Subscription) => {
            for await (const m of _sub) {
                const dataObj = JSON.parse(StringCodec().decode(m.data));
                callback(dataObj);
            }
        }
        fn(sub);
    }

    /**
     * Create the Nats MQ connection
     * @param connectionName
     * @returns
     */
    public static async connect(connectionName: string) {
        assert(process.env.MQ_ADDRESS, 'Missing MQ_ADDRESS environment variable');
        return connect({
            servers: [process.env.MQ_ADDRESS],
            name: connectionName,
            reconnectDelayHandler: () => 2000,
            maxReconnectAttempts: -1 // reconnect forever
        });
    };
}

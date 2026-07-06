import assert from 'node:assert';
import { connect, headers, NatsConnection, StringCodec, Subscription } from 'nats';
import { IMessageResponse, MessageError } from '../models/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { ZipCodec } from './zip-codec.js';
import { GenerateTLSOptionsNats } from '../helpers/index.js';
import { JwtServicesValidator } from '../security/index.js';

const MQ_TIMEOUT = 300000;
/**
 * Message Chunk Size
 * Default value ~ 1 MB
 */
const MQ_MESSAGE_CHUNK =
    Math.floor(Math.abs(+process.env.MQ_MESSAGE_CHUNK)) || 1000000;
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
                try {
                    if (!m.headers) {
                        console.error('No headers');
                        continue;
                    }

                    if (!m.headers.has('chunks')) {
                        console.error('No chunks');
                        continue;
                    }

                    const messageId = m.headers.get('messageId');
                    const serviceToken = m.headers?.get('serviceToken');

                    await JwtServicesValidator.verify(serviceToken);

                    const chunkNumber = m.headers.get('chunk');
                    const countChunks = m.headers.get('chunks');
                    let requestChunks: any;
                    if (chunkMap.has(messageId)) {
                        requestChunks = chunkMap.get(messageId);
                        requestChunks.push({data: m.data, index: chunkNumber});
                    } else {
                        requestChunks = [{data: m.data, index: chunkNumber}];
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
                } catch (e) {
                    console.error(e);
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
                try {
                    let payload: any;
                    const messageId = m.headers.get('messageId');
                    const serviceToken = m.headers?.get('serviceToken');
                    await JwtServicesValidator.verify(serviceToken);

                    if (m.headers.has('chunks')) {
                        const chunkNumber = m.headers.get('chunk');
                        const countChunks = m.headers.get('chunks');
                        let requestChunks: any;

                        if (chunkMap.has(messageId)) {
                            requestChunks = chunkMap.get(messageId);
                            requestChunks.push({data: m.data, index: chunkNumber});
                        } else {
                            requestChunks = [{data: m.data, index: chunkNumber}];
                            chunkMap.set(messageId, requestChunks);
                        }

                        const chunkHeaders = headers();
                        const chunkToken = await JwtServicesValidator.sign(m.subject);
                        chunkHeaders.append('serviceToken', chunkToken);

                        if (requestChunks.length < countChunks) {
                            m.respond(new Uint8Array(0), { headers: chunkHeaders });
                            continue;
                        } else {
                            chunkMap.delete(messageId);
                            m.respond(new Uint8Array(0), { headers: chunkHeaders });
                        }

                        const requestChunksSorted = new Array<Buffer>(requestChunks.length);
                        for (const requestChunk of requestChunks) {
                            requestChunksSorted[requestChunk.index - 1] = requestChunk.data;
                        }

                        payload = JSON.parse(Buffer.concat(requestChunksSorted).toString());

                    } else {
                        payload = JSON.parse(m.data.toString());
                    }

                    let responseMessage: IMessageResponse<TResponse>;
                    try {
                        responseMessage = await handleFunc(payload);
                    } catch (error) {
                        responseMessage = new MessageError(error, error.code);
                    }

                    const head = headers();
                    head.append('messageId', messageId);

                    const type = 'response-message';

                    const token = await JwtServicesValidator.sign(type);
                    head.append('messageId', messageId);
                    head.append('serviceToken', token);

                    const payloadBuffer = Buffer.from(JSON.stringify(responseMessage));
                    let offset = 0;
                    const chunks: Buffer[] = [];
                    while (offset < payloadBuffer.length) {
                        chunks.push(
                            payloadBuffer.subarray(offset, offset + MQ_MESSAGE_CHUNK > payloadBuffer.length ? payloadBuffer.length : offset + MQ_MESSAGE_CHUNK)
                        );
                        offset = offset + MQ_MESSAGE_CHUNK;
                    }

                    head.set('chunks', chunks.length.toString());
                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i];
                        head.set('chunk', (i + 1).toString());
                        this.channel.publish(type, chunk, {headers: head});
                    }
                } catch (e) {
                    console.error(e.message);
                }
            }
        };

        await fn(sub);
    }

    /**
     * sending the request to the MQ and waiting for response
     * @param eventType target subscription , it should follow the pattern: target subscription . event type (ex : ipfs-clients.get-file)
     * @param payload input data for event
     * @param timeout timeout in milliseconds, this will overwrite default env var MQ_TIMEOUT varlue @default 30000
     * @returns MessageResponse or Error response
     */
    public async request<T, TResponse>(eventType: string, payload: T, timeout?: number): Promise<IMessageResponse<TResponse>> {
        try {
            const messageId = GenerateUUIDv4();
            const head = headers();
            head.append('messageId', messageId);
            const token = await JwtServicesValidator.sign(eventType);
            head.append('serviceToken', token);

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
    public async publish<T>(eventType: string, data: T, allowError = true) {
        try {
            console.log('MQ publish: %s', eventType);
            const messageId = GenerateUUIDv4();
            const head = headers();
            head.append('messageId', messageId);
            const token = await JwtServicesValidator.sign(eventType);
            head.append('serviceToken', token);

            const zc = ZipCodec();
            this.channel.publish(eventType, await zc.encode(data), { headers: head });
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
    public subscribe(subj: string, callback: (data: unknown) => void | Promise<void>): Subscription {
        const sub = this.channel.subscribe(subj, { queue: process.env.SERVICE_CHANNEL });
        const fn = async (_sub: Subscription) => {
            for await (const m of _sub) {
                try {
                    const dataObj = JSON.parse(StringCodec().decode(m.data));
                    const serviceToken = m.headers?.get('serviceToken');
                    await JwtServicesValidator.verify(serviceToken);
                    callback(dataObj);
                } catch (e) {
                    console.error(e.message);
                }
            }
        }
        fn(sub);
        return sub;
    }

    /**
     * Create the Nats MQ connection
     * @param connectionName
     * @returns
     */
    public static async connect(connectionName: string) {
        assert(process.env.MQ_ADDRESS, 'Missing MQ_ADDRESS environment variable');
        return connect({
            tls: GenerateTLSOptionsNats(),
            servers: [process.env.MQ_ADDRESS],
            name: connectionName,
            reconnectDelayHandler: () => 2000,
            maxReconnectAttempts: -1 // reconnect forever
        });
    };
}

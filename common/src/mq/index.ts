import assert from 'assert';
import { JSONCodec, Subscription, NatsConnection, StringCodec, connect } from 'nats';
import { IMessageResponse, MessageError } from '../models/message-response';
import * as zlib from 'zlib';

const MQ_TIMEOUT = +process.env.MQ_TIMEOUT || 300000;

export class MessageBrokerChannel {
    constructor(private channel: NatsConnection, public channelName: string) { }

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
        console.log('MQ subscribed: %s', target);
        const sub = this.channel.subscribe(target);
        const fn = async (sub: Subscription) => {
            for await (const m of sub) {
                let responseMessage: IMessageResponse<TResponse>;
                try {
                    responseMessage = await handleFunc(JSON.parse(StringCodec().decode(m.data)));
                } catch (err) {
                    responseMessage = new MessageError(err.message, err.code);
                }
                const archResponse = zlib.deflateSync(JSON.stringify(responseMessage)).toString('binary');
                m.respond(StringCodec().encode(archResponse));
                console.log(JSON.stringify(responseMessage).length, archResponse.length);
            }
        };
        try {
            await fn(sub);
        } catch (err) {
            console.error(err.message);
        }
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

            const msg = await this.channel.request(eventType, StringCodec().encode(stringPayload), {
                timeout: timeout || MQ_TIMEOUT,
            });

            const unpackedString = zlib.inflateSync(new Buffer(StringCodec().decode(msg.data), 'binary')).toString();
            return JSON.parse(unpackedString);

        } catch (e) {
            // Nats no subscribe error
            if (e.code === '503') {
                console.warn('No listener for message event type =  %s', eventType);
                return;
            }
            console.error(e.message, e.stack, e);
            throw e;
        }
    }

    public publish(eventType: string, data: string) {
        const target = this.getTarget(eventType);
        console.log('MQ publish: %s', target);
        const sc = StringCodec();
        this.channel.publish(target, sc.encode(data));
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

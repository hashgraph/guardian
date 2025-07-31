import { JwtServicesValidator, NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { headers } from 'nats';

class MessageError extends Error {
    public code: number;
    constructor(message: any, code?: number) {
        super(message);
        this.code = code;
    }
}

/**
 * Guardians service
 */
@Singleton
export class GuardiansService extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'guardians-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'guardians-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listener
     * @param event
     * @param cb
     */
    registerListener(event: string, cb: Function, noCompress = false): void {
        this.getMessages(event, cb);
    }

    /**
     * If policy started
     * @param policyId
     */
    public async checkIfPolicyAlive(policyId: string): Promise<boolean> {
        const exist = await this.sendPolicyMessage<boolean>(PolicyEvents.CHECK_IF_ALIVE, policyId, {}, 1000)
        return !!exist
    }

    /**
     * sendPolicyMessage
     * @param subject
     * @param policyId
     * @param data
     * @param awaitInterval
     */
    public async sendPolicyMessage<T>(subject: string, policyId: string, data: unknown, awaitInterval: number = 100000): Promise<T> {
        const messageId = GenerateUUIDv4();
        const head = headers();
        head.append('messageId', messageId);
        head.append('policyId', policyId);
        const token = await JwtServicesValidator.sign([policyId, subject].join('-'));
        head.append('serviceToken', token);

        return Promise.race([
            new Promise<T>(async (resolve, reject) => {
                this.responseCallbacksMap.set(messageId, (d: T, error?) => {
                    if (error) {
                        reject(new Error(error));
                        return
                    }
                    resolve(d);
                })

                this.connection.publish([policyId, subject].join('-'), await this.codec.encode(data), {
                    reply: this.replySubject,
                    headers: head
                })
            }),
            new Promise<T>((resolve, reject) => {
                setTimeout(() => {
                    this.responseCallbacksMap.delete(messageId);
                    resolve(null);
                }, awaitInterval)
            }),
        ])
    }
    /**
     * sendPolicyMessage
     * @param subject
     * @param policyId
     * @param data
     * @param awaitInterval
     */
    public async sendBlockMessage<T>(
        subject: string,
        policyId: string,
        data: unknown,
        awaitInterval: number = 5 * 60 * 1000
    ): Promise<T> {
        const messageId = GenerateUUIDv4();
        const head = headers();
        head.append('messageId', messageId);
        head.append('policyId', policyId);
        const token = await JwtServicesValidator.sign([policyId, subject].join('-'));
        head.append('serviceToken', token);

        return Promise.race([
            new Promise<T>(async (resolve, reject) => {
                this.responseCallbacksMap.set(messageId, (body: T, error?: string, code?: number) => {
                    if (error) {
                        reject(new MessageError(error, code));
                        return
                    }
                    resolve(body);
                })

                this.connection.publish([policyId, subject].join('-'), await this.codec.encode(data), {
                    reply: this.replySubject,
                    headers: head
                })
            }),
            new Promise<T>((resolve, reject) => {
                setTimeout(() => {
                    this.responseCallbacksMap.delete(messageId);
                    reject(new MessageError('Block Timeout', 504));
                }, awaitInterval)
            }),
        ])
    }
}

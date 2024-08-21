import { NatsService, Singleton } from '@guardian/common';
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
        try {
            const exist = await this.sendPolicyMessage<boolean>(PolicyEvents.CHECK_IF_ALIVE, policyId, {}, 1000)
            return !!exist;
        } catch (error) {
            return false;
        }
    }

    /**
     * sendPolicyMessage
     * @param subject
     * @param policyId
     * @param data
     * @param awaitInterval
     */
    public sendPolicyMessage<T>(subject: string, policyId: string, data: unknown, awaitInterval: number = 100000): Promise<T> {
        const messageId = GenerateUUIDv4();
        const head = headers();
        head.append('messageId', messageId);
        head.append('policyId', policyId);

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
                    reject(new MessageError('Block Timeout', 504));
                }, awaitInterval)
            }),
        ])
    }
}

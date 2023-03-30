import { Singleton } from '@helpers/decorators/singleton';
import { NatsService } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { headers } from 'nats';

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
        const exist = await this.sendPolicyMessage<boolean>(PolicyEvents.CHECK_IF_ALIVE, policyId, {})
        return !!exist
    }

    /**
     * sendPolicyMessage
     * @param subject
     * @param policyId
     * @param data
     */
    public sendPolicyMessage<T>(subject: string, policyId: string, data?: unknown): Promise<T>{
        const messageId = GenerateUUIDv4();
        const head = headers();
        head.append('messageId', messageId);
        head.append('policyId', policyId);

        return Promise.race([
            new Promise<T>(async (resolve, reject) => {
                this.responseCallbacksMap.set(messageId, (d: T, error?) => {
                    if (error) {
                        reject(new Error(error));
                        return
                    }
                    resolve(d);
                })

                this.connection.publish([policyId, subject].join('-'), await this.codec.encode(data) , {
                    reply: this.replySubject,
                    headers: head
                })
            }),
            new Promise<T>((resolve, reject) => {
                setTimeout(() => {
                    resolve(null);
                }, 1 * 1000)
            }),
        ])
    }
}

import { Singleton } from '@helpers/decorators/singleton';
import { NatsService } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
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
    registerListener(event: string, cb: Function): void {
        this.getMessages(event, cb);
    }

    /**
     * sendPolicyMessage
     * @param subject
     * @param policyId
     * @param data
     */
    public sendPolicyMessage<T>(subject: string, policyId: string, data?: unknown): Promise<T>{

        /**
         * Timeout promise
         */
        // function timeoutPromise(): Promise<void> {
        //     return new Promise((resolve, reject) => {
        //         setTimeout(() => {
        //             resolve(null);
        //         }, 100 * 1000)
        //     })
        // }

        const messageId = GenerateUUIDv4();
        const head = headers();
        head.append('messageId', messageId);
        head.append('policyId', policyId);

        // return Promise.race([
        //     timeoutPromise(),
        //     new Promise((resolve, reject) => {
        //         this.responseCallbacksMap.set(messageId, (d: T, error?) => {
        //             if (error) {
        //                 reject(error);
        //                 return
        //             }
        //             resolve(d);
        //         })
        //
        //         this.connection.publish(subject, this.jsonCodec.encode(data) , {
        //             reply: this.replySubject,
        //             headers: head
        //         })
        //     })
        // ]) as any;
        return new Promise((resolve, reject) => {
            this.responseCallbacksMap.set(messageId, (d: T, error?) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(d);
            })

            this.connection.publish([policyId, subject].join('-'), this.jsonCodec.encode(data) , {
                reply: this.replySubject,
                headers: head
            })
        })
    }
}

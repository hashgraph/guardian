import { NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';

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
        // Fast fail: no subscriber on the subject -> immediate "no responders".
        const subject = [policyId, PolicyEvents.CHECK_IF_ALIVE].join('-');
        try {
            const alive = await this.requestOrThrow<boolean>(subject, {}, 1000, { policyId });
            return !!alive;
        } catch (error: any) {
            // Only a genuine "no responders" proves the policy is not loaded.
            // Any other failure (slow responder, decode/auth error) means a
            // subscriber exists, so report the policy alive rather than let
            // generateModel issue a spurious GENERATE_POLICY reload.
            if (error?.code === 'NO_RESPONDERS') {
                return false;
            }
            return true;
        }
    }

    /**
     * sendPolicyMessage
     * @param subject
     * @param policyId
     * @param data
     * @param awaitInterval
     */
    public async sendPolicyMessage<T>(subject: string, policyId: string, data: unknown, awaitInterval: number = 100000): Promise<T> {
        const full = [policyId, subject].join('-');
        try {
            return await this.requestOrThrow<T>(full, data, awaitInterval, { policyId });
        } catch (error: any) {
            // No host / slow -> null (soft contract); responder error propagates.
            if (error?.code === 'NO_RESPONDERS' || error?.code === 'REQUEST_TIMEOUT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * sendBlockMessage
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
        const full = [policyId, subject].join('-');
        const deadline = Date.now() + awaitInterval;
        const retryDelay = 500;

        for (; ;) {
            const remaining = deadline - Date.now();
            if (remaining <= 0) {
                throw new MessageError('Block Timeout', 504);
            }
            try {
                return await this.requestOrThrow<T>(full, data, remaining, { policyId });
            } catch (error: any) {
                // No host -> not delivered, safe to retry until the deadline.
                if (error?.code === 'NO_RESPONDERS') {
                    if (Date.now() + retryDelay >= deadline) {
                        throw new MessageError('Block Timeout', 504);
                    }
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    continue;
                }
                // Slow responder may have been delivered; do not retry.
                if (error?.code === 'REQUEST_TIMEOUT') {
                    throw new MessageError('Block Timeout', 504);
                }
                throw error;
            }
        }
    }
}

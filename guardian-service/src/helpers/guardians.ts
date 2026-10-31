import { NatsService } from '@guardian/common/mq/nats-service';
import { Singleton } from '@guardian/common/decorators/singleton';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';

class MessageError extends Error {
    public code: number;
    constructor(message: any, code?: number) {
        super(message);
        this.code = code;
    }
}

interface PolicyHooks {
    ensureRunning: (policyId: string) => Promise<boolean>;
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
     * Hooks for policies that are started on demand
     */
    private policyHooks: PolicyHooks | null = null;

    /**
     * Lifecycle subjects that must never trigger an on-demand start
     */
    private static readonly NO_START_SUBJECTS: string[] = [
        PolicyEvents.DELETE_POLICY,
        PolicyEvents.REFRESH_MODEL
    ];

    /**
     * Set hooks for policies that are started on demand
     * @param hooks
     */
    public setPolicyHooks(hooks: PolicyHooks | null): void {
        this.policyHooks = hooks;
    }

    /**
     * Start the policy if it is stopped on purpose (discontinued)
     * @param subject
     * @param policyId
     * @returns true if the policy was started
     */
    private async startOnDemand(subject: string, policyId: string): Promise<boolean> {
        if (!this.policyHooks || GuardiansService.NO_START_SUBJECTS.includes(subject)) {
            return false;
        }
        try {
            return await this.policyHooks.ensureRunning(policyId);
        } catch (error: any) {
            throw new MessageError(
                `Policy is discontinued and could not be started: ${error?.message || error}`,
                503
            );
        }
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
        let startTried = false;
        for (; ;) {
            try {
                return await this.requestOrThrow<T>(full, data, awaitInterval, { policyId });
            } catch (error: any) {
                if (error?.code === 'NO_RESPONDERS' && !startTried) {
                    startTried = true;
                    if (await this.startOnDemand(subject, policyId)) {
                        continue;
                    }
                }
                // No host / slow -> null (soft contract); responder error propagates.
                if (error?.code === 'NO_RESPONDERS' || error?.code === 'REQUEST_TIMEOUT') {
                    return null;
                }
                throw error;
            }
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
        let startTried = false;

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
                    if (!startTried) {
                        startTried = true;
                        if (await this.startOnDemand(subject, policyId)) {
                            continue;
                        }
                    }
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

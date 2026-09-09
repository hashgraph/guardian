import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SEND_EMAIL_QUEUE, SEND_EMAIL_JOB, MAIL_JOB_OPTS, MailJobData } from './mail-queue.constants';

@Injectable()
export class MailQueueProducer {
    private readonly logger = new Logger(MailQueueProducer.name);
    private readonly enabled = (process.env.MAIL_QUEUE_ENABLED ?? 'false') === 'true';

    constructor(
        @InjectQueue(SEND_EMAIL_QUEUE) private readonly queue: Queue,
    ) {}

    get isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Enqueues a transactional email job.
     *
     * Returns true if the job was successfully enqueued, false if the queue is
     * disabled or if enqueuing failed (never throws — callers fall back to inline).
     * Logs only the job kind on failure — never logs `to` or `link` (credentials).
     */
    async enqueue(data: MailJobData): Promise<boolean> {
        if (!this.enabled) {
            return false;
        }
        try {
            await this.queue.add(SEND_EMAIL_JOB, data, MAIL_JOB_OPTS);
            return true;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `mail enqueue failed [kind=${data.kind}] — ${msg}; falling back to inline`,
            );
            return false;
        }
    }
}

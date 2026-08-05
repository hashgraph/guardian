import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../mail.service';
import { SEND_EMAIL_QUEUE, MailJobData } from './mail-queue.constants';

@Processor(SEND_EMAIL_QUEUE)
export class MailQueueProcessor extends WorkerHost {
    private readonly logger = new Logger(MailQueueProcessor.name);

    constructor(private readonly mailService: MailService) {
        super();
    }

    async process(job: Job<MailJobData>): Promise<void> {
        const d = job.data;
        switch (d.kind) {
            case 'verify':
                await this.mailService.sendVerificationEmail(d.to, d.link, d.name);
                break;
            case 'reset':
                await this.mailService.sendPasswordResetEmail(d.to, d.link, d.name, d.expiry);
                break;
            case 'welcome':
                await this.mailService.sendWelcomeEmail(d.to, d.link, d.name);
                break;
            case 'deactivated':
                await this.mailService.sendDeactivationEmail(d.to, d.name);
                break;
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<MailJobData>, error: Error): void {
        this.logger.error(
            `send-email job ${job.id} [kind=${job.data?.kind}] failed: ${error.message}`,
        );
    }
}

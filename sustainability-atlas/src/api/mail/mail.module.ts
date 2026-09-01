import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getRedictConfig } from '@shared/config/redict.config';
import { MailService } from './mail.service';
import { MailQueueProducer } from './mail-queue/mail-queue.producer';
import { MailQueueProcessor } from './mail-queue/mail-queue.processor';
import { SEND_EMAIL_QUEUE, MAIL_JOB_OPTS } from './mail-queue/mail-queue.constants';

/**
 * Mail module — transactional email (SMTP + templates) and its BullMQ send queue.
 *
 * Owns the single BullModule.forRoot in the API process. Provides the producer
 * (enqueue) + processor (consume) that both run in the API process, and exports
 * MailService (inline send) + MailQueueProducer for AuthModule / AdminModule.
 */
@Module({
    imports: [
        // Exactly ONE BullModule.forRoot in the API process — it lives here.
        // Strip keyPrefix from the connection: passing the full getRedictConfig()
        // (which includes keyPrefix:'se:') silently breaks BullMQ queue lookups.
        BullModule.forRootAsync({
            useFactory: () => {
                const { keyPrefix: _kp, ...c } = getRedictConfig();
                return {
                    connection: {
                        host: c.host,
                        port: c.port,
                        password: c.password,
                        db: c.db,
                    },
                };
            },
        }),
        BullModule.registerQueue({
            name: SEND_EMAIL_QUEUE,
            // Bake the retry policy into the queue defaults so durability never
            // depends on a producer remembering to pass MAIL_JOB_OPTS.
            defaultJobOptions: { ...MAIL_JOB_OPTS },
        }),
    ],
    providers: [MailService, MailQueueProducer, MailQueueProcessor],
    exports: [MailService, MailQueueProducer],
})
export class MailModule {}

import { Controller, Module } from '@nestjs/common';
import { Client, ClientProxy, MessagePattern, Transport, } from '@nestjs/microservices';
import process from 'process';
import { TopicService } from '../services/topic-service.js';
import { MessageService } from '../services/message-service.js';
import { IndexerMessageAPI, MessageResponse, MessageError, Singleton, Jobs } from '@indexer/common';

interface IOptions {
    CYCLE_TIME: number;
    TOPIC_READ_DELAY: number;
    TOPIC_READ_TIMEOUT: number;
    TOPIC_JOB_REFRESH_TIME: number;
    TOPIC_JOB_COUNT: number;
    MESSAGE_READ_DELAY: number;
    MESSAGE_READ_TIMEOUT: number;
    MESSAGE_JOB_REFRESH_TIME: number;
    MESSAGE_JOB_COUNT: number;
}

@Controller()
export class ChannelService {
    @Client({
        transport: Transport.NATS,
        options: {
            servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
        },
    })
    client: ClientProxy;

    /**
     * Get all notifications
     * @param msg options
     * @returns Notifications and count
     */
    @MessagePattern(IndexerMessageAPI.GET_INDEXER_WORKER_STATUS)
    async getStatuses() {
        try {
            console.log('getStatuses')
            const statuses = (new Worker()).getStatuses();
            return new MessageResponse(statuses);
        } catch (error) {
            return new MessageError(error);
        }
    }
}

/**
 * Worker API
 */
@Singleton
export class Worker {
    public status: 'INITIALIZING' | 'STARTED' | 'STOPPED';
    public topics: Jobs;
    public messages: Jobs;

    /**
     * Initialize worker
     */
    public init(option: IOptions): Worker {
        TopicService.CYCLE_TIME = option.CYCLE_TIME;
        MessageService.CYCLE_TIME = option.CYCLE_TIME;
        this.topics = new Jobs({
            delay: option.TOPIC_READ_DELAY,
            timeout: option.TOPIC_READ_TIMEOUT,
            refresh: option.TOPIC_JOB_REFRESH_TIME,
            count: option.TOPIC_JOB_COUNT,
            callback: TopicService.updateTopic
        });
        this.messages = new Jobs({
            delay: option.MESSAGE_READ_DELAY,
            timeout: option.MESSAGE_READ_TIMEOUT,
            refresh: option.MESSAGE_JOB_REFRESH_TIME,
            count: option.MESSAGE_JOB_COUNT,
            callback: MessageService.updateMessage
        });
        return this;
    }

    /**
     * Start jobs
     */
    public async start(): Promise<Worker> {
        await TopicService.addTopic("0.0.1960");
        await this.topics.start();
        await this.messages.start();
        return this;
    }

    /**
     * Start stop
     */
    public async stop(): Promise<Worker> {
        await this.topics.stop();
        await this.messages.stop();
        return this;
    }

    /**
     * Get statuses
     */
    public getStatuses(): any {
        return {
            status: this.status,
            topics: this.topics.getStatuses(),
            messages: this.messages.getStatuses()
        };
    }
}

/**
 * Channel module
 */
@Module({
    controllers: [ChannelService],
})
export class ChannelModule { }

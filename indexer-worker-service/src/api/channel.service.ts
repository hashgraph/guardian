import { Controller, Module, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern } from '@nestjs/microservices';
import { IndexerMessageAPI, Singleton, Jobs, Utils } from '@indexer/common';
import { TopicService } from '../services/topic-service.js';
import { MessageService } from '../services/message-service.js';
import { TokenService } from '../services/token-service.js';
import { FileService } from '../services/file-service.js';

interface IOptions {
    NAME: string;
    CYCLE_TIME: number;
    TOPIC_READ_DELAY: number;
    TOPIC_READ_TIMEOUT: number;
    TOPIC_JOB_REFRESH_TIME: number;
    TOPIC_JOB_COUNT: number;
    MESSAGE_READ_DELAY: number;
    MESSAGE_READ_TIMEOUT: number;
    MESSAGE_JOB_REFRESH_TIME: number;
    MESSAGE_JOB_COUNT: number;
    TOKEN_READ_DELAY: number;
    TOKEN_READ_TIMEOUT: number;
    TOKEN_JOB_REFRESH_TIME: number;
    TOKEN_JOB_COUNT: number;
    FILE_CYCLE_TIME: number;
    FILE_READ_DELAY: number;
    FILE_READ_TIMEOUT: number;
    FILE_JOB_REFRESH_TIME: number;
    FILE_JOB_COUNT: number;
}

@Controller()
export class ChannelService {
    private readonly STATUS_DELAY: number = 1000;
    private readonly worker: Worker;

    constructor(@Inject('INDEXER_WORKERS_API') private readonly client: ClientProxy) {
        this.worker = new Worker();
        setInterval(() => {
            const status = this.worker.getStatuses();
            status.delay = this.STATUS_DELAY;
            this.client.emit(IndexerMessageAPI.INDEXER_WORKER_STATUS, status);
        }, this.STATUS_DELAY);
    }

    /**
     * Get all notifications
     * @param msg options
     * @returns Notifications and count
     */
    @EventPattern(IndexerMessageAPI.GET_INDEXER_WORKER_STATUS)
    async updateStatuses() {
        const status = this.worker.getStatuses();
        status.delay = this.STATUS_DELAY;
        this.client.emit(IndexerMessageAPI.INDEXER_WORKER_STATUS, status);
    }
}

/**
 * Worker API
 */
@Singleton
export class Worker {
    public id: string;
    public name: string;
    public status: 'INITIALIZING' | 'STARTED' | 'STOPPED';
    public topics: Jobs;
    public messages: Jobs;
    public tokens: Jobs;
    public files: Jobs;

    /**
     * Initialize worker
     */
    public init(option: IOptions): Worker {
        this.id = Utils.GenerateUUIDv4();
        this.name = option.NAME;
        this.status = 'INITIALIZING';
        TopicService.CYCLE_TIME = option.CYCLE_TIME;
        MessageService.CYCLE_TIME = option.CYCLE_TIME;
        TokenService.CYCLE_TIME = option.CYCLE_TIME;
        FileService.CYCLE_TIME = option.FILE_CYCLE_TIME || option.CYCLE_TIME;
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
        this.tokens = new Jobs({
            delay: option.TOKEN_READ_DELAY,
            timeout: option.TOKEN_READ_TIMEOUT,
            refresh: option.TOKEN_JOB_REFRESH_TIME,
            count: option.TOKEN_JOB_COUNT,
            callback: TokenService.updateToken
        });
        this.files = new Jobs({
            delay: option.FILE_READ_DELAY,
            timeout: option.FILE_READ_TIMEOUT,
            refresh: option.FILE_JOB_REFRESH_TIME,
            count: option.FILE_JOB_COUNT,
            callback: FileService.updateFile
        });
        return this;
    }

    /**
     * Start jobs
     */
    public async start(): Promise<Worker> {
        await TopicService.addTopic(process.env.INITIALIZATION_TOPIC_ID);
        await this.topics.start();
        await this.messages.start();
        await this.tokens.start();
        await this.files.start();
        this.status = 'STARTED';
        return this;
    }

    /**
     * Start stop
     */
    public async stop(): Promise<Worker> {
        await this.topics.stop();
        await this.messages.stop();
        await this.tokens.stop();
        await this.files.stop();
        this.status = 'STOPPED';
        return this;
    }

    /**
     * Get statuses
     */
    public getStatuses(): any {
        return {
            id: this.id,
            name: this.name,
            status: this.status,
            topics: this.topics?.getStatuses(),
            messages: this.messages?.getStatuses(),
            tokens: this.tokens?.getStatuses(),
            files: this.files?.getStatuses()
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

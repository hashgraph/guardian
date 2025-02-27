import { DatabaseServer, MessageResponse, NatsService, PinoLogger } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { TopicListener as ListenerCollection } from '../entity/index.js';
import { IListenerOptions, ListenerEvents } from '../interface/index.js';
import { Listener } from './listener.js';

/**
 * Worker class
 */
export class ListenerService extends NatsService {
    public messageQueueName = 'listeners-queue';
    public replySubject = 'listeners-queue-reply-' + GenerateUUIDv4();

    private delay: number = 60 * 1000;
    private map: Map<string, Listener>;

    constructor(
        private readonly serviceID: string,
        private readonly logger: PinoLogger
    ) {
        super();
        this.map = new Map<string, Listener>();
    }

    /**
     * Initialize worker
     */
    public async init(): Promise<void> {
        await super.init();
        await this.start();

        this.getMessages(ListenerEvents.ADD_TOPIC_LISTENER, async (options: IListenerOptions) => {
            try {
                const result = await this.addListener(options);
                return new MessageResponse({ result })
            } catch (error) {
                this.logger.error(`Update settings error, ${error.message}`, [this.serviceID, 'WORKER']);
                return new MessageResponse({ result: null })
            }
        })

        this.subscribe(ListenerEvents.REMOVE_TOPIC_LISTENER, async (name: string) => {
            try {
                const result = await this.removeListener(name);
                return new MessageResponse({ result })
            } catch (error) {
                this.logger.error(`Update settings error, ${error.message}`, [this.serviceID, 'WORKER']);
                return new MessageResponse({ result: null })
            }
        });

        this.search().then();
    }

    public async addListener(options: IListenerOptions): Promise<string> {
        const dataBaseServer = new DatabaseServer();
        if (options.name && this.map.has(options.name)) {
            return options.name;
        }
        const row = await dataBaseServer.save(ListenerCollection,
            dataBaseServer.create(
                ListenerCollection,
                {
                    topicId: options.topicId,
                    name: options.name,
                    index: -1
                },
            ));
        const listener = new Listener(this, row);
        this.map.set(listener.name, listener);
        return listener.name;
    }

    public async removeListener(name: string): Promise<boolean> {
        const dataBaseServer = new DatabaseServer();
        const listener = this.map.get(name);
        if (listener) {
            this.map.delete(name);
            const row = await dataBaseServer.findOne(ListenerCollection, { id: listener.id });
            if (row) {
                await dataBaseServer.remove(ListenerCollection, row);
            }
        }
        return true;
    }

    public async start(): Promise<void> {
        const rows = await (new DatabaseServer()).findAll(ListenerCollection);
        this.map.clear();
        for (const row of rows) {
            const listener = new Listener(this, row);
            this.map.set(listener.name, listener);
        }
    }

    public async search(): Promise<void> {
        while (true) {
            for (const listener of this.map.values()) {
                await listener.search();
            }
            await new Promise(resolve => setTimeout(resolve, this.delay));
        }
    }
}
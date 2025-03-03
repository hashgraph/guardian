import { DatabaseServer, MessageResponse, NatsService, PinoLogger } from '@guardian/common';
import { GenerateUUIDv4, IListenerOptions, ListenerEvents } from '@guardian/interfaces';
import { TopicListener as ListenerCollection } from '../entity/index.js';
import { Listener } from './listener.js';

/**
 * Worker class
 */
export class ListenerService extends NatsService {
    public messageQueueName = 'listeners-queue';
    public replySubject = 'listeners-queue-reply-' + GenerateUUIDv4();

    private delay: number = 10 * 1000;
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
        await this.restore();

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

        this.scheduler().then();
    }

    public async addListener(options: IListenerOptions): Promise<string> {
        let index = -1;
        if (options.index !== undefined && isFinite(options.index) && options.index > -1) {
            index = options.index;
        }
        if (options.name && this.map.has(options.name)) {
            const listener = this.map.get(options.name);
            await listener.restart(index);
            return listener.name;
        } else {
            const dataBaseServer = new DatabaseServer();
            const row = await dataBaseServer.save(ListenerCollection,
                dataBaseServer.create(
                    ListenerCollection,
                    {
                        topicId: options.topicId,
                        name: options.name,
                        searchIndex: index,
                        sendIndex: index
                    },
                ));
            const listener = new Listener(this, row);
            listener.init();
            this.map.set(listener.name, listener);
            return listener.name;
        }
    }

    public async removeListener(name: string): Promise<boolean> {
        const dataBaseServer = new DatabaseServer();
        const listener = this.map.get(name);
        if (listener) {
            listener.close();
            this.map.delete(name);
            const row = await dataBaseServer.findOne(ListenerCollection, { id: listener.id });
            if (row) {
                await dataBaseServer.remove(ListenerCollection, row);
            }
        }
        return true;
    }

    public async restore(): Promise<void> {
        const rows = await (new DatabaseServer()).findAll(ListenerCollection);
        this.map.clear();
        for (const row of rows) {
            const listener = new Listener(this, row);
            listener.init();
            this.map.set(listener.name, listener);
        }
    }

    public async scheduler(): Promise<void> {
        while (true) {
            for (const listener of this.map.values()) {
                await listener.search();
            }
            await new Promise(resolve => setTimeout(resolve, this.delay));
        }
    }
}
import { Singleton } from '../decorators/singleton';
import { NatsService } from '../mq';
import { ApplicationStates, GenerateUUIDv4, MessageAPI } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '../models';
import { NatsConnection } from 'nats';

/**
 * PolicyEngineChannel
 */
@Singleton
export class ApplicationStateChannel extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'application-state-service-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'application-state-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listener
     * @param event
     * @param cb
     */
    registerListener(event: string, cb: Function): void {
        this.getMessages(event, cb);
    }
}

/**
 * Application state container
 */
@Singleton
export class ApplicationState {
    /**
     * Message broker channel
     * @private
     */
    private channel: ApplicationStateChannel;
    /**
     * Current state
     * @private
     */
    private state: ApplicationStates;
    /**
     * Service name
     * @private
     */
    private readonly serviceName: string;

    /**
     * Register channel
     * @param channel: MessageBrokerChannel
     */
    public async setConnection(cn: NatsConnection): Promise<any> {
        this.channel = new ApplicationStateChannel();
        this.channel.setConnection(cn);
        await this.channel.registerListener(MessageAPI.GET_STATUS, async () => {
            try {
                return new MessageResponse(this.state);
            }
            catch (error) {
                return new MessageError(error);
            }
        });
    }

    constructor(serviceName?: string) {
        this.serviceName = serviceName;
    }

    /**
     * Get current state
     */
    public getState(): ApplicationStates {
        return this.state;
        return ApplicationStates.READY;
    }

    /**
     * Update current state
     * @param state
     */
    public async updateState(state: ApplicationStates): Promise<void> {
        this.state = state;
        if (this.serviceName) {
            const res = {};
            res[this.serviceName] = state;
            this.channel.sendMessage(MessageAPI.UPDATE_STATUS, res);
        }
    }
}

import { Singleton } from '../decorators/singleton';
import { MessageBrokerChannel } from '../mq';
import { ApplicationStates, MessageAPI } from '@guardian/interfaces';
import { MessageResponse, MessageError } from '../models/message-response';

/**
 * Application state container
 */
@Singleton
export class ApplicationState {
    /**
     * Message broker channel
     * @private
     */
    private channel: MessageBrokerChannel;
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
    public async setChannel(channel: MessageBrokerChannel): Promise<any> {
        this.channel = channel;
        await this.channel.response(MessageAPI.GET_STATUS, async () => {
            try {
                return new MessageResponse(this.state);
            }
            catch (error) {
                return new MessageError(error);
            }
        });
    }

    /**
     * Get channel
     */
    public getChannel(): MessageBrokerChannel {
        return this.channel;
    }

    constructor(serviceName?: string) {
        this.serviceName = serviceName;
    }

    /**
     * Get current state
     */
    public getState(): ApplicationStates {
        return this.state;
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
            this.channel.request(['api-gateway', MessageAPI.UPDATE_STATUS].join('.'), res);
        }
    }
}

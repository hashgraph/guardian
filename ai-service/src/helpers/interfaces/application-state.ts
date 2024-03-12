import { Singleton } from '../decorators/singleton.js';
import { NatsService } from '../common/nats-service.js';
import { ApplicationStates } from '../../models/interfaces/applications-state.js';
import { GenerateUUIDv4 } from './generate-uuid-v4.js';
import { MessageAPI } from '../../models/interfaces/message-api.type.js';

/**
 * Application state container
 */
@Singleton
export class ApplicationState extends NatsService {
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
     * Current state
     * @private
     */
    private state: ApplicationStates;
    /**
     * Service name
     * @private
     */
    private serviceName: string;

    /**
     * Init
     */
    public async init(): Promise<void> {
        await super.init();
        await this.subscribe(MessageAPI.GET_STATUS, async () => {
            this.publish(MessageAPI.SEND_STATUS, {
                name: this.serviceName,
                state: this.state
            })
        });
    }

    /**
     * Set service name
     * @param serviceName
     */
    setServiceName(serviceName: string): ApplicationState {
        this.serviceName = serviceName
        return this;
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
            this.publish(MessageAPI.UPDATE_STATUS, res);
        }
    }
}

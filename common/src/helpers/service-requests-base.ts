import { MessageBrokerChannel } from '../mq';

/**
 * Service request base class
 */
export abstract class ServiceRequestsBase {
    /**
     * Message broker channel
     * @private
     */
    protected channel: MessageBrokerChannel;
    /**
     * Message broker target
     * @private
     */
    abstract readonly target: string;

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: MessageBrokerChannel) {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public getChannel(): MessageBrokerChannel {
        return this.channel;
    }

    /**
     * Request to guardian service method
     * @param entity
     * @param params
     * @param type
     */
    public async request<T extends any>(entity: string, params?: any, type?: string): Promise<T> {
        try {
            const response = await this.channel.request<any, T>(`${this.target}.${entity}`, params);
            if (!response) {
                throw new Error(`${this.target} server is not available`);
            }
            if (response.error) {
                throw new Error(response.error);
            }
            return response.body;
        } catch (error) {
            throw new Error(`Guardian (${entity}) send: ` + error);
        }
    }
}

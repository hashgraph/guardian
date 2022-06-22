import { MessageBrokerChannel } from "@guardian/common";

export abstract class ServiceRequestsBase {
    protected channel: MessageBrokerChannel;
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
                throw 'Server is not available';
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        } catch (error) {
            throw new Error(`Guardian (${entity}) send: ` + error);
        }
    }
}

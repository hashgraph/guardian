import { IMessageResponse } from 'interfaces';

export abstract class ServiceRequestsBase {
    protected channel: any;
    abstract readonly target: string;

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: any): any {
        this.channel = channel;
    }

    /**
     * Get channel
     */
    public getChannel(): any {
        return this.channel;
    }

    /**
     * Request to guardian service method
     * @param entity
     * @param params
     * @param type
     */
    public async request<T>(entity: string, params?: any, type?: string): Promise<T> {
        try {
            const response = await this.channel.request(this.target, entity, params, type);
            if (!response) {
                throw 'Server is not available';
            }
            const payload: IMessageResponse<T> = response.payload;
            if (payload.error) {
                throw payload.error;
            }
            return payload.body;
        } catch (e) {
            throw new Error(`Guardian (${entity}) send: ` + e);
        }
    }
}

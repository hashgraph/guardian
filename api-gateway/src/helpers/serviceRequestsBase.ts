import { IMessageResponse } from 'interfaces';

export abstract class ServiceRequestsBase {
    abstract readonly target: string;
    protected channel: any;

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
            const response: IMessageResponse<T> = (await this.channel.request(this.target, entity, params, type)).payload;
            if (!response) {
                throw 'Server is not available';
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        } catch (e) {
            throw new Error(`${this.target} (${entity}) send: ` + e);
        }
    }

    public async rawRequest(entity: string, params?: any, type?: string): Promise<any> {
        try {
            const response = (await this.channel.request(this.target, entity, params, type)).payload;
            if (!response) {
                throw 'Server is not available';
            }
            return response;
        } catch (e) {
            throw new Error(`Guardian (${entity}) send: ` + e);
        }
    }
}

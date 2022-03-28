import { IMessageResponse } from 'interfaces';

export class ServiceError extends Error {
    public code: number;
}

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
                throw {error: 'Server is not available'};
            }
            if (response.code !== 200) {
                throw response;
            }
            return response.body;
        } catch (e) {
            const err = new ServiceError(`${this.target} (${entity}) send: ` + e.error);
            err.code = e.code;
            throw err
        }
    }

    public async rawRequest(entity: string, params?: any, type?: string): Promise<any> {
        try {
            const response = (await this.channel.request(this.target, entity, params, type)).payload;
            if (!response) {
                throw {error: 'Server is not available'};
            }
            if (response.code !== 200) {
                throw response;
            }
            return response;
        } catch (e) {
            const err = new ServiceError(`${this.target} (${entity}) send: ` + e.error);
            err.code = e.code;
            throw err
        }
    }
}

import { MessageBrokerChannel, BinaryMessageResponse } from "@guardian/common";

export class ServiceError extends Error {
    public code: number;
}

export abstract class ServiceRequestsBase {
    abstract readonly target: string;
    protected channel: MessageBrokerChannel;

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: MessageBrokerChannel): any {
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
    public async request<T>(entity: string, params?: any): Promise<T> {
        try {
            const response = await this.channel.request<any, T>([this.target, entity].join('.'), params);
            if (!response) {
                throw { error: 'Server is not available' };
            }
            if (response.code !== 200) {
                throw response;
            }
            return response.body;
        } catch (error) {
            const err = new ServiceError(`${this.target} (${entity}) send: ` + error.error);
            err.code = error.code;
            throw err
        }
    }
    /**
     * Making the request that expect to recieved BinaryMessageResponse
     * @param entity
     * @param params
     * @returns
     */
    public async rawRequest(entity: string, params?: any): Promise<Buffer> {
        try {
            // Binary data will return as base64 string inbody
            const response = (await this.channel.request<any, string>([this.target, entity].join('.'), params,));
            if (!response) {
                throw { error: 'Server is not available' };
            }
            return Buffer.from(response.body, 'base64');
        } catch (error) {
            const err = new ServiceError(`${this.target} (${entity}) send: ` + error.error);
            err.code = error.code;
            throw err
        }
    }
}

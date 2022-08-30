import { IMessageResponse, MessageBrokerChannel } from '@guardian/common';

/**
 * Service error class
 */
export class ServiceError extends Error {
    /**
     * Error code
     */
    public readonly code: number;

    constructor(target: string, entity: string, message: string, code?: number) {
        super(`${target} (${entity}) send: ` + message);
        this.code = code;
    }
}

/**
 * Service requests base class
 */
export abstract class ServiceRequestsBase {
    /**
     * Messages target
     */
    abstract readonly target: string;
    /**
     * Message broker channel
     */
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
     */
    public async request<T>(entity: string, params?: unknown): Promise<T> {
        let response: IMessageResponse<T>;
        try {
            response = await this.channel.request<unknown, T>([this.target, entity].join('.'), params);
        } catch (error) {
            throw new ServiceError(this.target, entity, this.getErrorMessage(error), error.code);
        }
        if (!response) {
            throw new ServiceError(this.target, entity, 'Server is not available');
        }
        if (response.code !== 200) {
            throw new ServiceError(this.target, entity, response.error, response.code);
        }
        return response.body;
    }
    /**
     * Making the request that expect to recieved BinaryMessageResponse
     * @param entity
     * @param params
     * @returns
     */
    public async rawRequest(entity: string, params?: any): Promise<Buffer> {
        let response;
        try {
            // Binary data will return as base64 string inbody
            response = (await this.channel.request<any, string>([this.target, entity].join('.'), params));
        } catch (error) {
            throw new ServiceError(this.target, entity, this.getErrorMessage(error), error.code);
        }

        if (!response) {
            throw new ServiceError(this.target, entity, 'Server is not available');
        }
        return Buffer.from(response.body, 'base64');
    }

    /**
     * Get error message
     */
    private getErrorMessage(error: string | Error | any): string {
        if (typeof error === 'string') {
            return error;
        } else if (error.message) {
            return error.message;
        } else if (error.error) {
            return error.error;
        } else if (error.name) {
            return error.name;
        } else {
            console.log(error);
            return 'Unidentified error';
        }
    }
}

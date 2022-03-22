import { ILog, IPageParameters, LogType, MessageAPI, Singleton } from 'interfaces';
import { IMessageResponse } from 'interfaces';

@Singleton
export class Logger {
    private channel: any;
    private readonly target: string = "logger-service";

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
     * Request to logger service method
     * @param entity
     * @param params
     * @param type
     */
    public async request<T>(entity: string, params?: any, type?: string): Promise<T> {
        try {
            const response: IMessageResponse<T> = (await this.channel.request(this.target, entity, params, type)).payload;
            if (!response) {
                throw Error('Server is not available');
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        } catch (e) {
            console.error(e);
        }
    }



    private async write(type: LogType, message: string, attr?: string[]) {
        const logMessage: ILog = {
            message: message,
            type: type,
            attributes: attr
        } 
        await this.request(MessageAPI.WRITE_LOG, logMessage);
    }

    public async info(message: string, attr?: string[]): Promise<void> {
        await this.write(LogType.INFO, message, attr);
    }

    public async warn(message: string, attr?: string[]): Promise<void> {
        await this.write(LogType.WARN, message, attr);
    }

    public async error(message: string, attr?: string[]): Promise<void> {
        await this.write(LogType.ERROR, message, attr);
    }

    public async getLogs(filters?: any, pageParameters?: IPageParameters, sortDirection?: string): Promise<any> {
        return await this.request(MessageAPI.GET_LOGS, {
            filters, pageParameters, sortDirection
        });
    }

    public async getAttributes(name?: string): Promise<string[]> {
        return await this.request(MessageAPI.GET_ATTRIBUTES, { name });
    }
}
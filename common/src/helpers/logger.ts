import { ApplicationStates, ILog, IPageParameters, LogType, MessageAPI } from '@guardian/interfaces';
import { Singleton } from '../decorators/singleton';
import { IMessageResponse } from '../models/message-response';
import { MessageBrokerChannel } from '../mq';
import { createLogger, Logger as WinstonLogger, format } from 'winston';
import Transport from 'winston-transport';

/**
 * Logger transport class
 */
export class LoggerServiceTransport extends Transport {
    /**
     * Messages target name
     * @private
     */
    private readonly target: string = 'logger-service';

    /**
     * Message broker channel
     * @private
     */
    private channel: MessageBrokerChannel;

    constructor(opts) {
        super(opts);
    }

    /**
     * Set log function
     * @param info
     * @param callback
     */
    log(info, callback): void {
        this.request(MessageAPI.WRITE_LOG, info).then(() => {
            callback();
        });
    }

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
     * Request to logger service method
     * @param entity
     * @param params
     */
    public async request<T>(entity: string, params?: any): Promise<T> {
        try {
            const response: IMessageResponse<T> = await this.channel.request([this.target, entity].join('.'), params);
            if (!response) {
                throw Error('Server is not available');
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Get log messages
     * @param filters
     * @param pageParameters
     * @param sortDirection
     */
    public async getLogs(filters?: any, pageParameters?: IPageParameters, sortDirection?: string): Promise<any> {
        return await this.request(MessageAPI.GET_LOGS, {
            filters, pageParameters, sortDirection
        });
    }

    /**
     * Get attributes
     * @param name
     * @param existingAttributes
     */
    public async getAttributes(name?: string, existingAttributes: string[] = []): Promise<string[]> {
        return await this.request(MessageAPI.GET_ATTRIBUTES, { name, existingAttributes });
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        try {
            const res = await this.request(MessageAPI.GET_STATUS);
            if (!res) {
                throw new Error('Response is null');
            }

            return res as ApplicationStates;
        }
        catch {
            return ApplicationStates.STOPPED;
        }
    }
}

/**
 * Console transport
 */
export class ConsoleTransport extends Transport {
    /**
     * Set log function
     * @param info
     * @param callback
     */
    log(info, callback): void {
        let fn: Function;
        switch (info.type) {
            case LogType.INFO:
                fn = console.info;
                break;

            case LogType.WARN:
                fn = console.warn;
                break;

            case LogType.ERROR:
                fn = console.error;
                break;

            default:
                fn = console.log;
        }

        fn(`${new Date().toISOString()} [${info.attributes?.join(',')}]:`, info.message);

        callback();
    }
}

/**
 * Logger class
 */
@Singleton
export class Logger {
    /**
     * Logger instance
     * @private
     */
    private readonly loggerInstance: WinstonLogger;
    /**
     * Logger service transport
     * @private
     */
    private readonly messageTransport: LoggerServiceTransport;

    constructor() {
        this.messageTransport = new LoggerServiceTransport({format: format.json()});
        this.loggerInstance = createLogger({
            level: 'info',
            format: format.json(),
            transports: [
                new ConsoleTransport({format: format.json()}),
                this.messageTransport
            ]
        })
    }

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: MessageBrokerChannel): any {
        this.messageTransport.setChannel(channel);
    }

    /**
     * Get channel
     */
    public getChannel(): MessageBrokerChannel {
        return this.messageTransport.getChannel();
    }

    /**
     * Create info log message
     * @param message
     * @param attr
     * @param lvl
     */
    public async info(message: string, attr?: string[], lvl: number = 1): Promise<void> {
        this.loggerInstance.info({
            message,
            type: LogType.INFO,
            attributes: attr,
            level: lvl
        } as ILog);
    }

    /**
     * Create warning log message
     * @param message
     * @param attr
     * @param lvl
     */
    public async warn(message: string, attr?: string[], lvl: number = 1): Promise<void> {
        this.loggerInstance.warn({
            message,
            type: LogType.WARN,
            attributes: attr,
            level: lvl
        } as ILog);
    }

    /**
     * Create error log message
     * @param error
     * @param attr
     * @param lvl
     */
    public async error(error: string | Error, attr?: string[], lvl: number = 1): Promise<void> {
        const message = typeof error === 'string' ? error : error.stack;
        this.loggerInstance.error({
            message,
            type: LogType.ERROR,
            attributes: attr,
            level: lvl
        } as ILog);
    }

    /**
     * Get log messages
     * @param filters
     * @param pageParameters
     * @param sortDirection
     */
    public async getLogs(filters?: any, pageParameters?: IPageParameters, sortDirection?: string): Promise<any> {
        return await this.messageTransport.getLogs(filters, pageParameters, sortDirection);
    }

    /**
     * Get attributes
     * @param name
     * @param existingAttributes
     */
    public async getAttributes(name?: string, existingAttributes: string[] = []): Promise<string[]> {
        return await this.messageTransport.getAttributes(name, existingAttributes);
    }

    /**
     * Get service status
     *
     * @returns {ApplicationStates} Service state
     */
    public async getStatus(): Promise<ApplicationStates> {
        return await this.messageTransport.getStatus();
    }
}

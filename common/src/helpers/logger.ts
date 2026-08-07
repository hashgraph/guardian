import { ApplicationStates, GenerateUUIDv4, ILog, IPageParameters, LogType, MessageAPI } from '@guardian/interfaces';
import { Singleton } from '../decorators/singleton.js';
import { NatsService } from '../mq/index.js';

import { Writable } from 'node:stream';
import pino from 'pino';

import { ConsoleTransport } from './console-transport.js';

/**
 * Logger connection
 */
@Singleton
class LoggerConnection extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'logger-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'logger-queue-reply-' + GenerateUUIDv4();
}

/**
 * Logger transport class
 */
export class LoggerServiceTransport extends Writable {
    /**
     * Message broker channel
     * @private
     */
    private readonly channel: LoggerConnection;

    constructor(opts) {
        super({ ...opts, objectMode: true });
        this.channel = new LoggerConnection();
    }

    /**
     * Set log function
     * @param info
     * @param callback
     */
    log(info, callback): void {
        this.channel.publish(MessageAPI.WRITE_LOG, info);
        callback();
    }

    /**
     * Adapter for Pino
     * @param chunk
     * @param encoding
     * @param callback
     */
    _write(chunk, encoding, callback) {
        const info = JSON.parse(chunk.toString());
        this.log(info, callback);
    }

    /**
     * Register channel
     * @param channel
     */
    public setConnection(cn): any {
        this.channel.setConnection(cn).init();
    }

    /**
     * Request to logger service method
     * @param entity
     * @param params
     */
    public async request<T>(entity: string, params?: any): Promise<T> {
        try {
            const response: T = await this.channel.sendMessage(entity, params);
            if (!response) {
                throw Error('Server is not available');
            }
            return response;
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
 * Logger class
 */
@Singleton
export class Logger {
    /**
     * Logger instance
     * @private
     */
    private readonly loggerInstance;
    /**
     * Logger service transport
     * @private
     */
    private readonly messageTransport: LoggerServiceTransport;

    /**
     * Logger console transport
     * @private
     */
    private readonly consoleTransport: ConsoleTransport;

    constructor() {
        this.messageTransport = new LoggerServiceTransport({});
        this.consoleTransport = new ConsoleTransport({});

        const levelTypeMapping = [
            'error',
            'warn',
            'info',
            'http',
            'verbose',
            'debug',
            'silly',
        ];

        this.loggerInstance = pino({
            level: levelTypeMapping[process.env.LOG_LEVEL] || 'info',
            base: null,
            formatters: {
                level(label) {
                    return { level: label };
                },
                log(object) {
                    return { ...object };
                }
            },
            timestamp: () => `,"time":"${new Date().toISOString()}"`
        }, pino.multistream([
            { stream: this.consoleTransport },
            { stream: this.messageTransport },
        ]));
    }

    /**
     * Register channel
     * @param channel
     */
    public setConnection(cn): any {
        this.messageTransport.setConnection(cn);
    }

    /**
     * Create debug log message
     * @param message
     * @param attr
     * @param lvl
     */
    public async debug(message: string, attr?: string[], lvl: number = 1): Promise<void> {
        this.loggerInstance.debug({
            message,
            type: LogType.INFO,
            attributes: attr,
            level: lvl
        } as ILog);
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
        const message = !error ? 'Unknown error' : (typeof error === 'string' ? error : error.stack);
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

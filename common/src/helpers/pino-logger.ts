import pino from 'pino';

//transports
import { MongoTransport } from './mongo-transport.js';
import { PinoFileTransport } from './pino-file-transport.js';
import { ConsoleTransport } from './console-transport.js';
import { SeqTransport } from './seq-transport.js';

//decorators
import { Singleton } from '../decorators/singleton.js';

//types
import { LogType, PinoLogType } from '@guardian/interfaces';

export const levelTypeMapping: PinoLogType[] = [
    PinoLogType.INFO,
    PinoLogType.WARN,
    PinoLogType.ERROR,
];

export const MAP_TRANSPORTS: { [key: string]: any } = {
    CONSOLE: ConsoleTransport,
    MONGO: MongoTransport,
    FILE: PinoFileTransport,
    SEQ: SeqTransport,
}

interface LoggerOptions {
    logLevel: LogType;
    collectionName: string;
    transports: string;
    mapTransports: { [key: string]: any};
}

/**
 * Pino logger class
 */
@Singleton
export class PinoLogger {
    private options: LoggerOptions;
    private logLevel: LogType;
    private mapTransports: { [key: string]: any };
    private transports: string;
    private determinedTransports: (new (options: any) => any)[];
    private logger: pino.Logger;

    public init(options: LoggerOptions) {
        this.options = options;
        this.logLevel = options.logLevel;
        this.mapTransports = options.mapTransports;
        this.transports = options.transports;
        this.determinedTransports = this.determineTransports();
        this.logger = this.create();
        return this;
    }

    private determineTransports() {
        const arrayTransports = this.transports.split(',');
        const determinedTransports = [];

        for (const transport of arrayTransports) {
            const trimmedTransportsName = transport.trim();

            if (this.mapTransports[trimmedTransportsName]) {
                determinedTransports.push(this.mapTransports[trimmedTransportsName]);
            }
        }

        return determinedTransports;
    }

    private create() {
        const transportInstances = this.determinedTransports.map(TransportClass => new TransportClass(this.options));

        return pino({
            level: this.logLevel,
            base: null,
            formatters: {
                level(label) {
                    return { level: label };
                },
                log(object) {
                    return { ...object };
                }
            },
            timestamp: () => `,"time":"${new Date().toISOString()}"`,
        }, pino.multistream(transportInstances.map(transport => ({ stream: transport })), { dedupe: true }));
    }

    /**
     * Create debug log message
     * @param message
     * @param attributes
     */
    public async debug(message: string, attributes?: string[], level?: number,): Promise<void> {
        this.logger.debug({
            message,
            attributes,
        });
    }

    /**
     * Create info log message
     * @param message
     * @param attributes
     */
    public async info(message: string, attributes?: string[], level?: number,): Promise<void> {
        this.logger.info({
            message,
            attributes,
        });
    }

    /**
     * Create warning log message
     * @param message
     * @param attributes
     */
    public async warn(message: string, attributes?: string[], level?: number,): Promise<void> {
        this.logger.warn({
            message,
            attributes,
        });
    }

    /**
     * Create error log message
     * @param error
     * @param attributes
     */
    public async error(error: string | Error, attributes?: string[], level?: number,): Promise<void> {
        const message = !error ? 'Unknown error' : (typeof error === 'string' ? error : error.stack);
        this.logger.error({
            message,
            attributes,
        });
    }
}
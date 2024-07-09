import pino from 'pino';

//transports
import { MongoTransport } from './mongo-transport.js';
import { PinoFileTransport } from './pino-file-transport.js';
import { ConsoleTransport } from './logger.js';

//decorators
import { Singleton } from '../decorators/singleton.js';


enum LogType {
    TRACE = 'trace',
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal',
}

export const levelTypeMapping: LogType[] = [
    LogType.TRACE,
    LogType.DEBUG,
    LogType.INFO,
    LogType.WARN,
    LogType.ERROR,
    LogType.FATAL,
];


export const MAP_TRANSPORTS = {
    MONGO: MongoTransport,
    FILE: PinoFileTransport,
    CONSOLE: ConsoleTransport
}

@Singleton
export class PinoLogger {
    private options;
    private logLevel;
    private mapTransports;
    private transports;
    private determinedTransports;
    private logger;

    constructor(options: any) {
        this.options = options;
        this.logLevel = options.logLevel;
        this.mapTransports = options.mapTransports;
        this.transports = options.transports;
        this.determinedTransports = this.determineTransports();
        this.logger = this.create();
    }

    private determineTransports() {
        const arrayTransports = this.transports.split(',');
        const determinedTransports = [];

        for (const transport of arrayTransports) {
            if (this.mapTransports[transport.trim()]) {
                determinedTransports.push(this.mapTransports[transport.trim()]);
            }
        }

        return determinedTransports;
    }

    create() {
        const transportInstances = this.determinedTransports.map(TransportClass => new TransportClass(this.options));

        return pino({
            level: this.logLevel,
            base: null,
            formatters: {
                level(label) {
                    return { level: label };
                },
                log(object) {
                    return { ...object, attributes: object.trace };
                }
            },
            timestamp: () => `,"time":"${new Date().toISOString()}"`,
        }, pino.multistream(transportInstances.map(transport => ({ stream: transport })), { dedupe: true }));
    }

    log(message: any, trace: string[]) {
        this.logger.info({ trace, message });
    }

    error(message: any, trace: string[]) {
        this.logger.error({ trace, message });
    }

    warn(message: any, trace: string[]) {
        this.logger.warn({ trace, message });
    }

    debug(message: any, trace: string[]) {
        this.logger.debug({ trace, message });
    }

    verbose(message: any, trace: string[]) {
        this.logger.trace({ trace, message });
    }
}
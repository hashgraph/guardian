import { Writable } from 'node:stream';
import { Logger } from 'seq-logging';

interface SeqTransportOptions {
    seqUrl: string;
    apiKey?: string;
}

/**a
 * Seq transport
 */
export class SeqTransport extends Writable {
    private readonly logger: Logger;
    private readonly logLevelMap: Record<string, string>;

    constructor(options: SeqTransportOptions) {
        super({ objectMode: true });

        const loggerOptions: any = {
            serverUrl: options.seqUrl,
            onError: (e) => {
                console.error('Error in Seq logger:', e);
            }
        };

        if (options.apiKey?.trim() !== '') {
            loggerOptions.apiKey = options.apiKey;
        }

        this.logger = new Logger(loggerOptions);

        this.logLevelMap = {
            trace: 'Verbose',
            debug: 'Debug',
            info: 'Information',
            warn: 'Warning',
            error: 'Error',
            fatal: 'Fatal'
        };
    }

    /**
     * Send log to Seq
     * @param log
     * @param encoding
     * @param callback
     */
    async _write(log, encoding, callback) {
        try {
            const { level, time, message, attributes } = JSON.parse(log);

            const logEvent = {
                timestamp: time,
                level: this.logLevelMap[level],
                messageTemplate: `[${attributes.join(', ')}]: ${message}`,
                properties: {
                    level,
                    time,
                    attributes
                }
            };

            this.logger.emit(logEvent);

            callback();
        } catch (err) {
            console.error('Error writing log to Seq:', err);
            callback(err);
        }
    }

    /**
     * Close the logger when transport is finished
     */
    _final(callback) {
        this.logger.close();
        callback();
    }
}

import { Writable } from 'node:stream';

//types
import { LogType } from '@guardian/interfaces';

/**
 * Console transport
 */
export class ConsoleTransport extends Writable {

    constructor(opts) {
        super({ ...opts, objectMode: true });
    }

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
}
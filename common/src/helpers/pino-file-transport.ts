import pino from 'pino';
import path from 'node:path';
import { existsSync, mkdirSync, openSync } from 'node:fs';

interface PinoFileTransportOptions {
    filePath: string;
}

/**
 * PinoFileTransport
 */
export class PinoFileTransport {
    private readonly destination: pino.DestinationStream

    /**
     * Creates an instance of PinoFileTransport.
     * @param options
     */
    constructor(options: PinoFileTransportOptions) {
        this.ensureLogFileExists(options.filePath);
        this.destination = pino.destination({ dest: options.filePath, sync: false });
    }

    /**
     * Ensures that the log directory and file exist.
     * @param filePath
     */
    private ensureLogFileExists(filePath: string): void {
        const logDirectory = path.dirname(filePath);

        if (!existsSync(logDirectory)) {
            mkdirSync(logDirectory, { recursive: true });
        }

        if (!existsSync(filePath)) {
            openSync(filePath, 'a');
        }
    }

    /**
     * Writes a log to the file.
     * @param log
     */
    write(log: string): void {
        const logObject = JSON.parse(log);

        this.destination.write(JSON.stringify(logObject) + '\n')
    }
}
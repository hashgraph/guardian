import pino from 'pino';
import path from 'path';
import { existsSync, mkdirSync, openSync } from 'fs';

export class PinoFileTransport {
    private destination

    constructor(options) {
        this.ensureLogDirectoryExists(options.filePath);
        this.destination = pino.destination({ dest: options.filePath, sync: false });
    }

    private ensureLogDirectoryExists(filePath: string) {
        const logDirectory = path.dirname(filePath);

        if (!existsSync(logDirectory)) {
            mkdirSync(logDirectory, { recursive: true });
        }

        if (!existsSync(filePath)) {
            openSync(filePath, 'a');
        }
    }

    write(log) {
        const logObject = JSON.parse(log);

        this.destination.write(JSON.stringify(logObject) + '\n')
    }
}
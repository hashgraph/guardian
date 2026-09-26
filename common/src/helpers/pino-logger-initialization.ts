import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

import process from 'node:process';

//interfaces
import { PinoLogType } from '@guardian/interfaces';

//helpers
import { levelTypeMapping, MAP_TRANSPORTS, PinoLogger } from './pino-logger.js';

export function pinoLoggerInitialization(db: MikroORM<MongoDriver> | null) {
    const loggerOptions = {
        logLevel: levelTypeMapping[process.env.LOG_LEVEL] ?? PinoLogType.INFO,
        collectionName: process.env.DB_LOGGER_COLLECTION ?? 'log',
        filePath: process.env.LOG_FILE_PATH ?? './logs/app.log',
        client: db?.em.getDriver().getConnection().getDb(),
        // Fall back to console when TRANSPORTS is not set: with an empty value
        // pino.multistream([]) silently discards every log, which made debugging
        // local runs (no docker env file) impossible.
        transports: process.env.TRANSPORTS || 'CONSOLE',
        mapTransports: MAP_TRANSPORTS ?? [],
        seqUrl: process.env.SEQ_SERVER_URL,
        seqApiKey: process.env.SEQ_API_KEY,
    };

    return new PinoLogger().init(loggerOptions);
}
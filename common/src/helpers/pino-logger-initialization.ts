import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

import process from 'process';

//interfaces
import { PinoLogType } from '@guardian/interfaces';

//helpers
import { levelTypeMapping, MAP_TRANSPORTS, PinoLogger } from './pino-logger';

export async function pinoLoggerInitialization(db: MikroORM<MongoDriver> | null) {
    const loggerOptions = {
        logLevel: levelTypeMapping[process.env.LOG_LEVEL] ?? PinoLogType.INFO,
        collectionName: process.env.LOG_COLLECTION ?? 'log',
        filePath: process.env.LOG_FILE_PATH ?? './logs/app.log',
        client: db?.em.getDriver().getConnection().getDb(),
        transports: process.env.TRANSPORTS ?? '',
        mapTransports: MAP_TRANSPORTS ?? [],
        seqUrl: process.env.SEQ_URL,
    };

    return new PinoLogger(loggerOptions);
}
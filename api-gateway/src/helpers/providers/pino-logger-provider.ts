import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

import { PinoLogger, MAP_TRANSPORTS, levelTypeMapping } from '@guardian/common';

//constants
import { MONGO_PROVIDER } from '#constants';

//types
import { PinoLogType } from '@guardian/interfaces';

export const pinoLoggerProvider = {
    provide: PinoLogger,
    useFactory: async (db: MikroORM<MongoDriver>) => {
        const loggerOptions = {
            logLevel: levelTypeMapping[process.env.LOG_LEVEL] ?? PinoLogType.INFO,
            collectionName: process.env.LOG_COLLECTION ?? "log",
            filePath: process.env.LOG_FILE_PATH ?? './logs/app.log',
            client: db.em.getDriver().getConnection().getDb(),
            transports: process.env.TRANSPORTS ?? '',
            mapTransports: MAP_TRANSPORTS ?? []
        };

        return new PinoLogger(loggerOptions);
    },
    inject: [MONGO_PROVIDER],
};
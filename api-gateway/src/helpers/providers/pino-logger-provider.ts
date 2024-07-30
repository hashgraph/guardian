import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

import { PinoLogger, pinoLoggerInitialization } from '@guardian/common';

//constants
import { LOGGER_MONGO_PROVIDER } from '#constants';

export const pinoLoggerProvider = {
    provide: PinoLogger,
    useFactory: (db: MikroORM<MongoDriver>) => pinoLoggerInitialization(db),
    inject: [LOGGER_MONGO_PROVIDER],
};
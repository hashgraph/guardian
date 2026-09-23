import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import { pinoLoggerInitialization } from '@guardian/common/helpers/pino-logger-initialization';

//constants
import { LOGGER_MONGO_PROVIDER } from '#constants';

export const pinoLoggerProvider = {
    provide: PinoLogger,
    useFactory: (db: MikroORM<MongoDriver>) => pinoLoggerInitialization(db),
    inject: [LOGGER_MONGO_PROVIDER],
};
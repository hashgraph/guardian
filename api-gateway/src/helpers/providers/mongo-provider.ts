import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import process from 'process';

import { COMMON_CONNECTION_CONFIG } from '@guardian/common';

//constants
import { DEFAULT_MONGO, MONGO_PROVIDER } from '#constants';

export const mongoProvider = {
    provide: MONGO_PROVIDER,
    useFactory: async () => {
        return await MikroORM.init<MongoDriver>({
            ...COMMON_CONNECTION_CONFIG,
            driverOptions: {
                useUnifiedTopology: true,
                minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MONGO.MIN_POOL_SIZE, 10),
                maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT_MONGO.MAX_POOL_SIZE, 10),
                maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT_MONGO.MAX_IDLE_TIME_MS, 10),
            },
            ensureIndexes: true,
        });
    },
};
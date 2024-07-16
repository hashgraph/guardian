import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

import process from 'process';

//entities
import { entities } from '../index.js';

//helpers
import { DataBaseNamingStrategy } from '../helpers/index.js';

export const DEFAULT = {
    MIN_POOL_SIZE: '1',
    MAX_POOL_SIZE: '5',
    MAX_IDLE_TIME_MS: '30000',
};

export async function mongoLoggerInitialization(options: Record<string, any> = {}) {
    if (!process.env.DB_LOGGER_NAME) {
        return null;
    }

    return await MikroORM.init<MongoDriver>({
        driver: MongoDriver,
        namingStrategy: DataBaseNamingStrategy,
        dbName: process.env.DB_LOGGER_NAME,
        clientUrl: `mongodb://${process.env.DB_LOGGER_HOST}`,
        driverOptions: {
            useUnifiedTopology: true,
            minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT.MIN_POOL_SIZE, 10),
            maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT.MAX_POOL_SIZE, 10),
            maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT.MAX_IDLE_TIME_MS, 10),
        },
        ensureIndexes: true,
        entities,
        ...options
    });
}
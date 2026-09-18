import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

import process from 'node:process';

//entities
import { Log } from '../entity/log.js';

//helpers
import { DataBaseNamingStrategy } from './db-naming-strategy.js';
import fixConnectionString from './fix-connection-string.js';

export const DEFAULT = {
    MIN_POOL_SIZE: '1',
    MAX_POOL_SIZE: '5',
    MAX_IDLE_TIME_MS: '30000',
};

export async function mongoForLoggingInitialization(options: Record<string, any> = {}) {
    const isMongoTransport = process.env.TRANSPORTS?.includes('MONGO')

    if(process.env.DB_LOGGER_NAME && isMongoTransport) {
        return await MikroORM.init<MongoDriver>({
            driver: MongoDriver,
            namingStrategy: DataBaseNamingStrategy,
            dbName: process.env.DB_LOGGER_NAME,
            clientUrl: fixConnectionString(process.env.DB_LOGGER_HOST),
            driverOptions: {
                minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT.MIN_POOL_SIZE, 10),
                maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT.MAX_POOL_SIZE, 10),
                maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT.MAX_IDLE_TIME_MS, 10),
            },
            ensureIndexes: true,
            entities: [Log],
            ...options
        });
    }

    return null
}

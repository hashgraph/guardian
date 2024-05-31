import { MongoDriver } from '@mikro-orm/mongodb';
import { DataBaseNamingStrategy } from './db-naming-strategy.js';

/**
 * Common connection config
 */
export const COMMON_CONNECTION_CONFIG: any = {
    driver: MongoDriver,
    namingStrategy: DataBaseNamingStrategy,
    dbName: (process.env.GUARDIAN_ENV || (process.env.HEDERA_NET !== process.env.PREUSED_HEDERA_NET)) ?
        `${process.env.GUARDIAN_ENV}_${process.env.HEDERA_NET}_${process.env.DB_DATABASE}` :
        process.env.DB_DATABASE,
    clientUrl: `mongodb://${process.env.DB_HOST}`,
    entities: [
        'dist/entity/*.js'
    ]
};
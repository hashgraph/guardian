import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Migrator } from '@mikro-orm/migrations-mongodb';
import process from 'node:process';

const DEFAULT_MIN_POOL_SIZE = '1';
const DEFAULT_MAX_POOL_SIZE = '5';
const DEFAULT_MAX_IDLE_TIME_MS = '30000';
const RADIX = 10;

/**
 * Define migration process
 * @param initConfig Config
 */
export async function Migration(initConfig: any, migrations?: string[]) {
    const orm = await MikroORM.init<MongoDriver>({
      ...initConfig,
      extensions: [Migrator],
      driverOptions: {
          minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MIN_POOL_SIZE, RADIX),
          maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT_MAX_POOL_SIZE, RADIX),
          maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT_MAX_IDLE_TIME_MS, RADIX),
      },
    });

    const migrator = orm.getMigrator();
    const executedMigrations = await migrator.getExecutedMigrations();
    const executeOldMigrations = async (name: string) => {
        if (!executedMigrations.some((migration) => migration.name === name)) {
            await migrator.up(name);
        }
    };
    if (migrations) {
        for (const name of migrations) {
            await executeOldMigrations(name);
        }
    }
    await migrator.up();
    return orm;
};

import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Migrator } from '@mikro-orm/migrations-mongodb';
import process from 'node:process';
import { withMigrationLock } from './migration-lock.js';

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
      // Never build indexes during init(): MikroORM.init() runs ensureIndexes()
      // itself before returning, outside the migration lock and against
      // pre-migration data, so a unique-index build races across replicas and
      // throws E11000 on not-yet-deduped rows. Force it off here (overriding
      // whatever the caller passed) and build the indexes inside the lock,
      // after the backfill migrations have run.
      ensureIndexes: false,
      extensions: [Migrator],
      driverOptions: {
          minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MIN_POOL_SIZE, RADIX),
          maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT_MAX_POOL_SIZE, RADIX),
          maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT_MAX_IDLE_TIME_MS, RADIX),
      },
    });

    // Serialize migrations across replicas so concurrent runs can't insert
    // duplicate rows before a unique index exists.
    const db = orm.em.getDriver().getConnection().getDb();
    await withMigrationLock(db, async () => {
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

        // Build indexes now that the backfill migrations have deduped the data,
        // still under the lock so unique-index creation is serialized across
        // replicas. Idempotent: re-creating an existing index is a no-op.
        await orm.getSchemaGenerator().ensureIndexes();
    });
    return orm;
};

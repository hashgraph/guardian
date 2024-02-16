import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

/**
 * Define migration process
 * @param initConfig Config
 */
export async function Migration(initConfig: any, migrations?: string[]) {
    const orm = await MikroORM.init<MongoDriver>(initConfig);
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
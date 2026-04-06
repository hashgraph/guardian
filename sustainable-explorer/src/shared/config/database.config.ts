import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { Client } from 'pg';

/**
 * Resolves the database name based on GUARDIAN_ENV, HEDERA_NET, and DB_DATABASE.
 * If GUARDIAN_ENV is set, the database name follows the pattern:
 *   {GUARDIAN_ENV}_{HEDERA_NET}_{DB_DATABASE}
 * Otherwise, the raw DB_DATABASE value is used.
 */
function resolveDatabaseName(): string {
    const guardianEnv = process.env.GUARDIAN_ENV || '';
    const hederaNet = process.env.HEDERA_NET || 'testnet';
    const dbDatabase = process.env.DB_DATABASE || 'sustainable_explorer';

    if (guardianEnv) {
        return `${guardianEnv}_${hederaNet}_${dbDatabase}`;
    }
    return dbDatabase;
}

/**
 * Determines the TypeORM logging level based on LOG_LEVEL env var.
 */
function resolveLogging(): DataSourceOptions['logging'] {
    const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
    switch (logLevel) {
        case 'debug':
            return 'all';
        case 'info':
            return ['error', 'warn', 'info', 'migration'];
        case 'warn':
            return ['error', 'warn'];
        case 'error':
            return ['error'];
        default:
            return ['error', 'warn'];
    }
}

/**
 * Ensures the target database exists by connecting to the default 'postgres'
 * database and issuing CREATE DATABASE IF NOT EXISTS.
 */
export async function ensureDatabaseExists(): Promise<void> {
    const dbName = resolveDatabaseName();
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'explorer',
        password: process.env.DB_PASSWORD || 'explorer_password',
        database: 'postgres',
    });

    try {
        await client.connect();
        const result = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName],
        );
        if (result.rowCount === 0) {
            console.log(`Database "${dbName}" does not exist, creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database "${dbName}" created successfully`);
        } else {
            console.log(`Database "${dbName}" already exists`);
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to ensure database "${dbName}" exists: ${message}`);
        throw error;
    } finally {
        await client.end();
    }

    // Ensure required extensions + TypeORM metadata table exist in the target database
    const targetClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'explorer',
        password: process.env.DB_PASSWORD || 'explorer_password',
        database: dbName,
    });
    try {
        await targetClient.connect();
        await targetClient.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
        // TypeORM expects this metadata table for tracking generated/view columns.
        // Create it pre-emptively so synchronize doesn't fail when we have
        // externally-managed generated columns (tsvector, etc.).
        await targetClient.query(`
            CREATE TABLE IF NOT EXISTS typeorm_metadata (
                type varchar NOT NULL,
                database varchar,
                schema varchar,
                "table" varchar,
                name varchar,
                value text
            )
        `);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to setup extensions/metadata: ${message}`);
    } finally {
        await targetClient.end();
    }
}

/**
 * Returns TypeORM DataSource options for the Sustainable Explorer database.
 *
 * @param options.synchronize Override the default. The worker uses `true` to
 *   manage schema. The API should use `false` since it only reads.
 */
export function getDatabaseConfig(options: { synchronize?: boolean } = {}): TypeOrmModuleOptions {
    const envSync = process.env.DB_SYNCHRONIZE;
    const synchronize = options.synchronize ?? (envSync === undefined ? true : envSync === 'true');

    return {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'explorer',
        password: process.env.DB_PASSWORD || 'explorer_password',
        database: resolveDatabaseName(),
        entities: [join(__dirname, '..', 'entities', '*.{ts,js}')],
        migrations: [join(__dirname, '..', '..', '..', 'dist', 'db', 'migrations', '*.js')],
        synchronize,
        logging: resolveLogging(),
        extra: {
            min: parseInt(process.env.DB_POOL_MIN || '2', 10),
            max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        },
    };
}

/**
 * TypeORM DataSource options for CLI usage (migrations, etc.).
 */
export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'explorer',
    password: process.env.DB_PASSWORD || 'explorer_password',
    database: resolveDatabaseName(),
    entities: [join(__dirname, '..', 'entities', '*.{ts,js}')],
    migrations: [join(__dirname, '..', '..', '..', 'dist', 'db', 'migrations', '*.js')],
    synchronize: false,
    logging: resolveLogging(),
};

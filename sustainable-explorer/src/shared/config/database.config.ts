import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { Client } from 'pg';

/**
 * Resolves the database name for a specific Hedera network.
 * Pattern: `{GUARDIAN_ENV}_{network}_{DB_DATABASE}` when GUARDIAN_ENV is set,
 * otherwise `{network}_{DB_DATABASE}`.
 */
export function resolveDatabaseName(network?: string): string {
    const guardianEnv = process.env.GUARDIAN_ENV || '';
    const net = (network || process.env.HEDERA_NET || 'testnet').toLowerCase();
    const dbDatabase = process.env.DB_DATABASE || 'sustainable_explorer';

    if (guardianEnv) {
        return `${guardianEnv}_${net}_${dbDatabase}`;
    }
    return `${net}_${dbDatabase}`;
}

/**
 * Parses HEDERA_NETWORKS env var (comma-separated), or falls back to HEDERA_NET.
 */
export function getConfiguredNetworks(): string[] {
    const raw = process.env.HEDERA_NETWORKS || process.env.HEDERA_NET || 'testnet';
    return raw
        .split(',')
        .map(n => n.trim().toLowerCase())
        .filter(n => n.length > 0);
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
 * Creates (if missing) a single database for the given network and ensures
 * required extensions + TypeORM metadata tables exist.
 */
export async function ensureDatabaseExistsForNetwork(network?: string): Promise<void> {
    const dbName = resolveDatabaseName(network);

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

    // Extensions + TypeORM metadata table for generated/view columns
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
        console.error(`Failed to setup extensions/metadata for ${dbName}: ${message}`);
    } finally {
        await targetClient.end();
    }
}

/**
 * Ensures all configured network databases exist.
 * Used by the API, which needs DBs for every network in HEDERA_NETWORKS.
 */
export async function ensureAllNetworkDatabasesExist(): Promise<void> {
    for (const network of getConfiguredNetworks()) {
        await ensureDatabaseExistsForNetwork(network);
    }
}

/**
 * Backwards-compatible single-network bootstrap. Used by the worker, which
 * only deals with its own HEDERA_NET.
 */
export async function ensureDatabaseExists(): Promise<void> {
    await ensureDatabaseExistsForNetwork(process.env.HEDERA_NET);
}

/**
 * Returns TypeORM DataSource options for a specific network's database.
 *
 * @param network Target network (defaults to HEDERA_NET)
 * @param options.synchronize Override the default sync behaviour
 */
export function getDatabaseConfig(
    network?: string,
    options: { synchronize?: boolean } = {},
): TypeOrmModuleOptions {
    const envSync = process.env.DB_SYNCHRONIZE;
    const synchronize = options.synchronize ?? (envSync === undefined ? true : envSync === 'true');

    return {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'explorer',
        password: process.env.DB_PASSWORD || 'explorer_password',
        database: resolveDatabaseName(network),
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

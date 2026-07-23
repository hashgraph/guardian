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

// ─── System database helpers ────────────────────────────────────────────────
// The system DB is a SEPARATE database on the SAME PostgreSQL server as the
// per-network databases. It stores cross-network data (users, API keys,
// refresh tokens, rate-limit requests, dashboards, quick-filters).
//
// Naming pattern mirrors resolveDatabaseName but substitutes 'system' for
// the network segment:
//   {GUARDIAN_ENV}_system_{DB_DATABASE}   when GUARDIAN_ENV is set
//   system_{DB_DATABASE}                  when GUARDIAN_ENV is empty
// An explicit DB_SYSTEM_NAME env var overrides the computed name entirely.
//
// DB_SYNCHRONIZE is INTENTIONALLY IGNORED for the system DB regardless of its
// value. Credential tables are created/evolved only via the idempotent
// system-schema bootstrap (synchronize:false hard-forced), mirroring the
// project's existing schema-bootstrap.ts pattern.

/**
 * Resolves the system database name.
 *
 * Priority:
 *  1. DB_SYSTEM_NAME env var (verbatim, after trim)
 *  2. `{GUARDIAN_ENV}_system_{DB_DATABASE}` when GUARDIAN_ENV is set
 *  3. `system_{DB_DATABASE}` when GUARDIAN_ENV is empty
 *
 * Mirrors resolveDatabaseName's GUARDIAN_ENV / DB_DATABASE handling but
 * uses the fixed segment 'system' instead of a network name.
 */
export function getSystemDatabaseName(): string {
    const guardianEnv = process.env.GUARDIAN_ENV || '';
    const dbDatabase = process.env.DB_DATABASE || 'sustainable_explorer';
    const override = process.env.DB_SYSTEM_NAME?.trim();
    if (override) {
        return override;
    }
    return guardianEnv ? `${guardianEnv}_system_${dbDatabase}` : `system_${dbDatabase}`;
}

/**
 * Returns TypeORM module options for the system database.
 *
 * synchronize is HARD-FORCED to false regardless of the DB_SYNCHRONIZE
 * environment variable. Credential tables are created/evolved only via
 * bootstrapSystemSchema (idempotent raw SQL run at boot), never by synchronize.
 *
 * Entities glob targets src/shared/entities/auth/ — a subdirectory that is
 * intentionally separate from the per-network entity glob so the two
 * DataSources never load each other's entities.
 */
export function getSystemDatabaseConfig(): TypeOrmModuleOptions {
    // DB_SYNCHRONIZE is NOT read here — synchronize is unconditionally false;
    // credential tables are bootstrap-controlled.
    return {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'explorer',
        password: process.env.DB_PASSWORD || 'explorer_password',
        database: getSystemDatabaseName(),
        entities: [join(__dirname, '..', 'entities', 'auth', '*.{ts,js}')],
        synchronize: false,
        logging: resolveLogging(),
        extra: {
            min: parseInt(process.env.DB_POOL_MIN || '2', 10),
            max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        },
    };
}

/**
 * Creates (if missing) the system database and ensures required extensions +
 * TypeORM metadata tables exist.
 *
 * Structural clone of ensureDatabaseExistsForNetwork with dbName fixed to
 * getSystemDatabaseName(). Uses the same two-client pattern, env fallbacks,
 * and error-handling wording. citext is NOT created here — it is installed
 * by the first auth migration (keeping parity with the per-network helper
 * which only provisions pg_trgm).
 */
export async function ensureSystemDatabaseExists(): Promise<void> {
    const dbName = getSystemDatabaseName();

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

    // Extensions + TypeORM metadata table for the system DB.
    // citext is NOT created here — it is handled by bootstrapSystemSchema.
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

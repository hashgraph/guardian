import {
    Global,
    Module,
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { DataSource, DataSourceOptions, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { getSystemDatabaseConfig } from '@shared/config/database.config';

/**
 * Holds the single TypeORM DataSource for the system (auth/identity) database.
 *
 * The system DB is cross-network: users, API keys, refresh tokens, and dashboards
 * live here — not in the per-network databases managed by NetworkDataSourceRegistry.
 * Lifecycle mirrors NetworkDataSourceRegistry (same Logger / try-catch /
 * isInitialized idiom), differing only in being singular (one DataSource, no
 * networks map). Init failures are logged and swallowed; getDataSource() throws
 * if it's called before the connection is ready.
 */
@Injectable()
export class SystemDataSource implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SystemDataSource.name);

    // Nullable: null before init and after destroy.
    // getDataSource() enforces the not-null invariant with a plain Error (not
    // NotFoundException — a missing system DS is a server-side fault, not a
    // client 404).
    private dataSource: DataSource | null = null;

    async onModuleInit(): Promise<void> {
        try {
            // synchronize:false is forced — the schema is owned by bootstrapSystemSchema.
            const config = getSystemDatabaseConfig() as DataSourceOptions;
            const ds = new DataSource(config);
            await ds.initialize();
            this.dataSource = ds;
            this.logger.log('Initialized system DataSource');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to initialize system DataSource: ${message}`);
            // Swallowed — getDataSource() throws if the connection never came up.
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            if (this.dataSource && this.dataSource.isInitialized) {
                await this.dataSource.destroy();
            }
            this.logger.log('Destroyed system DataSource');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to destroy system DataSource: ${message}`);
        }
        this.dataSource = null;
    }

    /**
     * Returns the live system DataSource.
     *
     * Throws a plain Error (NOT NotFoundException) when called before
     * onModuleInit completes or after onModuleDestroy — a missing system
     * DataSource is a server-side invariant violation, not a client 404.
     */
    getDataSource(): DataSource {
        if (!this.dataSource || !this.dataSource.isInitialized) {
            throw new Error('System DataSource is not initialized');
        }
        return this.dataSource;
    }

    /**
     * Returns a typed TypeORM Repository for the given entity.
     *
     * Routes through getDataSource() so the uninitialized guard is enforced
     * in a single place.
     *
     * Signature uses TypeORM 0.3.x generics:
     *   EntityTarget<Entity> + ObjectLiteral constraint (required by typeorm 0.3.28).
     */
    getRepository<Entity extends ObjectLiteral>(
        entity: EntityTarget<Entity>,
    ): Repository<Entity> {
        return this.getDataSource().getRepository(entity);
    }
}

/**
 * Normalises the result of a raw `UPDATE`/`DELETE ... RETURNING` run via
 * TypeORM 0.3.x's `query()` on the postgres driver, which returns a
 * `[rows, affectedCount]` TUPLE rather than the plain rows array you get from
 * `SELECT` / `INSERT ... RETURNING`. Reading `result[0].col` then silently
 * yields undefined and `result.length` is `2` even on a no-match (this broke
 * email verification — userId came back undefined → 401 + a burned single-use
 * token). Returns the actual RETURNING rows for BOTH shapes, so callers do
 * `returningRows<T>(result)[0]?.col` and gate on the value, never on `.length`.
 *
 * Co-located with SystemDataSource (every caller already imports from here).
 */
export function returningRows<T = Record<string, unknown>>(result: unknown): T[] {
    const arr = result as unknown[];
    if (!Array.isArray(arr)) return [];
    // Tuple shape from UPDATE/DELETE ... RETURNING → rows live at index 0.
    if (Array.isArray(arr[0])) return arr[0] as T[];
    // Plain rows array (SELECT / INSERT ... RETURNING).
    return arr as T[];
}

/**
 * Global module exposing the single system (auth/identity) DataSource.
 *
 * Marked @Global so SystemDataSource is injectable from ANY module (AuthModule,
 * AdminModule, AccountModule) without each one importing a provider module. A
 * plain provider in ApiModule would NOT be visible to imported feature modules —
 * module providers are encapsulated and an imported module cannot see its
 * importer's providers — which is exactly the resolution that auth/admin
 * services need. One instance, one connection, app-wide.
 */
@Global()
@Module({
    providers: [SystemDataSource],
    exports: [SystemDataSource],
})
export class SystemDatabaseModule {}

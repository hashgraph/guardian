import { Injectable, Logger, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { getDatabaseConfig, getConfiguredNetworks } from '@shared/config/database.config';

/**
 * Holds one TypeORM DataSource per configured Hedera network.
 * Resolved at request time via the `network` path parameter.
 */
@Injectable()
export class NetworkDataSourceRegistry implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NetworkDataSourceRegistry.name);
    private readonly dataSources = new Map<string, DataSource>();
    private readonly networks: string[];

    constructor() {
        this.networks = getConfiguredNetworks();
    }

    async onModuleInit(): Promise<void> {
        for (const network of this.networks) {
            try {
                const config = getDatabaseConfig(network, { synchronize: false }) as DataSourceOptions;
                const ds = new DataSource(config);
                await ds.initialize();
                this.dataSources.set(network, ds);
                this.logger.log(`Initialized DataSource for network "${network}"`);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to initialize DataSource for "${network}": ${message}`);
            }
        }
    }

    async onModuleDestroy(): Promise<void> {
        for (const [network, ds] of this.dataSources.entries()) {
            try {
                if (ds.isInitialized) await ds.destroy();
                this.logger.log(`Destroyed DataSource for network "${network}"`);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to destroy DataSource for "${network}": ${message}`);
            }
        }
        this.dataSources.clear();
    }

    /**
     * Returns the DataSource for the given network, or throws 404 if
     * the network is not configured.
     */
    getDataSource(network: string): DataSource {
        const ds = this.dataSources.get(network.toLowerCase());
        if (!ds || !ds.isInitialized) {
            throw new NotFoundException(
                `Network "${network}" is not configured. Available: ${this.networks.join(', ')}`,
            );
        }
        return ds;
    }

    /**
     * Returns the first configured network (used as default when no
     * network is specified).
     */
    getDefaultNetwork(): string {
        return this.networks[0];
    }

    /**
     * Returns all configured networks.
     */
    getAvailableNetworks(): string[] {
        return [...this.networks];
    }
}

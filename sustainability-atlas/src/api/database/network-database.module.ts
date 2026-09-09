import { Global, Module } from '@nestjs/common';
import { NetworkDataSourceRegistry } from './network-datasource.registry';

/**
 * Global module exposing NetworkDataSourceRegistry app-wide.
 *
 * Marked @Global so the registry is injectable from ANY module (e.g.
 * NotificationsModule) without each one importing a provider module -- mirrors
 * SystemDatabaseModule's @Global pattern for the exact same reason: a plain
 * provider in ApiModule would NOT be visible to imported feature modules,
 * since module providers are encapsulated.
 */
@Global()
@Module({
    providers: [NetworkDataSourceRegistry],
    exports: [NetworkDataSourceRegistry],
})
export class NetworkDatabaseModule {}

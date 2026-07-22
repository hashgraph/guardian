#!/usr/bin/env npx tsx
/**
 * One-off schema bootstrap for a single network's database — the same two
 * steps `src/worker/main.ts` runs at startup (TypeORM synchronize, then
 * bootstrapSchema's post-sync raw SQL), extracted so a network's schema can
 * be created WITHOUT running the full sync worker. No Guardian data sync
 * happens — this only creates empty tables/indexes.
 *
 * Use this when a network is listed in HEDERA_NETWORKS but its database was
 * never actually synced (e.g. only mainnet was restored from a dump
 * locally, but testnet is also configured) — the API process assumes every
 * configured network's schema already exists; it doesn't bootstrap it
 * itself (only the worker/guardian-sync processes call bootstrapSchema).
 *
 * Usage:
 *   npx tsx scripts/bootstrap-network-schema.ts <network>
 *
 * Example:
 *   npx tsx scripts/bootstrap-network-schema.ts testnet
 */
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { getDatabaseConfig, ensureDatabaseExistsForNetwork } from '../src/shared/config/database.config';
import { bootstrapSchema } from '../src/shared/database/schema-bootstrap';

async function run(): Promise<void> {
    const network = process.argv[2];
    if (!network) {
        console.error('Usage: npx tsx scripts/bootstrap-network-schema.ts <network>');
        process.exitCode = 1;
        return;
    }

    console.log(`Ensuring database exists for "${network}"...`);
    await ensureDatabaseExistsForNetwork(network);

    console.log('Connecting (this triggers TypeORM synchronize — creates entity-backed tables like business_view)...');
    const ds = new DataSource(getDatabaseConfig(network) as DataSourceOptions);
    await ds.initialize();

    try {
        console.log('Running bootstrapSchema (project_mint_link, notification_watermarks, tsvector/GIN/trigram indexes)...');
        await bootstrapSchema(ds);
        console.log(`\n✅ Schema bootstrap complete for "${network}".`);
    } finally {
        await ds.destroy();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

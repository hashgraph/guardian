import { Migration } from '@mikro-orm/migrations-mongodb';
import path from 'node:path';
import * as fs from 'node:fs';
import { IwaVersion } from '@guardian/interfaces';

/**
 * Migration to version 3.7.0
 *
 * Introduces IWA dMRV v3 support:
 *  - tags every existing policy property and schema as IWA v1
 *  - seeds the v3 property namespace alongside the v1 one
 *
 * Existing schemas keep their v1 properties because a published schema's field
 * properties are frozen on IPFS and cannot be rewritten.
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.tagExistingPropertiesAsV1();
        await this.importV3Properties();
        await this.tagExistingSchemasAsV1();
    }

    /**
     * Everything seeded before this release is IWA v1.
     */
    async tagExistingPropertiesAsV1() {
        const collection = this.getCollection('policy_property');
        await collection.updateMany(
            { iwaVersion: { $exists: false } },
            { $set: { iwaVersion: IwaVersion.V1 } }
        );
    }

    /**
     * Seed the IWA v3 property namespace.
     *
     * Each row is guarded by a lookup so re-running the migration cannot
     * duplicate it — unlike importProperties() in v2-18-0, which inserts
     * unconditionally.
     */
    async importV3Properties() {
        const collection = this.getCollection('policy_property');
        const filePath = path.join(
            process.cwd(), 'src', 'migrations', 'artifacts', 'policy-properties-v3.csv'
        );
        const data = await fs.promises.readFile(filePath, 'utf8');

        for (const row of data.split('\n')) {
            if (!row.trim()) {
                continue;
            }
            const columns = row.split(',');
            if (columns.length !== 2 || !columns[0]) {
                continue;
            }
            const title = columns[0].trim();
            const value = columns[1].trim();
            const existing = await collection.findOne({ title, iwaVersion: IwaVersion.V3 });
            if (!existing) {
                await collection.insertOne({ title, value, iwaVersion: IwaVersion.V3 });
            }
        }
    }

    /**
     * Every schema that predates this release authored its field properties
     * against IWA v1.
     */
    async tagExistingSchemasAsV1() {
        const collection = this.getCollection('schema');
        await collection.updateMany(
            { iwaVersion: { $exists: false } },
            { $set: { iwaVersion: IwaVersion.V1 } }
        );
    }
}

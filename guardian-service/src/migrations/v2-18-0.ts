import { Migration } from '@mikro-orm/migrations-mongodb';
import path from 'path';
import * as fs from 'fs';

/**
 * Migration to version 2.17.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.importProperties();
    }

    /**
     * Import properties
     */
    async importProperties() {

        const propertiesCollection = this.getCollection('policy_property');
        const filePath = path.join(process.cwd(), 'src', 'migrations', 'artifacts', 'policy-properties.csv');
        const data = await fs.promises.readFile(filePath, 'utf8');
        const rows = data.split('\n');

        for (const row of rows) {
            if (row) {
                const columns = row.split(',');
                if (columns.length === 2 && columns[0]) {
                    await propertiesCollection.insertOne({
                        title: columns[0],
                        value: columns[1]
                    });

                }
            }
        }
    }
}

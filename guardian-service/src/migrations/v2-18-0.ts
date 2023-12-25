import { GetPropertiesFromFile } from '@guardian/common';
import { Migration } from '@mikro-orm/migrations-mongodb';

import * as dotenv from 'dotenv';
dotenv.config();

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

        const policyProperties = await GetPropertiesFromFile(process.env.POLICY_PROPERTIES_FILE_PATH);

        for (const policyProperty of policyProperties) {
            await propertiesCollection.insertOne({
                title: policyProperty.title,
                value: policyProperty.value
            });
        }
    }
}

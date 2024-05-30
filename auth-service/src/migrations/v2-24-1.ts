import { DefaultRoles, GenerateUUIDv4 } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.9.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.setDefaultRoles();
    }

    /**
     * Change document state format
     */
    async setDefaultRoles() {
        const roleCollection = this.getCollection('DynamicRole');
        await roleCollection.insertOne({
            uuid: GenerateUUIDv4(),
            name: 'Default policy user',
            description: 'Default policy user',
            owner: null,
            permissions: DefaultRoles,
            default: true,
            readonly: true
        });
    }
}

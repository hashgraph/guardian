import { DefaultRoles, GenerateUUIDv4, UserRole } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.25.1
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
        const userCollection = this.getCollection('User');
        const srs = userCollection.find({ role: UserRole.STANDARD_REGISTRY }, { session: this.ctx });
        while (await srs.hasNext()) {
            const sr = await srs.next();
            const defaultRole = await roleCollection.findOne({ owner: sr.did, default: true }, { session: this.ctx });
            await roleCollection.insertMany([{
                uuid: GenerateUUIDv4(),
                name: 'Default policy user',
                description: 'Default policy user',
                owner: sr.did,
                permissions: DefaultRoles,
                default: !defaultRole
            }], { session: this.ctx });
        }
    }
}

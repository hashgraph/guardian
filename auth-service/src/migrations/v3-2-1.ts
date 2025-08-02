import { UserRole } from '@guardian/interfaces';
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
        const parentPermissionsCollection = this.getCollection('ParentPermissions');
        const userCollection = this.getCollection('User');
        const users = userCollection.find({ role: UserRole.USER }, { session: this.ctx });
        while (await users.hasNext()) {
            const user = await users.next();
            if (user.parent && !user.parents) {
                user.parents = [user.parent];

                await parentPermissionsCollection.insertOne({
                    username: user.username,
                    parent: user.parent,
                    permissionsGroup: user.permissionsGroup,
                    permissions: user.permissions
                }, { session: this.ctx });
            }
        }
    }
}

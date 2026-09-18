import { Permissions, UserRole } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

const TEMPLATE_PERMISSIONS = [
    Permissions.TEMPLATES_TEMPLATE_READ,
    Permissions.TEMPLATES_TEMPLATE_CREATE,
    Permissions.TEMPLATES_TEMPLATE_UPDATE,
    Permissions.TEMPLATES_TEMPLATE_DELETE,
    Permissions.TEMPLATES_TEMPLATE_REVIEW
];

/**
 * Migration to version 3.6.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.addSchemaTemplatePermissions();
    }

    /**
     * Add Schema Template permissions to existing Standard Registry users.
     */
    async addSchemaTemplatePermissions(): Promise<void> {
        const userCollection = this.getCollection('User');

        await userCollection.updateMany(
            { role: UserRole.STANDARD_REGISTRY },
            {
                $addToSet: {
                    permissions: {
                        $each: TEMPLATE_PERMISSIONS
                    }
                }
            },
            { session: this.ctx }
        );
    }
}

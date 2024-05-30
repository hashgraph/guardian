import { DefaultRoles, GenerateUUIDv4, Permissions, OldRoles, UserRole } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

const policyApprover = [
    Permissions.ANALYTIC_POLICY_READ,
    Permissions.POLICIES_POLICY_READ,
    Permissions.ANALYTIC_MODULE_READ,
    Permissions.ANALYTIC_TOOL_READ,
    Permissions.ANALYTIC_SCHEMA_READ,
    Permissions.POLICIES_POLICY_REVIEW,
    Permissions.SCHEMAS_SCHEMA_READ,
    Permissions.MODULES_MODULE_READ,
    Permissions.TOOLS_TOOL_READ,
    Permissions.TOKENS_TOKEN_READ,
    Permissions.ARTIFACTS_FILE_READ,
    Permissions.SETTINGS_THEME_READ,
    Permissions.SETTINGS_THEME_CREATE,
    Permissions.SETTINGS_THEME_UPDATE,
    Permissions.SETTINGS_THEME_DELETE,
    Permissions.TAGS_TAG_READ,
    Permissions.TAGS_TAG_CREATE,
    Permissions.SUGGESTIONS_SUGGESTIONS_READ,
    Permissions.ACCESS_POLICY_ASSIGNED
];
const policyManager = [
    Permissions.ANALYTIC_DOCUMENT_READ,
    Permissions.POLICIES_POLICY_MANAGE,
    Permissions.POLICIES_POLICY_READ,
    Permissions.TOKENS_TOKEN_MANAGE,
    Permissions.TOKENS_TOKEN_READ,
    Permissions.ACCOUNTS_ACCOUNT_READ,
    Permissions.TAGS_TAG_READ,
    Permissions.TAGS_TAG_CREATE,
    Permissions.ACCESS_POLICY_ASSIGNED_AND_PUBLISHED
];

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
        const userCollection = this.getCollection('User');

        await roleCollection.insertOne({
            uuid: GenerateUUIDv4(),
            name: 'Default policy user',
            description: 'Default policy user',
            owner: null,
            permissions: DefaultRoles,
            default: true,
            readonly: true
        });
        const srs = userCollection.find({ role: UserRole.STANDARD_REGISTRY }, { session: this.ctx });
        while (await srs.hasNext()) {
            const sr = await srs.next();

            const oldRoleUUID = GenerateUUIDv4();
            await roleCollection.insertMany([{
                uuid: GenerateUUIDv4(),
                name: 'Policy Approver',
                description: '',
                owner: sr.did,
                permissions: policyApprover,
                default: false,
                readonly: false
            }, {
                uuid: GenerateUUIDv4(),
                name: 'Policy Manager',
                description: '',
                owner: sr.did,
                permissions: policyManager,
                default: false,
                readonly: false
            }, {
                uuid: GenerateUUIDv4(),
                name: 'Policy User',
                description: '',
                owner: sr.did,
                permissions: DefaultRoles,
                default: false,
                readonly: false
            }, {
                uuid: oldRoleUUID,
                name: 'Old Policy User',
                description: '',
                owner: sr.did,
                permissions: OldRoles,
                default: false,
                readonly: false
            }
            ], { session: this.ctx });
            const oldRole = await roleCollection.findOne({
                uuid: oldRoleUUID,
                owner: sr.did
            }, { session: this.ctx });

            const children = userCollection.find({ role: UserRole.USER, parent: sr.did }, { session: this.ctx });
            while (await children.hasNext()) {
                const child = await children.next();
                await userCollection.updateOne(
                    { _id: child._id },
                    {
                        $set: {
                            permissionsGroup: [{
                                roleId: String(oldRole._id),
                                roleName: oldRole.name,
                                owner: oldRole.owner
                            }],
                            permissions: oldRole.permissions,
                        },
                    },
                    { session: this.ctx, upsert: false }
                );
            }
        }
    }
}

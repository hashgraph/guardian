import { PermissionActions, PermissionCategories, PermissionEntities } from "@guardian/interfaces";

export class PermissionsUtils {
    public static categoryNames = new Map<string, string>([
        ['ACCOUNTS', 'Accounts'],
        ['SESSION', 'Session'],
        ['PROFILES', 'Profiles'],
        ['ANALYTIC', 'Analytic'],
        ['ARTIFACTS', 'Artifacts'],
        ['POLICIES', 'Policies'],
        ['BRANDING', 'Branding'],
        ['CONTRACTS', 'Contracts'],
        ['DEMO', 'Demo'],
        ['IPFS', 'IPFS'],
        ['LOG', 'Logs'],
        ['MODULES', 'Modules'],
        ['SETTINGS', 'Settings'],
        ['SUGGESTIONS', 'Suggestions'],
        ['TAGS', 'Tags'],
        ['SCHEMAS', 'Schemas'],
        ['TOKENS', 'Tokens'],
        ['AUDIT', 'Audit'],
        ['TOOLS', 'Tools'],
        ['PERMISSIONS', 'Permissions'],
        ['ACCESS', 'Access']
    ])

    public static entityNames = new Map<string, string>([
        ['ACCOUNT', 'Account'],
        ['STANDARD_REGISTRY', 'Standard Registry'],
        ['USER', 'User'],
        ['BALANCE', 'Balance'],
        ['RESTORE', 'Restore'],
        ['RECORD', 'Record'],
        ['POLICY', 'Policy'],
        ['TOOL', 'Tool'],
        ['DOCUMENT', 'Document'],
        ['SCHEMA', 'Schema'],
        ['MODULE', 'Module'],
        ['FILE', 'File'],
        ['CONFIG', 'Config'],
        ['CONTRACT', 'Contract'],
        ['WIPE_REQUEST', 'Wipe Request'],
        ['WIPE_ADMIN', 'Wipe Admin'],
        ['WIPE_MANAGER', 'Wipe Manager'],
        ['WIPER', 'Wiper'],
        ['POOL', 'Pool'],
        ['RETIRE_REQUEST', 'Retire Request'],
        ['RETIRE_ADMIN', 'Retire Admin'],
        ['PERMISSIONS', 'Permissions'],
        ['KEY', 'Key'],
        ['LOG', 'Log'],
        ['MIGRATION', 'Migration'],
        ['SETTINGS', 'Settings'],
        ['SUGGESTIONS', 'Suggestions'],
        ['TAG', 'Tag'],
        ['SYSTEM_SCHEMA', 'System Schema'],
        ['THEME', 'Theme'],
        ['TOKEN', 'Token'],
        ['TRUST_CHAIN', 'Trust Chain'],
        ['ROLE', 'Role']
    ])

    public static actionIndexes = new Map<string, number>([
        ['READ', 0],
        ['CREATE', 1],
        ['UPDATE', 2],
        ['DELETE', 3],
        ['REVIEW', 4],
        ['EXECUTE', 5],
        ['MANAGE', 6],
        ['ASSOCIATE', 7],

        ['ALL', -1],
        ['AUDIT', -1],
    ])

    public static parsePermissions(permissions: {
        name: Permissions;
        category: PermissionCategories;
        entity: PermissionEntities;
        action: PermissionActions;
        disabled: boolean;
        default: boolean;
    }[]) {
        const _controls = new Map<string, any>();

        const categories = new Map<string, any>();
        for (const permission of permissions) {
            if (!categories.has(permission.category)) {
                categories.set(permission.category, {
                    id: permission.category,
                    name: PermissionsUtils.categoryNames.get(permission.category),
                    entities: new Map<string, any>()
                })
            }
            const entities = categories.get(permission.category).entities;
            if (!entities.has(permission.entity)) {
                entities.set(permission.entity, {
                    name: PermissionsUtils.entityNames.get(permission.entity),
                    actions: new Array(7)
                })
            }


            const actions = entities.get(permission.entity).actions;
            const index = PermissionsUtils.actionIndexes.get(permission.action) as number;
            const formControl = {};
            if (permission.category === PermissionCategories.ACCESS) {
                actions.length = 3;
                if (permission.action === PermissionActions.ASSIGNED) {
                    actions[0] = formControl;
                }
                if (permission.action === PermissionActions.PUBLISHED) {
                    actions[1] = formControl;
                }
                if (permission.action === PermissionActions.ALL) {
                    actions[2] = formControl;
                }
            } else if (index === -1) {
                actions.length = 1;
                actions[0] = formControl
            } else if (Number.isFinite(index)) {
                actions[index] = formControl;
            }
            _controls.set(String(permission.name), formControl);
        }

        const _categories = [];
        for (const category of categories.values()) {
            const entities: any[] = [];
            for (const entity of category.entities.values()) {
                entities.push({
                    name: entity.name,
                    actions: entity.actions,
                })
            }
            let actions = (category.id === PermissionCategories.ACCESS) ? [
                'Assigned',
                'Published',
                'All',
            ] : [
                'Read',
                'Create',
                'Update',
                'Delete',
                'Review',
                'Execute',
                'Manage'
            ]
            _categories.push({
                name: category.name,
                actions,
                entities
            });
        }
        return {
            controls: _controls,
            categories: _categories
        }
    }
}
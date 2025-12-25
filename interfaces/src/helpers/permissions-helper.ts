import { LocationType, Permissions, UserRole } from '../type/index.js';

/**
 * Permissions helper
 */
export class UserCategory {
    public static isStandardRegistry(role: UserRole): boolean {
        return role === UserRole.STANDARD_REGISTRY;
    }

    public static isUser(role: UserRole): boolean {
        return role === UserRole.USER;
    }

    public static isAudit(role: UserRole): boolean {
        return role === UserRole.AUDITOR;
    }
}

/**
 * User Permissions
 */
export class UserPermissions {
    public readonly username: string;
    public readonly did: string;
    public readonly parent: string;
    public readonly role: string;
    public readonly permissions: string[];
    public readonly permissionsGroup: string[];
    public readonly location: LocationType;

    constructor(user?: any) {
        if (user) {
            this.username = user.username;
            this.did = user.did;
            this.parent = user.parent;
            this.role = user.role;
            this.permissions = user.permissions || [];
            this.permissionsGroup = user.permissionsGroup;
            this.location = user.location;
        } else {
            this.permissions = [];
            this.location = LocationType.LOCAL;
        }
    }

    public static has(user: any, permissions: Permissions | Permissions[]): boolean {
        if (Array.isArray(permissions)) {
            if (user && user.permissions) {
                for (const permission of permissions) {
                    if (user.permissions.indexOf(permission) !== -1) {
                        return true;
                    }
                }
            }
        } else {
            if (user && user.permissions) {
                if (user.permissions.indexOf(permissions) !== -1) {
                    return true;
                }
            }
        }
        return false;
    }

    public get STANDARD_REGISTRY(): boolean {
        return this.role === UserRole.STANDARD_REGISTRY;
    }

    public get USER(): boolean {
        return this.role === UserRole.USER;
    }

    public get AUDITOR(): boolean {
        return this.role === UserRole.AUDITOR;
    }

    private check(permission: Permissions): boolean {
        return this.permissions.indexOf(permission) !== -1;
    }

    //ANALYTIC
    public get ANALYTIC_POLICY_READ(): boolean {
        return this.check(Permissions.ANALYTIC_POLICY_READ);
    }

    public get ANALYTIC_MODULE_READ(): boolean {
        return this.check(Permissions.ANALYTIC_MODULE_READ);
    }

    public get ANALYTIC_TOOL_READ(): boolean {
        return this.check(Permissions.ANALYTIC_TOOL_READ);
    }

    public get ANALYTIC_SCHEMA_READ(): boolean {
        return this.check(Permissions.ANALYTIC_SCHEMA_READ);
    }

    public get ANALYTIC_DOCUMENT_READ(): boolean {
        return this.check(Permissions.ANALYTIC_DOCUMENT_READ);
    }

    //ARTIFACT
    public get ARTIFACTS_FILE_READ(): boolean {
        return this.check(Permissions.ARTIFACTS_FILE_READ);
    }

    public get ARTIFACTS_FILE_CREATE(): boolean {
        return this.check(Permissions.ARTIFACTS_FILE_CREATE);
    }

    public get ARTIFACTS_FILE_DELETE(): boolean {
        return this.check(Permissions.ARTIFACTS_FILE_DELETE);
    }

    //BRANDING
    public get BRANDING_CONFIG_UPDATE(): boolean {
        return this.check(Permissions.BRANDING_CONFIG_UPDATE);
    }

    //CONTRACT
    public get CONTRACTS_CONTRACT_READ(): boolean {
        return this.check(Permissions.CONTRACTS_CONTRACT_READ);
    }

    public get CONTRACTS_CONTRACT_EXECUTE(): boolean {
        return this.check(Permissions.CONTRACTS_CONTRACT_EXECUTE);
    }

    public get CONTRACTS_CONTRACT_MANAGE(): boolean {
        return this.check(Permissions.CONTRACTS_CONTRACT_MANAGE);
    }

    public get CONTRACTS_CONTRACT_CREATE(): boolean {
        return this.check(Permissions.CONTRACTS_CONTRACT_CREATE);
    }

    public get CONTRACTS_CONTRACT_DELETE(): boolean {
        return this.check(Permissions.CONTRACTS_CONTRACT_DELETE);
    }

    public get CONTRACTS_WIPE_REQUEST_READ(): boolean {
        return this.check(Permissions.CONTRACTS_WIPE_REQUEST_READ);
    }

    public get CONTRACTS_WIPE_REQUEST_UPDATE(): boolean {
        return this.check(Permissions.CONTRACTS_WIPE_REQUEST_UPDATE);
    }

    public get CONTRACTS_WIPE_REQUEST_REVIEW(): boolean {
        return this.check(Permissions.CONTRACTS_WIPE_REQUEST_REVIEW);
    }

    public get CONTRACTS_WIPE_REQUEST_DELETE(): boolean {
        return this.check(Permissions.CONTRACTS_WIPE_REQUEST_DELETE);
    }

    public get CONTRACTS_WIPE_ADMIN_CREATE(): boolean {
        return this.check(Permissions.CONTRACTS_WIPE_ADMIN_CREATE);
    }

    public get CONTRACTS_WIPE_ADMIN_DELETE(): boolean {
        return this.check(Permissions.CONTRACTS_WIPE_ADMIN_DELETE);
    }

    public get CONTRACTS_WIPE_MANAGER_CREATE(): boolean {
        return this.check(Permissions.CONTRACTS_WIPE_MANAGER_CREATE);
    }

    public get CONTRACTS_WIPE_MANAGER_DELETE(): boolean {
        return this.check(Permissions.CONTRACTS_WIPE_MANAGER_DELETE);
    }

    public get CONTRACTS_WIPER_CREATE(): boolean {
        return this.check(Permissions.CONTRACTS_WIPER_CREATE);
    }

    public get CONTRACTS_WIPER_DELETE(): boolean {
        return this.check(Permissions.CONTRACTS_WIPER_DELETE);
    }

    public get CONTRACTS_POOL_READ(): boolean {
        return this.check(Permissions.CONTRACTS_POOL_READ);
    }

    public get CONTRACTS_POOL_UPDATE(): boolean {
        return this.check(Permissions.CONTRACTS_POOL_UPDATE);
    }

    public get CONTRACTS_POOL_DELETE(): boolean {
        return this.check(Permissions.CONTRACTS_POOL_DELETE);
    }

    public get CONTRACTS_RETIRE_REQUEST_READ(): boolean {
        return this.check(Permissions.CONTRACTS_RETIRE_REQUEST_READ);
    }

    public get CONTRACTS_RETIRE_REQUEST_CREATE(): boolean {
        return this.check(Permissions.CONTRACTS_RETIRE_REQUEST_CREATE);
    }

    public get CONTRACTS_RETIRE_REQUEST_DELETE(): boolean {
        return this.check(Permissions.CONTRACTS_RETIRE_REQUEST_DELETE);
    }

    public get CONTRACTS_RETIRE_REQUEST_REVIEW(): boolean {
        return this.check(Permissions.CONTRACTS_RETIRE_REQUEST_REVIEW);
    }

    public get CONTRACTS_RETIRE_ADMIN_CREATE(): boolean {
        return this.check(Permissions.CONTRACTS_RETIRE_ADMIN_CREATE);
    }

    public get CONTRACTS_RETIRE_ADMIN_DELETE(): boolean {
        return this.check(Permissions.CONTRACTS_RETIRE_ADMIN_DELETE);
    }

    public get CONTRACTS_PERMISSIONS_READ(): boolean {
        return this.check(Permissions.CONTRACTS_PERMISSIONS_READ);
    }

    public get CONTRACTS_DOCUMENT_READ(): boolean {
        return this.check(Permissions.CONTRACTS_DOCUMENT_READ);
    }

    //DEMO
    public get DEMO_KEY_CREATE(): boolean {
        return this.check(Permissions.DEMO_KEY_CREATE);
    }

    //IPFS
    public get IPFS_FILE_READ(): boolean {
        return this.check(Permissions.IPFS_FILE_READ);
    }

    public get IPFS_FILE_CREATE(): boolean {
        return this.check(Permissions.IPFS_FILE_CREATE);
    }

    //LOG
    public get LOG_LOG_READ(): boolean {
        return this.check(Permissions.LOG_LOG_READ);
    }

    //MODULE
    public get MODULES_MODULE_READ(): boolean {
        return this.check(Permissions.MODULES_MODULE_READ);
    }

    public get MODULES_MODULE_CREATE(): boolean {
        return this.check(Permissions.MODULES_MODULE_CREATE);
    }

    public get MODULES_MODULE_UPDATE(): boolean {
        return this.check(Permissions.MODULES_MODULE_UPDATE);
    }

    public get MODULES_MODULE_DELETE(): boolean {
        return this.check(Permissions.MODULES_MODULE_DELETE);
    }

    public get MODULES_MODULE_REVIEW(): boolean {
        return this.check(Permissions.MODULES_MODULE_REVIEW);
    }

    //POLICY
    public get POLICIES_POLICY_READ(): boolean {
        return this.check(Permissions.POLICIES_POLICY_READ);
    }

    public get POLICIES_POLICY_CREATE(): boolean {
        return this.check(Permissions.POLICIES_POLICY_CREATE);
    }

    public get POLICIES_POLICY_UPDATE(): boolean {
        return this.check(Permissions.POLICIES_POLICY_UPDATE);
    }

    public get POLICIES_POLICY_DELETE(): boolean {
        return this.check(Permissions.POLICIES_POLICY_DELETE);
    }

    public get POLICIES_POLICY_REVIEW(): boolean {
        return this.check(Permissions.POLICIES_POLICY_REVIEW);
    }

    public get POLICIES_POLICY_EXECUTE(): boolean {
        return this.check(Permissions.POLICIES_POLICY_EXECUTE);
    }

    public get POLICIES_MIGRATION_CREATE(): boolean {
        return this.check(Permissions.POLICIES_MIGRATION_CREATE);
    }

    public get POLICIES_RECORD_ALL(): boolean {
        return this.check(Permissions.POLICIES_RECORD_ALL);
    }

    public get POLICIES_POLICY_MANAGE(): boolean {
        return this.check(Permissions.POLICIES_POLICY_MANAGE);
    }

    public get POLICIES_POLICY_AUDIT(): boolean {
        return this.check(Permissions.POLICIES_POLICY_AUDIT);
    }

    public get POLICIES_POLICY_TAG(): boolean {
        return this.check(Permissions.POLICIES_POLICY_TAG);
    }

    //SCHEMAS
    public get SCHEMAS_SCHEMA_READ(): boolean {
        return this.check(Permissions.SCHEMAS_SCHEMA_READ);
    }

    public get SCHEMAS_SCHEMA_CREATE(): boolean {
        return this.check(Permissions.SCHEMAS_SCHEMA_CREATE);
    }

    public get SCHEMAS_SCHEMA_UPDATE(): boolean {
        return this.check(Permissions.SCHEMAS_SCHEMA_UPDATE);
    }

    public get SCHEMAS_SCHEMA_DELETE(): boolean {
        return this.check(Permissions.SCHEMAS_SCHEMA_DELETE);
    }

    public get SCHEMAS_SCHEMA_REVIEW(): boolean {
        return this.check(Permissions.SCHEMAS_SCHEMA_REVIEW);
    }

    public get SCHEMAS_SYSTEM_SCHEMA_READ(): boolean {
        return this.check(Permissions.SCHEMAS_SYSTEM_SCHEMA_READ);
    }

    public get SCHEMAS_SYSTEM_SCHEMA_CREATE(): boolean {
        return this.check(Permissions.SCHEMAS_SYSTEM_SCHEMA_CREATE);
    }

    public get SCHEMAS_SYSTEM_SCHEMA_UPDATE(): boolean {
        return this.check(Permissions.SCHEMAS_SYSTEM_SCHEMA_UPDATE);
    }

    public get SCHEMAS_SYSTEM_SCHEMA_DELETE(): boolean {
        return this.check(Permissions.SCHEMAS_SYSTEM_SCHEMA_DELETE);
    }

    public get SCHEMAS_SYSTEM_SCHEMA_REVIEW(): boolean {
        return this.check(Permissions.SCHEMAS_SYSTEM_SCHEMA_REVIEW);
    }

    //TOOLS
    public get TOOLS_TOOL_READ(): boolean {
        return this.check(Permissions.TOOLS_TOOL_READ);
    }

    public get TOOLS_TOOL_CREATE(): boolean {
        return this.check(Permissions.TOOLS_TOOL_CREATE);
    }

    public get TOOLS_TOOL_UPDATE(): boolean {
        return this.check(Permissions.TOOLS_TOOL_UPDATE);
    }

    public get TOOLS_TOOL_DELETE(): boolean {
        return this.check(Permissions.TOOLS_TOOL_DELETE);
    }

    public get TOOLS_TOOL_REVIEW(): boolean {
        return this.check(Permissions.TOOLS_TOOL_REVIEW);
    }

    public get TOOL_MIGRATION_CREATE(): boolean {
        return this.check(Permissions.TOOL_MIGRATION_CREATE);
    }

    //TOKENS
    public get TOKENS_TOKEN_READ(): boolean {
        return this.check(Permissions.TOKENS_TOKEN_READ);
    }

    public get TOKENS_TOKEN_CREATE(): boolean {
        return this.check(Permissions.TOKENS_TOKEN_CREATE);
    }

    public get TOKENS_TOKEN_UPDATE(): boolean {
        return this.check(Permissions.TOKENS_TOKEN_UPDATE);
    }

    public get TOKENS_TOKEN_DELETE(): boolean {
        return this.check(Permissions.TOKENS_TOKEN_DELETE);
    }

    public get TOKENS_TOKEN_EXECUTE(): boolean {
        return this.check(Permissions.TOKENS_TOKEN_EXECUTE);
    }

    public get TOKENS_TOKEN_MANAGE(): boolean {
        return this.check(Permissions.TOKENS_TOKEN_MANAGE);
    }

    //TAGS
    public get TAGS_TAG_READ(): boolean {
        return this.check(Permissions.TAGS_TAG_READ);
    }

    public get TAGS_TAG_CREATE(): boolean {
        return this.check(Permissions.TAGS_TAG_CREATE);
    }

    //PROFILE
    public get PROFILES_USER_READ(): boolean {
        return this.check(Permissions.PROFILES_USER_READ);
    }

    public get PROFILES_USER_UPDATE(): boolean {
        return this.check(Permissions.PROFILES_USER_UPDATE);
    }

    public get PROFILES_BALANCE_READ(): boolean {
        return this.check(Permissions.PROFILES_BALANCE_READ);
    }

    public get PROFILES_RESTORE_ALL(): boolean {
        return this.check(Permissions.PROFILES_RESTORE_ALL);
    }

    //SUGGESTIONS
    public get SUGGESTIONS_SUGGESTIONS_READ(): boolean {
        return this.check(Permissions.SUGGESTIONS_SUGGESTIONS_READ);
    }

    public get SUGGESTIONS_SUGGESTIONS_UPDATE(): boolean {
        return this.check(Permissions.SUGGESTIONS_SUGGESTIONS_UPDATE);
    }

    //SETTINGS
    public get SETTINGS_SETTINGS_READ(): boolean {
        return this.check(Permissions.SETTINGS_SETTINGS_READ);
    }

    public get SETTINGS_SETTINGS_UPDATE(): boolean {
        return this.check(Permissions.SETTINGS_SETTINGS_UPDATE);
    }

    public get SETTINGS_THEME_READ(): boolean {
        return this.check(Permissions.SETTINGS_THEME_READ);
    }

    public get SETTINGS_THEME_CREATE(): boolean {
        return this.check(Permissions.SETTINGS_THEME_CREATE);
    }

    public get SETTINGS_THEME_UPDATE(): boolean {
        return this.check(Permissions.SETTINGS_THEME_UPDATE);
    }

    public get SETTINGS_THEME_DELETE(): boolean {
        return this.check(Permissions.SETTINGS_THEME_DELETE);
    }

    //PERMISSIONS
    public get PERMISSIONS_ROLE_READ(): boolean {
        return this.check(Permissions.PERMISSIONS_ROLE_READ);
    }

    public get PERMISSIONS_ROLE_CREATE(): boolean {
        return this.check(Permissions.PERMISSIONS_ROLE_CREATE);
    }

    public get PERMISSIONS_ROLE_UPDATE(): boolean {
        return this.check(Permissions.PERMISSIONS_ROLE_UPDATE);
    }

    public get PERMISSIONS_ROLE_DELETE(): boolean {
        return this.check(Permissions.PERMISSIONS_ROLE_DELETE);
    }

    public get PERMISSIONS_ROLE_MANAGE(): boolean {
        return this.check(Permissions.PERMISSIONS_ROLE_MANAGE);
    }

    //ACCESS
    public get ACCESS_POLICY_ASSIGNED(): boolean {
        return this.check(Permissions.ACCESS_POLICY_ASSIGNED);
    }

    public get ACCESS_POLICY_PUBLISHED(): boolean {
        return this.check(Permissions.ACCESS_POLICY_PUBLISHED);
    }

    public get ACCESS_POLICY_ASSIGNED_AND_PUBLISHED(): boolean {
        return this.check(Permissions.ACCESS_POLICY_ASSIGNED_AND_PUBLISHED);
    }

    public get ACCESS_POLICY_ASSIGNED_OR_PUBLISHED(): boolean {
        return (
            this.check(Permissions.ACCESS_POLICY_ASSIGNED) &&
            this.check(Permissions.ACCESS_POLICY_PUBLISHED)
        );
    }

    public get ACCESS_POLICY_ALL(): boolean {
        return this.check(Permissions.ACCESS_POLICY_ALL);
    }

    //DELEGATION
    public get DELEGATION_ROLE_MANAGE(): boolean {
        return this.check(Permissions.DELEGATION_ROLE_MANAGE);
    }

    //STATISTICS
    public get STATISTICS_STATISTIC_CREATE(): boolean {
        return this.check(Permissions.STATISTICS_STATISTIC_CREATE);
    }

    public get STATISTICS_STATISTIC_READ(): boolean {
        return this.check(Permissions.STATISTICS_STATISTIC_READ);
    }

    //SCHEMA RULES
    public get SCHEMAS_RULE_CREATE(): boolean {
        return this.check(Permissions.SCHEMAS_RULE_CREATE);
    }

    public get SCHEMAS_RULE_READ(): boolean {
        return this.check(Permissions.SCHEMAS_RULE_READ);
    }

    public get SCHEMAS_RULE_EXECUTE(): boolean {
        return this.check(Permissions.SCHEMAS_RULE_EXECUTE);
    }

    //SCHEMA LABELS
    public get STATISTICS_LABEL_CREATE(): boolean {
        return this.check(Permissions.STATISTICS_LABEL_CREATE);
    }

    public get STATISTICS_LABEL_READ(): boolean {
        return this.check(Permissions.STATISTICS_LABEL_READ);
    }

    //SCHEMA FORMULAS
    public get FORMULAS_FORMULA_CREATE(): boolean {
        return this.check(Permissions.FORMULAS_FORMULA_CREATE);
    }

    public get FORMULAS_FORMULA_READ(): boolean {
        return this.check(Permissions.FORMULAS_FORMULA_READ);
    }

    //EXTERNAL POLICY
    public get POLICIES_EXTERNAL_POLICY_READ(): boolean {
        return this.check(Permissions.POLICIES_EXTERNAL_POLICY_READ);
    }

    public get POLICIES_EXTERNAL_POLICY_CREATE(): boolean {
        return this.check(Permissions.POLICIES_EXTERNAL_POLICY_CREATE);
    }

    public get POLICIES_EXTERNAL_POLICY_DELETE(): boolean {
        return this.check(Permissions.POLICIES_EXTERNAL_POLICY_DELETE);
    }

    public get POLICIES_EXTERNAL_POLICY_UPDATE(): boolean {
        return this.check(Permissions.POLICIES_EXTERNAL_POLICY_UPDATE);
    }

    public static isPolicyAdmin(user: any): boolean {
        return (
            UserPermissions.has(user, Permissions.POLICIES_MIGRATION_CREATE) ||
            UserPermissions.has(user, Permissions.POLICIES_POLICY_CREATE) ||
            UserPermissions.has(user, Permissions.POLICIES_POLICY_UPDATE) ||
            UserPermissions.has(user, Permissions.POLICIES_POLICY_DELETE) ||
            UserPermissions.has(user, Permissions.POLICIES_POLICY_REVIEW)
        )
    }
}
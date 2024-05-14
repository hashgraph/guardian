import { UserRole } from './user-role.type.js';

/**
 * Category
 */
export enum PermissionCategories {
    ACCOUNTS = 'ACCOUNTS',
    SESSION = 'SESSION',
    PROFILES = 'PROFILES',
    ANALYTIC = 'ANALYTIC',
    ARTIFACTS = 'ARTIFACTS',
    POLICIES = 'POLICIES',
    BRANDING = 'BRANDING',
    CONTRACTS = 'CONTRACTS',
    DEMO = 'DEMO',
    IPFS = 'IPFS',
    LOG = 'LOG',
    MODULES = 'MODULES',
    SETTINGS = 'SETTINGS',
    SUGGESTIONS = 'SUGGESTIONS',
    TAGS = 'TAGS',
    SCHEMAS = 'SCHEMAS',
    TOKENS = 'TOKENS',
    AUDIT = 'AUDIT',
    TOOLS = 'TOOLS',
    PERMISSIONS = 'PERMISSIONS'
}

/**
 * Entity
 */
export enum PermissionEntities {
    ACCOUNT = 'ACCOUNT',
    STANDARD_REGISTRY = 'STANDARD_REGISTRY',
    USER = 'USER',
    BALANCE = 'BALANCE',
    RESTORE = 'RESTORE',
    RECORD = 'RECORD',
    POLICY = 'POLICY',
    TOOL = 'TOOL',
    DOCUMENT = 'DOCUMENT',
    SCHEMA = 'SCHEMA',
    MODULE = 'MODULE',
    FILE = 'FILE',
    CONFIG = 'CONFIG',
    CONTRACT = 'CONTRACT',
    WIPE_REQUEST = 'WIPE_REQUEST',
    WIPE_ADMIN = 'WIPE_ADMIN',
    WIPE_MANAGER = 'WIPE_MANAGER',
    WIPER = 'WIPER',
    POOL = 'POOL',
    RETIRE_REQUEST = 'RETIRE_REQUEST',
    RETIRE_ADMIN = 'RETIRE_ADMIN',
    PERMISSIONS = 'PERMISSIONS',
    KEY = 'KEY',
    LOG = 'LOG',
    MIGRATION = 'MIGRATION',
    SETTINGS = 'SETTINGS',
    SUGGESTIONS = 'SUGGESTIONS',
    TAG = 'TAG',
    SYSTEM_SCHEMA = 'SYSTEM_SCHEMA',
    THEME = 'THEME',
    TOKEN = 'TOKEN',
    TRUST_CHAIN = 'TRUST_CHAIN',
    ROLE = 'ROLE'
}

/**
 * Entity
 */
export enum PermissionActions {
    READ = 'READ',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    REVIEW = 'REVIEW',
    EXECUTE = 'EXECUTE',
    //
    ALL = 'ALL',
    AUDIT = 'AUDIT',
    ASSOCIATE = 'ASSOCIATE',
    MANAGE = 'MANAGE'
}

/**
 * Permissions
 * name: Category_Entity_Action
 */
export enum Permissions {
    //ACCOUNT
    ACCOUNTS_ACCOUNT_READ = 'ACCOUNTS_ACCOUNT_READ',
    ACCOUNTS_STANDARD_REGISTRY_READ = 'ACCOUNTS_STANDARD_REGISTRY_READ',
    //ANALYTIC
    ANALYTIC_POLICY_READ = 'ANALYTIC_POLICY_READ',
    ANALYTIC_MODULE_READ = 'ANALYTIC_MODULE_READ',
    ANALYTIC_TOOL_READ = 'ANALYTIC_TOOL_READ',
    ANALYTIC_SCHEMA_READ = 'ANALYTIC_SCHEMA_READ',
    ANALYTIC_DOCUMENT_READ = 'ANALYTIC_DOCUMENT_READ',
    //ARTIFACT
    ARTIFACTS_FILE_READ = 'ARTIFACTS_FILE_READ',
    ARTIFACTS_FILE_CREATE = 'ARTIFACTS_FILE_CREATE',
    ARTIFACTS_FILE_DELETE = 'ARTIFACTS_FILE_DELETE',
    //BRANDING
    BRANDING_CONFIG_UPDATE = 'BRANDING_CONFIG_UPDATE',
    //CONTRACT
    CONTRACTS_CONTRACT_READ = 'CONTRACTS_CONTRACT_READ',
    CONTRACTS_CONTRACT_CREATE = 'CONTRACTS_CONTRACT_CREATE',
    CONTRACTS_CONTRACT_DELETE = 'CONTRACTS_CONTRACT_DELETE',
    CONTRACTS_WIPE_REQUEST_READ = 'CONTRACTS_WIPE_REQUEST_READ',
    CONTRACTS_WIPE_REQUEST_UPDATE = 'CONTRACTS_WIPE_REQUEST_UPDATE',
    CONTRACTS_WIPE_REQUEST_REVIEW = 'CONTRACTS_WIPE_REQUEST_REVIEW',
    CONTRACTS_WIPE_REQUEST_DELETE = 'CONTRACTS_WIPE_REQUEST_DELETE',
    CONTRACTS_WIPE_ADMIN_CREATE = 'CONTRACTS_WIPE_ADMIN_CREATE',
    CONTRACTS_WIPE_ADMIN_DELETE = 'CONTRACTS_WIPE_ADMIN_DELETE',
    CONTRACTS_WIPE_MANAGER_CREATE = 'CONTRACTS_WIPE_MANAGER_CREATE',
    CONTRACTS_WIPE_MANAGER_DELETE = 'CONTRACTS_WIPE_MANAGER_DELETE',
    CONTRACTS_WIPER_CREATE = 'CONTRACTS_WIPER_CREATE',
    CONTRACTS_WIPER_DELETE = 'CONTRACTS_WIPER_DELETE',
    CONTRACTS_POOL_READ = 'CONTRACTS_POOL_READ',
    CONTRACTS_POOL_UPDATE = 'CONTRACTS_POOL_UPDATE',
    CONTRACTS_POOL_DELETE = 'CONTRACTS_POOL_DELETE',
    CONTRACTS_RETIRE_REQUEST_READ = 'CONTRACTS_RETIRE_REQUEST_READ',
    CONTRACTS_RETIRE_REQUEST_CREATE = 'CONTRACTS_RETIRE_REQUEST_CREATE',
    CONTRACTS_RETIRE_REQUEST_DELETE = 'CONTRACTS_RETIRE_REQUEST_DELETE',
    CONTRACTS_RETIRE_REQUEST_REVIEW = 'CONTRACTS_RETIRE_REQUEST_REVIEW',
    CONTRACTS_RETIRE_ADMIN_CREATE = 'CONTRACTS_RETIRE_ADMIN_CREATE',
    CONTRACTS_RETIRE_ADMIN_DELETE = 'CONTRACTS_RETIRE_ADMIN_DELETE',
    CONTRACTS_PERMISSIONS_READ = 'CONTRACTS_PERMISSIONS_READ',
    CONTRACTS_DOCUMENT_READ = 'CONTRACTS_DOCUMENT_READ',
    //DEMO
    DEMO_KEY_CREATE = 'DEMO_KEY_CREATE',
    //IPFS
    IPFS_FILE_READ = 'IPFS_FILE_READ',
    IPFS_FILE_CREATE = 'IPFS_FILE_CREATE',
    //LOG
    LOG_LOG_READ = 'LOG_LOG_READ',
    //MODULE
    MODULES_MODULE_READ = 'MODULES_MODULE_READ',
    MODULES_MODULE_CREATE = 'MODULES_MODULE_CREATE',
    MODULES_MODULE_UPDATE = 'MODULES_MODULE_UPDATE',
    MODULES_MODULE_DELETE = 'MODULES_MODULE_DELETE',
    MODULES_MODULE_REVIEW = 'MODULES_MODULE_REVIEW',
    //POLICY
    POLICIES_POLICY_READ = 'POLICIES_POLICY_READ',
    POLICIES_POLICY_CREATE = 'POLICIES_POLICY_CREATE',
    POLICIES_POLICY_UPDATE = 'POLICIES_POLICY_UPDATE',
    POLICIES_POLICY_DELETE = 'POLICIES_POLICY_DELETE',
    POLICIES_POLICY_REVIEW = 'POLICIES_POLICY_REVIEW',
    POLICIES_POLICY_EXECUTE = 'POLICIES_POLICY_EXECUTE',
    POLICIES_MIGRATION_CREATE = 'POLICIES_MIGRATION_CREATE',
    POLICIES_RECORD_ALL = 'POLICIES_RECORD_ALL',
    POLICIES_POLICY_AUDIT = 'POLICIES_POLICY_AUDIT', //only UserRole.AUDITOR
    //SCHEMAS
    SCHEMAS_SCHEMA_READ = 'SCHEMAS_SCHEMA_READ',
    SCHEMAS_SCHEMA_CREATE = 'SCHEMAS_SCHEMA_CREATE',
    SCHEMAS_SCHEMA_UPDATE = 'SCHEMAS_SCHEMA_UPDATE',
    SCHEMAS_SCHEMA_DELETE = 'SCHEMAS_SCHEMA_DELETE',
    SCHEMAS_SCHEMA_REVIEW = 'SCHEMAS_SCHEMA_REVIEW',
    SCHEMAS_SYSTEM_SCHEMA_READ = 'SCHEMAS_SCHEMA_READ',
    SCHEMAS_SYSTEM_SCHEMA_CREATE = 'SCHEMAS_SCHEMA_CREATE',
    SCHEMAS_SYSTEM_SCHEMA_UPDATE = 'SCHEMAS_SCHEMA_UPDATE',
    SCHEMAS_SYSTEM_SCHEMA_DELETE = 'SCHEMAS_SCHEMA_DELETE',
    SCHEMAS_SYSTEM_SCHEMA_REVIEW = 'SCHEMAS_SCHEMA_REVIEW',
    //TOOLS
    TOOLS_TOOL_READ = 'TOOLS_TOOL_READ',
    TOOLS_TOOL_CREATE = 'TOOLS_TOOL_CREATE',
    TOOLS_TOOL_UPDATE = 'TOOLS_TOOL_UPDATE',
    TOOLS_TOOL_DELETE = 'TOOLS_TOOL_DELETE',
    TOOLS_TOOL_REVIEW = 'TOOLS_TOOL_REVIEW',
    TOOL_MIGRATION_CREATE = 'TOOL_MIGRATION_CREATE',
    //TOKENS
    TOKENS_TOKEN_READ = 'TOKENS_TOKEN_READ',
    TOKENS_TOKEN_CREATE = 'TOKENS_TOKEN_CREATE',
    TOKENS_TOKEN_UPDATE = 'TOKENS_TOKEN_UPDATE',
    TOKENS_TOKEN_DELETE = 'TOKENS_TOKEN_DELETE',
    TOKENS_TOKEN_ASSOCIATE = 'TOKENS_TOKEN_ASSOCIATE',
    TOKENS_TOKEN_MANAGE = 'TOKENS_TOKEN_MANAGE',
    //TAGS
    TAGS_TAG_READ = 'TAGS_TAG_READ',
    TAGS_TAG_CREATE = 'TAGS_TAG_CREATE',
    TAGS_TAG_DELETE = 'TAGS_TAG_DELETE',
    //PROFILE
    PROFILES_USER_READ = 'PROFILES_USER_READ',
    PROFILES_USER_UPDATE = 'PROFILES_USER_UPDATE',
    PROFILES_BALANCE_READ = 'PROFILES_BALANCE_READ',
    PROFILES_RESTORE_ALL = 'PROFILES_RESTORE_ALL',
    //SUGGESTIONS
    SUGGESTIONS_SUGGESTIONS_READ = 'SUGGESTIONS_SUGGESTIONS_READ',
    SUGGESTIONS_SUGGESTIONS_UPDATE = 'SUGGESTIONS_SUGGESTIONS_UPDATE',
    //SETTINGS
    SETTINGS_SETTINGS_READ = 'SETTINGS_SETTINGS_READ',
    SETTINGS_SETTINGS_UPDATE = 'SETTINGS_SETTINGS_UPDATE',
    SETTINGS_THEME_READ = 'SETTINGS_THEME_READ',
    SETTINGS_THEME_CREATE = 'SETTINGS_THEME_CREATE',
    SETTINGS_THEME_UPDATE = 'SETTINGS_THEME_UPDATE',
    SETTINGS_THEME_DELETE = 'SETTINGS_THEME_DELETE',
    //AUDIT
    AUDIT_TRUST_CHAIN_READ = 'AUDIT_TRUST_CHAIN_READ',
    //PERMISSIONS
    PERMISSIONS_ROLE_READ = 'PERMISSIONS_ROLE_READ',
    PERMISSIONS_ROLE_CREATE = 'PERMISSIONS_ROLE_CREATE',
    PERMISSIONS_ROLE_UPDATE = 'PERMISSIONS_ROLE_UPDATE',
    PERMISSIONS_ROLE_DELETE = 'PERMISSIONS_ROLE_DELETE',
    PERMISSIONS_USER_READ= 'PERMISSIONS_USER_READ'
}

/**
 * List of Permissions
 */
export const PermissionsArray: {
    name: Permissions,
    category: PermissionCategories,
    entity: PermissionEntities,
    action: PermissionActions,
    disabled: boolean,
    default: boolean,
    defaultRoles?: UserRole[],
    dependOn?: Permissions[]
}[] = [
        //ACCOUNT
        {
            name: Permissions.ACCOUNTS_ACCOUNT_READ,
            category: PermissionCategories.ACCOUNTS,
            entity: PermissionEntities.ACCOUNT,
            action: PermissionActions.READ,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ],
        },
        {
            name: Permissions.ACCOUNTS_STANDARD_REGISTRY_READ,
            category: PermissionCategories.ACCOUNTS,
            entity: PermissionEntities.STANDARD_REGISTRY,
            action: PermissionActions.READ,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
                UserRole.AUDITOR,
                UserRole.WORKER
            ]
        },
        //ANALYTIC
        {
            name: Permissions.ANALYTIC_POLICY_READ,
            category: PermissionCategories.ANALYTIC,
            entity: PermissionEntities.POLICY,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ],
            dependOn: [
                Permissions.POLICIES_POLICY_READ
            ]
        },
        {
            name: Permissions.ANALYTIC_MODULE_READ,
            category: PermissionCategories.ANALYTIC,
            entity: PermissionEntities.MODULE,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_TOOL_READ,
            category: PermissionCategories.ANALYTIC,
            entity: PermissionEntities.TOOL,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_SCHEMA_READ,
            category: PermissionCategories.ANALYTIC,
            entity: PermissionEntities.SCHEMA,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_DOCUMENT_READ,
            category: PermissionCategories.ANALYTIC,
            entity: PermissionEntities.DOCUMENT,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //ARTIFACT
        {
            name: Permissions.ARTIFACTS_FILE_READ,
            category: PermissionCategories.ARTIFACTS,
            entity: PermissionEntities.FILE,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ARTIFACTS_FILE_CREATE,
            category: PermissionCategories.ARTIFACTS,
            entity: PermissionEntities.FILE,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ARTIFACTS_FILE_DELETE,
            category: PermissionCategories.ARTIFACTS,
            entity: PermissionEntities.FILE,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //BRANDING
        {
            name: Permissions.BRANDING_CONFIG_UPDATE,
            category: PermissionCategories.BRANDING,
            entity: PermissionEntities.CONFIG,
            action: PermissionActions.UPDATE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //CONTRACT
        {
            name: Permissions.CONTRACTS_CONTRACT_READ,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.CONTRACT,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ]
        },
        {
            name: Permissions.CONTRACTS_CONTRACT_CREATE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.CONTRACT,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_CONTRACT_DELETE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.CONTRACT,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_REQUEST_READ,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPE_REQUEST,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_REQUEST_UPDATE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPE_REQUEST,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_REQUEST_DELETE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPE_REQUEST,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_REQUEST_REVIEW,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPE_REQUEST,
            action: PermissionActions.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_ADMIN_CREATE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPE_ADMIN,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_ADMIN_DELETE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPE_ADMIN,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_MANAGER_CREATE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPE_MANAGER,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_MANAGER_DELETE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPE_MANAGER,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPER_CREATE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPER,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPER_DELETE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.WIPER,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_POOL_READ,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.POOL,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.CONTRACTS_POOL_UPDATE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.POOL,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
            ]
        },
        {
            name: Permissions.CONTRACTS_POOL_DELETE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.POOL,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_REQUEST_READ,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.RETIRE_REQUEST,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_REQUEST_CREATE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.RETIRE_REQUEST,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY, //?????
                UserRole.USER,
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_REQUEST_DELETE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.RETIRE_REQUEST,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_REQUEST_REVIEW,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.RETIRE_REQUEST,
            action: PermissionActions.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_ADMIN_CREATE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.RETIRE_ADMIN,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_ADMIN_DELETE,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.RETIRE_ADMIN,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_PERMISSIONS_READ,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.PERMISSIONS,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_DOCUMENT_READ,
            category: PermissionCategories.CONTRACTS,
            entity: PermissionEntities.DOCUMENT,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        //DEMO
        {
            name: Permissions.DEMO_KEY_CREATE,
            category: PermissionCategories.DEMO,
            entity: PermissionEntities.KEY,
            action: PermissionActions.CREATE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.WORKER,
                UserRole.USER,
                UserRole.AUDITOR
            ]
        },
        //IPFS
        {
            name: Permissions.IPFS_FILE_READ,
            category: PermissionCategories.IPFS,
            entity: PermissionEntities.FILE,
            action: PermissionActions.READ,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.WORKER,
                UserRole.USER,
                UserRole.AUDITOR
            ]
        },
        {
            name: Permissions.IPFS_FILE_CREATE,
            category: PermissionCategories.IPFS,
            entity: PermissionEntities.FILE,
            action: PermissionActions.CREATE,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.WORKER,
                UserRole.USER,
                UserRole.AUDITOR
            ]
        },
        //LOG
        {
            name: Permissions.LOG_LOG_READ,
            category: PermissionCategories.LOG,
            entity: PermissionEntities.LOG,
            action: PermissionActions.READ,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //MODULE
        {
            name: Permissions.MODULES_MODULE_READ,
            category: PermissionCategories.MODULES,
            entity: PermissionEntities.MODULE,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULES_MODULE_CREATE,
            category: PermissionCategories.MODULES,
            entity: PermissionEntities.MODULE,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULES_MODULE_UPDATE,
            category: PermissionCategories.MODULES,
            entity: PermissionEntities.MODULE,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULES_MODULE_DELETE,
            category: PermissionCategories.MODULES,
            entity: PermissionEntities.MODULE,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULES_MODULE_REVIEW,
            category: PermissionCategories.MODULES,
            entity: PermissionEntities.MODULE,
            action: PermissionActions.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //POLICY
        {
            name: Permissions.POLICIES_POLICY_READ,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.POLICY,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_CREATE,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.POLICY,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ],
            dependOn: [
                Permissions.POLICIES_POLICY_READ
            ]
            
        },
        {
            name: Permissions.POLICIES_POLICY_UPDATE,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.POLICY,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ],
            dependOn: [
                Permissions.POLICIES_POLICY_READ,
                Permissions.SCHEMAS_SCHEMA_READ,
                Permissions.MODULES_MODULE_READ,
                Permissions.TOOLS_TOOL_READ,
                Permissions.TOKENS_TOKEN_READ,
                Permissions.ARTIFACTS_FILE_READ
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_DELETE,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.POLICY,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ],
            dependOn: [
                Permissions.POLICIES_POLICY_READ
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_REVIEW,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.POLICY,
            action: PermissionActions.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ],
            dependOn: [
                Permissions.POLICIES_POLICY_READ,
                Permissions.SCHEMAS_SCHEMA_READ,
                Permissions.MODULES_MODULE_READ,
                Permissions.TOOLS_TOOL_READ,
                Permissions.TOKENS_TOKEN_READ,
                Permissions.ARTIFACTS_FILE_READ
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_EXECUTE,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.POLICY,
            action: PermissionActions.EXECUTE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ],
            dependOn: [
                Permissions.POLICIES_POLICY_READ
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_AUDIT,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.POLICY,
            action: PermissionActions.AUDIT,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.AUDITOR
            ]
        },
        {
            name: Permissions.POLICIES_MIGRATION_CREATE,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.MIGRATION,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICIES_RECORD_ALL,
            category: PermissionCategories.POLICIES,
            entity: PermissionEntities.RECORD,
            action: PermissionActions.ALL,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //SCHEMAS
        {
            name: Permissions.SCHEMAS_SCHEMA_READ,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SCHEMA,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
                //UserRole.USER ???
            ]
        },
        {
            name: Permissions.SCHEMAS_SCHEMA_CREATE,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SCHEMA,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SCHEMA_UPDATE,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SCHEMA,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SCHEMA_DELETE,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SCHEMA,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SCHEMA_REVIEW,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SCHEMA,
            action: PermissionActions.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_READ,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SYSTEM_SCHEMA,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_CREATE,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SYSTEM_SCHEMA,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_UPDATE,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SYSTEM_SCHEMA,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_DELETE,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SYSTEM_SCHEMA,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_REVIEW,
            category: PermissionCategories.SCHEMAS,
            entity: PermissionEntities.SYSTEM_SCHEMA,
            action: PermissionActions.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //TOOLS
        {
            name: Permissions.TOOLS_TOOL_READ,
            category: PermissionCategories.TOOLS,
            entity: PermissionEntities.TOOL,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOLS_TOOL_CREATE,
            category: PermissionCategories.TOOLS,
            entity: PermissionEntities.TOOL,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOLS_TOOL_UPDATE,
            category: PermissionCategories.TOOLS,
            entity: PermissionEntities.TOOL,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOLS_TOOL_DELETE,
            category: PermissionCategories.TOOLS,
            entity: PermissionEntities.TOOL,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOLS_TOOL_REVIEW,
            category: PermissionCategories.TOOLS,
            entity: PermissionEntities.TOOL,
            action: PermissionActions.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOL_MIGRATION_CREATE,
            category: PermissionCategories.TOOLS,
            entity: PermissionEntities.MIGRATION,
            action: PermissionActions.CREATE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //TOKENS
        {
            name: Permissions.TOKENS_TOKEN_READ,
            category: PermissionCategories.TOKENS,
            entity: PermissionEntities.TOKEN,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_CREATE,
            category: PermissionCategories.TOKENS,
            entity: PermissionEntities.TOKEN,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_UPDATE,
            category: PermissionCategories.TOKENS,
            entity: PermissionEntities.TOKEN,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_DELETE,
            category: PermissionCategories.TOKENS,
            entity: PermissionEntities.TOKEN,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_ASSOCIATE,
            category: PermissionCategories.TOKENS,
            entity: PermissionEntities.TOKEN,
            action: PermissionActions.ASSOCIATE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.USER
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_MANAGE,
            category: PermissionCategories.TOKENS,
            entity: PermissionEntities.TOKEN,
            action: PermissionActions.MANAGE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //TAGS
        {
            name: Permissions.TAGS_TAG_READ,
            category: PermissionCategories.TAGS,
            entity: PermissionEntities.TAG,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.TAGS_TAG_CREATE,
            category: PermissionCategories.TAGS,
            entity: PermissionEntities.TAG,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.TAGS_TAG_DELETE,
            category: PermissionCategories.TAGS,
            entity: PermissionEntities.TAG,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        //PROFILE
        {
            name: Permissions.PROFILES_USER_READ,
            category: PermissionCategories.PROFILES,
            entity: PermissionEntities.USER,
            action: PermissionActions.READ,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
                UserRole.AUDITOR,
                UserRole.WORKER
            ]
        },
        {
            name: Permissions.PROFILES_USER_UPDATE,
            category: PermissionCategories.PROFILES,
            entity: PermissionEntities.USER,
            action: PermissionActions.UPDATE,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
                UserRole.AUDITOR,
                UserRole.WORKER
            ]
        },
        {
            name: Permissions.PROFILES_BALANCE_READ,
            category: PermissionCategories.PROFILES,
            entity: PermissionEntities.BALANCE,
            action: PermissionActions.READ,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
                UserRole.AUDITOR,
                UserRole.WORKER
            ]
        },
        {
            name: Permissions.PROFILES_RESTORE_ALL,
            category: PermissionCategories.PROFILES,
            entity: PermissionEntities.RESTORE,
            action: PermissionActions.ALL,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //SUGGESTIONS
        {
            name: Permissions.SUGGESTIONS_SUGGESTIONS_READ,
            category: PermissionCategories.SUGGESTIONS,
            entity: PermissionEntities.SUGGESTIONS,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SUGGESTIONS_SUGGESTIONS_UPDATE,
            category: PermissionCategories.SUGGESTIONS,
            entity: PermissionEntities.SUGGESTIONS,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //SETTINGS
        {
            name: Permissions.SETTINGS_SETTINGS_READ,
            category: PermissionCategories.SETTINGS,
            entity: PermissionEntities.SETTINGS,
            action: PermissionActions.READ,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SETTINGS_SETTINGS_UPDATE,
            category: PermissionCategories.SETTINGS,
            entity: PermissionEntities.SETTINGS,
            action: PermissionActions.UPDATE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SETTINGS_THEME_READ,
            category: PermissionCategories.SETTINGS,
            entity: PermissionEntities.THEME,
            action: PermissionActions.READ,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.WORKER
            ]
        },
        {
            name: Permissions.SETTINGS_THEME_CREATE,
            category: PermissionCategories.SETTINGS,
            entity: PermissionEntities.THEME,
            action: PermissionActions.CREATE,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.WORKER
            ]
        },
        {
            name: Permissions.SETTINGS_THEME_UPDATE,
            category: PermissionCategories.SETTINGS,
            entity: PermissionEntities.THEME,
            action: PermissionActions.UPDATE,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.WORKER
            ]
        },
        {
            name: Permissions.SETTINGS_THEME_DELETE,
            category: PermissionCategories.SETTINGS,
            entity: PermissionEntities.THEME,
            action: PermissionActions.DELETE,
            disabled: true,
            default: true,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.WORKER
            ]
        },
        //AUDIT
        {
            name: Permissions.AUDIT_TRUST_CHAIN_READ,
            category: PermissionCategories.AUDIT,
            entity: PermissionEntities.TRUST_CHAIN,
            action: PermissionActions.DELETE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.AUDITOR
            ]
        },
        //PERMISSIONS
        {
            name: Permissions.PERMISSIONS_ROLE_READ,
            category: PermissionCategories.PERMISSIONS,
            entity: PermissionEntities.ROLE,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.PERMISSIONS_ROLE_CREATE,
            category: PermissionCategories.PERMISSIONS,
            entity: PermissionEntities.ROLE,
            action: PermissionActions.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.PERMISSIONS_ROLE_UPDATE,
            category: PermissionCategories.PERMISSIONS,
            entity: PermissionEntities.ROLE,
            action: PermissionActions.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.PERMISSIONS_ROLE_DELETE,
            category: PermissionCategories.PERMISSIONS,
            entity: PermissionEntities.ROLE,
            action: PermissionActions.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.PERMISSIONS_USER_READ,
            category: PermissionCategories.PERMISSIONS,
            entity: PermissionEntities.USER,
            action: PermissionActions.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        }
    ];
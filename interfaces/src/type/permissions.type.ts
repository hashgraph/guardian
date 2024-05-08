import { UserRole } from './user-role.type.js';

/**
 * Category
 */
export enum Category {
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
export enum Entity {
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
export enum Action {
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
    category: Category,
    entity: Entity,
    action: Action,
    disabled: boolean,
    default: boolean,
    defaultRoles?: UserRole[]
}[] = [
        //ACCOUNT
        {
            name: Permissions.ACCOUNTS_ACCOUNT_READ,
            category: Category.ACCOUNTS,
            entity: Entity.ACCOUNT,
            action: Action.READ,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ACCOUNTS_STANDARD_REGISTRY_READ,
            category: Category.ACCOUNTS,
            entity: Entity.STANDARD_REGISTRY,
            action: Action.READ,
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
            category: Category.ANALYTIC,
            entity: Entity.POLICY,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_MODULE_READ,
            category: Category.ANALYTIC,
            entity: Entity.MODULE,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_TOOL_READ,
            category: Category.ANALYTIC,
            entity: Entity.TOOL,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_SCHEMA_READ,
            category: Category.ANALYTIC,
            entity: Entity.SCHEMA,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_DOCUMENT_READ,
            category: Category.ANALYTIC,
            entity: Entity.DOCUMENT,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //ARTIFACT
        {
            name: Permissions.ARTIFACTS_FILE_READ,
            category: Category.ARTIFACTS,
            entity: Entity.FILE,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ARTIFACTS_FILE_CREATE,
            category: Category.ARTIFACTS,
            entity: Entity.FILE,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ARTIFACTS_FILE_DELETE,
            category: Category.ARTIFACTS,
            entity: Entity.FILE,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //BRANDING
        {
            name: Permissions.BRANDING_CONFIG_UPDATE,
            category: Category.BRANDING,
            entity: Entity.CONFIG,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //CONTRACT
        {
            name: Permissions.CONTRACTS_CONTRACT_READ,
            category: Category.CONTRACTS,
            entity: Entity.CONTRACT,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ]
        },
        {
            name: Permissions.CONTRACTS_CONTRACT_CREATE,
            category: Category.CONTRACTS,
            entity: Entity.CONTRACT,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_CONTRACT_DELETE,
            category: Category.CONTRACTS,
            entity: Entity.CONTRACT,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_REQUEST_READ,
            category: Category.CONTRACTS,
            entity: Entity.WIPE_REQUEST,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_REQUEST_UPDATE,
            category: Category.CONTRACTS,
            entity: Entity.WIPE_REQUEST,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_REQUEST_DELETE,
            category: Category.CONTRACTS,
            entity: Entity.WIPE_REQUEST,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_REQUEST_REVIEW,
            category: Category.CONTRACTS,
            entity: Entity.WIPE_REQUEST,
            action: Action.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_ADMIN_CREATE,
            category: Category.CONTRACTS,
            entity: Entity.WIPE_ADMIN,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_ADMIN_DELETE,
            category: Category.CONTRACTS,
            entity: Entity.WIPE_ADMIN,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_MANAGER_CREATE,
            category: Category.CONTRACTS,
            entity: Entity.WIPE_MANAGER,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPE_MANAGER_DELETE,
            category: Category.CONTRACTS,
            entity: Entity.WIPE_MANAGER,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPER_CREATE,
            category: Category.CONTRACTS,
            entity: Entity.WIPER,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_WIPER_DELETE,
            category: Category.CONTRACTS,
            entity: Entity.WIPER,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_POOL_READ,
            category: Category.CONTRACTS,
            entity: Entity.POOL,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.CONTRACTS_POOL_UPDATE,
            category: Category.CONTRACTS,
            entity: Entity.POOL,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
            ]
        },
        {
            name: Permissions.CONTRACTS_POOL_DELETE,
            category: Category.CONTRACTS,
            entity: Entity.POOL,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_REQUEST_READ,
            category: Category.CONTRACTS,
            entity: Entity.RETIRE_REQUEST,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_REQUEST_CREATE,
            category: Category.CONTRACTS,
            entity: Entity.RETIRE_REQUEST,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY, //?????
                UserRole.USER,
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_REQUEST_DELETE,
            category: Category.CONTRACTS,
            entity: Entity.RETIRE_REQUEST,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_REQUEST_REVIEW,
            category: Category.CONTRACTS,
            entity: Entity.RETIRE_REQUEST,
            action: Action.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_ADMIN_CREATE,
            category: Category.CONTRACTS,
            entity: Entity.RETIRE_ADMIN,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_RETIRE_ADMIN_DELETE,
            category: Category.CONTRACTS,
            entity: Entity.RETIRE_ADMIN,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_PERMISSIONS_READ,
            category: Category.CONTRACTS,
            entity: Entity.PERMISSIONS,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACTS_DOCUMENT_READ,
            category: Category.CONTRACTS,
            entity: Entity.DOCUMENT,
            action: Action.READ,
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
            category: Category.DEMO,
            entity: Entity.KEY,
            action: Action.CREATE,
            disabled: false,
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
            category: Category.IPFS,
            entity: Entity.FILE,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.WORKER,
                UserRole.USER,
                UserRole.AUDITOR
            ]
        },
        {
            name: Permissions.IPFS_FILE_CREATE,
            category: Category.IPFS,
            entity: Entity.FILE,
            action: Action.CREATE,
            disabled: false,
            default: false,
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
            category: Category.LOG,
            entity: Entity.LOG,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //MODULE
        {
            name: Permissions.MODULES_MODULE_READ,
            category: Category.MODULES,
            entity: Entity.MODULE,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULES_MODULE_CREATE,
            category: Category.MODULES,
            entity: Entity.MODULE,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULES_MODULE_UPDATE,
            category: Category.MODULES,
            entity: Entity.MODULE,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULES_MODULE_DELETE,
            category: Category.MODULES,
            entity: Entity.MODULE,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULES_MODULE_REVIEW,
            category: Category.MODULES,
            entity: Entity.MODULE,
            action: Action.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //POLICY
        {
            name: Permissions.POLICIES_POLICY_READ,
            category: Category.POLICIES,
            entity: Entity.POLICY,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_CREATE,
            category: Category.POLICIES,
            entity: Entity.POLICY,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_UPDATE,
            category: Category.POLICIES,
            entity: Entity.POLICY,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_DELETE,
            category: Category.POLICIES,
            entity: Entity.POLICY,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_REVIEW,
            category: Category.POLICIES,
            entity: Entity.POLICY,
            action: Action.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_EXECUTE,
            category: Category.POLICIES,
            entity: Entity.POLICY,
            action: Action.EXECUTE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.POLICIES_POLICY_AUDIT,
            category: Category.POLICIES,
            entity: Entity.POLICY,
            action: Action.AUDIT,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.AUDITOR
            ]
        },
        {
            name: Permissions.POLICIES_MIGRATION_CREATE,
            category: Category.POLICIES,
            entity: Entity.MIGRATION,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICIES_RECORD_ALL,
            category: Category.POLICIES,
            entity: Entity.RECORD,
            action: Action.ALL,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //SCHEMAS
        {
            name: Permissions.SCHEMAS_SCHEMA_READ,
            category: Category.SCHEMAS,
            entity: Entity.SCHEMA,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
                //UserRole.USER ???
            ]
        },
        {
            name: Permissions.SCHEMAS_SCHEMA_CREATE,
            category: Category.SCHEMAS,
            entity: Entity.SCHEMA,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SCHEMA_UPDATE,
            category: Category.SCHEMAS,
            entity: Entity.SCHEMA,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SCHEMA_DELETE,
            category: Category.SCHEMAS,
            entity: Entity.SCHEMA,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SCHEMA_REVIEW,
            category: Category.SCHEMAS,
            entity: Entity.SCHEMA,
            action: Action.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_READ,
            category: Category.SCHEMAS,
            entity: Entity.SYSTEM_SCHEMA,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_CREATE,
            category: Category.SCHEMAS,
            entity: Entity.SYSTEM_SCHEMA,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_UPDATE,
            category: Category.SCHEMAS,
            entity: Entity.SYSTEM_SCHEMA,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_DELETE,
            category: Category.SCHEMAS,
            entity: Entity.SYSTEM_SCHEMA,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SCHEMAS_SYSTEM_SCHEMA_REVIEW,
            category: Category.SCHEMAS,
            entity: Entity.SYSTEM_SCHEMA,
            action: Action.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //TOOLS
        {
            name: Permissions.TOOLS_TOOL_READ,
            category: Category.TOOLS,
            entity: Entity.TOOL,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOLS_TOOL_CREATE,
            category: Category.TOOLS,
            entity: Entity.TOOL,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOLS_TOOL_UPDATE,
            category: Category.TOOLS,
            entity: Entity.TOOL,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOLS_TOOL_DELETE,
            category: Category.TOOLS,
            entity: Entity.TOOL,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOLS_TOOL_REVIEW,
            category: Category.TOOLS,
            entity: Entity.TOOL,
            action: Action.REVIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOOL_MIGRATION_CREATE,
            category: Category.TOOLS,
            entity: Entity.MIGRATION,
            action: Action.CREATE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //TOKENS
        {
            name: Permissions.TOKENS_TOKEN_READ,
            category: Category.TOKENS,
            entity: Entity.TOKEN,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_CREATE,
            category: Category.TOKENS,
            entity: Entity.TOKEN,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_UPDATE,
            category: Category.TOKENS,
            entity: Entity.TOKEN,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_DELETE,
            category: Category.TOKENS,
            entity: Entity.TOKEN,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_ASSOCIATE,
            category: Category.TOKENS,
            entity: Entity.TOKEN,
            action: Action.ASSOCIATE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.USER
            ]
        },
        {
            name: Permissions.TOKENS_TOKEN_MANAGE,
            category: Category.TOKENS,
            entity: Entity.TOKEN,
            action: Action.MANAGE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //TAGS
        {
            name: Permissions.TAGS_TAG_READ,
            category: Category.TAGS,
            entity: Entity.TAG,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.TAGS_TAG_CREATE,
            category: Category.TAGS,
            entity: Entity.TAG,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.TAGS_TAG_DELETE,
            category: Category.TAGS,
            entity: Entity.TAG,
            action: Action.DELETE,
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
            category: Category.PROFILES,
            entity: Entity.USER,
            action: Action.READ,
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
            category: Category.PROFILES,
            entity: Entity.USER,
            action: Action.UPDATE,
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
            category: Category.PROFILES,
            entity: Entity.BALANCE,
            action: Action.READ,
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
            category: Category.PROFILES,
            entity: Entity.RESTORE,
            action: Action.ALL,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //SUGGESTIONS
        {
            name: Permissions.SUGGESTIONS_SUGGESTIONS_READ,
            category: Category.SUGGESTIONS,
            entity: Entity.SUGGESTIONS,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SUGGESTIONS_SUGGESTIONS_UPDATE,
            category: Category.SUGGESTIONS,
            entity: Entity.SUGGESTIONS,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //SETTINGS
        {
            name: Permissions.SETTINGS_SETTINGS_READ,
            category: Category.SETTINGS,
            entity: Entity.SETTINGS,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SETTINGS_SETTINGS_UPDATE,
            category: Category.SETTINGS,
            entity: Entity.SETTINGS,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SETTINGS_THEME_READ,
            category: Category.SETTINGS,
            entity: Entity.THEME,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SETTINGS_THEME_CREATE,
            category: Category.SETTINGS,
            entity: Entity.THEME,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SETTINGS_THEME_UPDATE,
            category: Category.SETTINGS,
            entity: Entity.THEME,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.SETTINGS_THEME_DELETE,
            category: Category.SETTINGS,
            entity: Entity.THEME,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //AUDIT
        {
            name: Permissions.AUDIT_TRUST_CHAIN_READ,
            category: Category.AUDIT,
            entity: Entity.TRUST_CHAIN,
            action: Action.DELETE,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.AUDITOR
            ]
        },
        //PERMISSIONS
        {
            name: Permissions.PERMISSIONS_ROLE_READ,
            category: Category.PERMISSIONS,
            entity: Entity.ROLE,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.PERMISSIONS_ROLE_CREATE,
            category: Category.PERMISSIONS,
            entity: Entity.ROLE,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.PERMISSIONS_ROLE_UPDATE,
            category: Category.PERMISSIONS,
            entity: Entity.ROLE,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.PERMISSIONS_ROLE_DELETE,
            category: Category.PERMISSIONS,
            entity: Entity.ROLE,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.PERMISSIONS_USER_READ,
            category: Category.PERMISSIONS,
            entity: Entity.USER,
            action: Action.READ,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        }
    ];
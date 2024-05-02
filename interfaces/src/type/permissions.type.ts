import { UserRole } from './user-role.type';

/**
 * Category
 */
export enum Category {
    ACCOUNT = 'ACCOUNT',
    SESSION = 'SESSION',
    PROFILE = 'PROFILE',
    ANALYTIC = 'ANALYTIC',
    ARTIFACT = 'ARTIFACT',
    POLICY = 'POLICY',
    BRANDING = 'BRANDING',
    CONTRACT = 'CONTRACT',
    DEMO = 'DEMO',
    IPFS = 'IPFS',
    LOG = 'LOG',
    MODULE = 'MODULE',
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
}

/**
 * Entity
 */
export enum Action {
    VIEW = 'VIEW',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    REVIEW = 'REVIEW',
    PUBLISH = 'PUBLISH',
    ALL = 'ALL',
}

/**
 * Permissions
 * name: Category_Entity_Action
 */
export enum Permissions {
    //ACCOUNT
    ACCOUNT_ACCOUNT_VIEW = 'ACCOUNT_ACCOUNT_VIEW',
    ACCOUNT_STANDARD_REGISTRY_VIEW = 'ACCOUNT_STANDARD_REGISTRY_VIEW',
    //ANALYTIC
    ANALYTIC_POLICY_VIEW = 'ANALYTIC_POLICY_VIEW',
    ANALYTIC_MODULE_VIEW = 'ANALYTIC_MODULE_VIEW',
    ANALYTIC_TOOL_VIEW = 'ANALYTIC_TOOL_VIEW',
    ANALYTIC_SCHEMA_VIEW = 'ANALYTIC_SCHEMA_VIEW',
    ANALYTIC_DOCUMENT_VIEW = 'ANALYTIC_DOCUMENT_VIEW',
    //ARTIFACT
    ARTIFACT_FILE_VIEW = 'ARTIFACT_FILE_VIEW',
    ARTIFACT_FILE_CREATE = 'ARTIFACT_FILE_CREATE',
    ARTIFACT_FILE_DELETE = 'ARTIFACT_FILE_DELETE',
    //BRANDING
    BRANDING_CONFIG_UPDATE = 'BRANDING_CONFIG_UPDATE',
    //CONTRACT
    CONTRACT_CONTRACT_VIEW = 'CONTRACT_CONTRACT_VIEW',
    CONTRACT_CONTRACT_CREATE = 'CONTRACT_CONTRACT_CREATE',
    CONTRACT_CONTRACT_DELETE = 'CONTRACT_CONTRACT_DELETE',
    CONTRACT_WIPE_REQUEST_VIEW = 'CONTRACT_WIPE_REQUEST_VIEW',
    CONTRACT_WIPE_REQUEST_UPDATE = 'CONTRACT_WIPE_REQUEST_UPDATE',
    CONTRACT_WIPE_REQUEST_PUBLISH = 'CONTRACT_WIPE_REQUEST_PUBLISH',
    CONTRACT_WIPE_REQUEST_DELETE = 'CONTRACT_WIPE_REQUEST_DELETE',
    CONTRACT_WIPE_ADMIN_CREATE = 'CONTRACT_WIPE_ADMIN_CREATE',
    CONTRACT_WIPE_ADMIN_DELETE = 'CONTRACT_WIPE_ADMIN_DELETE',
    CONTRACT_WIPE_MANAGER_CREATE = 'CONTRACT_WIPE_MANAGER_CREATE',
    CONTRACT_WIPE_MANAGER_DELETE = 'CONTRACT_WIPE_MANAGER_DELETE',
    CONTRACT_WIPER_CREATE = 'CONTRACT_WIPER_CREATE',
    CONTRACT_WIPER_DELETE = 'CONTRACT_WIPER_DELETE',
    CONTRACT_POOL_VIEW = 'CONTRACT_POOL_VIEW',
    CONTRACT_POOL_UPDATE = 'CONTRACT_POOL_UPDATE',
    CONTRACT_POOL_DELETE = 'CONTRACT_POOL_DELETE',
    CONTRACT_RETIRE_REQUEST_VIEW = 'CONTRACT_RETIRE_REQUEST_VIEW',
    CONTRACT_RETIRE_REQUEST_CREATE = 'CONTRACT_RETIRE_REQUEST_CREATE',
    CONTRACT_RETIRE_REQUEST_DELETE = 'CONTRACT_RETIRE_REQUEST_DELETE',
    CONTRACT_RETIRE_REQUEST_PUBLISH = 'CONTRACT_RETIRE_REQUEST_PUBLISH',
    CONTRACT_RETIRE_ADMIN_CREATE = 'CONTRACT_RETIRE_ADMIN_CREATE',
    CONTRACT_RETIRE_ADMIN_DELETE = 'CONTRACT_RETIRE_ADMIN_DELETE',
    CONTRACT_PERMISSIONS_VIEW = 'CONTRACT_PERMISSIONS_VIEW',
    CONTRACT_DOCUMENT_VIEW = 'CONTRACT_DOCUMENT_VIEW',
    //DEMO
    DEMO_KEY_CREATE = 'DEMO_KEY_CREATE',
    //IPFS
    IPFS_FILE_VIEW = 'IPFS_FILE_VIEW',
    IPFS_FILE_CREATE = 'IPFS_FILE_CREATE',
    //LOG
    LOG_LOG_VIEW = 'LOG_LOG_VIEW',
    //MODULE
    MODULE_MODULE_VIEW = 'MODULE_MODULE_VIEW',
    MODULE_MODULE_CREATE = 'MODULE_MODULE_CREATE',
    MODULE_MODULE_UPDATE = 'MODULE_MODULE_UPDATE',
    MODULE_MODULE_DELETE = 'MODULE_MODULE_DELETE',
    MODULE_MODULE_PUBLISH = 'MODULE_MODULE_PUBLISH',




    //PROFILE
    PROFILE_USER_VIEW = 'PROFILE_USER_VIEW',
    PROFILE_USER_UPDATE = 'PROFILE_USER_UPDATE',
    PROFILE_BALANCE_VIEW = 'PROFILE_BALANCE_VIEW',
    PROFILE_RESTORE_ALL = 'PROFILE_RESTORE_ALL',
    //POLICY
    POLICY_RECORD_ALL = 'POLICY_RECORD_ALL',
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
            name: Permissions.ACCOUNT_ACCOUNT_VIEW,
            category: Category.ACCOUNT,
            entity: Entity.ACCOUNT,
            action: Action.VIEW,
            disabled: true,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ACCOUNT_STANDARD_REGISTRY_VIEW,
            category: Category.ACCOUNT,
            entity: Entity.STANDARD_REGISTRY,
            action: Action.VIEW,
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
            name: Permissions.ANALYTIC_POLICY_VIEW,
            category: Category.ANALYTIC,
            entity: Entity.POLICY,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_MODULE_VIEW,
            category: Category.ANALYTIC,
            entity: Entity.MODULE,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_TOOL_VIEW,
            category: Category.ANALYTIC,
            entity: Entity.TOOL,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_SCHEMA_VIEW,
            category: Category.ANALYTIC,
            entity: Entity.SCHEMA,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ANALYTIC_DOCUMENT_VIEW,
            category: Category.ANALYTIC,
            entity: Entity.DOCUMENT,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //ARTIFACT
        {
            name: Permissions.ARTIFACT_FILE_VIEW,
            category: Category.ARTIFACT,
            entity: Entity.FILE,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ARTIFACT_FILE_CREATE,
            category: Category.ARTIFACT,
            entity: Entity.FILE,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.ARTIFACT_FILE_DELETE,
            category: Category.ARTIFACT,
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
            name: Permissions.CONTRACT_CONTRACT_VIEW,
            category: Category.CONTRACT,
            entity: Entity.CONTRACT,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ]
        },
        {
            name: Permissions.CONTRACT_CONTRACT_CREATE,
            category: Category.CONTRACT,
            entity: Entity.CONTRACT,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_CONTRACT_DELETE,
            category: Category.CONTRACT,
            entity: Entity.CONTRACT,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPE_REQUEST_VIEW,
            category: Category.CONTRACT,
            entity: Entity.WIPE_REQUEST,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPE_REQUEST_UPDATE,
            category: Category.CONTRACT,
            entity: Entity.WIPE_REQUEST,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPE_REQUEST_DELETE,
            category: Category.CONTRACT,
            entity: Entity.WIPE_REQUEST,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPE_REQUEST_PUBLISH,
            category: Category.CONTRACT,
            entity: Entity.WIPE_REQUEST,
            action: Action.PUBLISH,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPE_ADMIN_CREATE,
            category: Category.CONTRACT,
            entity: Entity.WIPE_ADMIN,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPE_ADMIN_DELETE,
            category: Category.CONTRACT,
            entity: Entity.WIPE_ADMIN,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPE_MANAGER_CREATE,
            category: Category.CONTRACT,
            entity: Entity.WIPE_MANAGER,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPE_MANAGER_DELETE,
            category: Category.CONTRACT,
            entity: Entity.WIPE_MANAGER,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPER_CREATE,
            category: Category.CONTRACT,
            entity: Entity.WIPER,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_WIPER_DELETE,
            category: Category.CONTRACT,
            entity: Entity.WIPER,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_POOL_VIEW,
            category: Category.CONTRACT,
            entity: Entity.POOL,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.CONTRACT_POOL_UPDATE,
            category: Category.CONTRACT,
            entity: Entity.POOL,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
            ]
        },
        {
            name: Permissions.CONTRACT_POOL_DELETE,
            category: Category.CONTRACT,
            entity: Entity.POOL,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
            ]
        },
        {
            name: Permissions.CONTRACT_RETIRE_REQUEST_VIEW,
            category: Category.CONTRACT,
            entity: Entity.RETIRE_REQUEST,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER,
            ]
        },
        {
            name: Permissions.CONTRACT_RETIRE_REQUEST_CREATE,
            category: Category.CONTRACT,
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
            name: Permissions.CONTRACT_RETIRE_REQUEST_DELETE,
            category: Category.CONTRACT,
            entity: Entity.RETIRE_REQUEST,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_RETIRE_REQUEST_PUBLISH,
            category: Category.CONTRACT,
            entity: Entity.RETIRE_REQUEST,
            action: Action.PUBLISH,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_RETIRE_ADMIN_CREATE,
            category: Category.CONTRACT,
            entity: Entity.RETIRE_ADMIN,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_RETIRE_ADMIN_DELETE,
            category: Category.CONTRACT,
            entity: Entity.RETIRE_ADMIN,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_PERMISSIONS_VIEW,
            category: Category.CONTRACT,
            entity: Entity.PERMISSIONS,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.CONTRACT_DOCUMENT_VIEW,
            category: Category.CONTRACT,
            entity: Entity.DOCUMENT,
            action: Action.VIEW,
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
                UserRole.USER,
                UserRole.AUDITOR
            ]
        },
        //IPFS
        {
            name: Permissions.IPFS_FILE_VIEW,
            category: Category.IPFS,
            entity: Entity.FILE,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY,
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
                UserRole.USER,
                UserRole.AUDITOR
            ]
        },
        //LOG
        {
            name: Permissions.LOG_LOG_VIEW,
            category: Category.LOG,
            entity: Entity.LOG,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //MODULE
        {
            name: Permissions.MODULE_MODULE_VIEW,
            category: Category.MODULE,
            entity: Entity.MODULE,
            action: Action.VIEW,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULE_MODULE_CREATE,
            category: Category.MODULE,
            entity: Entity.MODULE,
            action: Action.CREATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULE_MODULE_UPDATE,
            category: Category.MODULE,
            entity: Entity.MODULE,
            action: Action.UPDATE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULE_MODULE_DELETE,
            category: Category.MODULE,
            entity: Entity.MODULE,
            action: Action.DELETE,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.MODULE_MODULE_PUBLISH,
            category: Category.MODULE,
            entity: Entity.MODULE,
            action: Action.PUBLISH,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        //PROFILE
        {
            name: Permissions.PROFILE_USER_VIEW,
            category: Category.PROFILE,
            entity: Entity.USER,
            action: Action.VIEW,
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
            name: Permissions.PROFILE_USER_UPDATE,
            category: Category.PROFILE,
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
            name: Permissions.PROFILE_BALANCE_VIEW,
            category: Category.PROFILE,
            entity: Entity.BALANCE,
            action: Action.VIEW,
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
            name: Permissions.PROFILE_RESTORE_ALL,
            category: Category.PROFILE,
            entity: Entity.RESTORE,
            action: Action.ALL,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        },
        {
            name: Permissions.POLICY_RECORD_ALL,
            category: Category.POLICY,
            entity: Entity.RECORD,
            action: Action.ALL,
            disabled: false,
            default: false,
            defaultRoles: [
                UserRole.STANDARD_REGISTRY
            ]
        }
    ];
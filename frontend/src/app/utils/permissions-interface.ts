import { UntypedFormControl } from "@angular/forms";
import { Permissions, PermissionActions, PermissionCategories, PermissionEntities } from "@guardian/interfaces";

export interface IPermission {
    name: Permissions;
    category: PermissionCategories;
    entity: PermissionEntities;
    action: PermissionActions;
    disabled: boolean;
    default: boolean;
    dependOn?: Permissions[];
}

export interface IAction {
    readonly parent: IEntity;
    readonly id: PermissionActions | string;
    readonly permission: Permissions;
    readonly control: UntypedFormControl;
    readonly refs: IAction[];
    tooltip: string;

    setValue(value: boolean): void;

    getValue(): boolean;

    disable(): void;

    clearValue(): void;

    addValue(permissions: Permissions[]): void;

    addRef(action: IAction): void;

    isDepend(permissions: Permissions): boolean;
}

export interface ICategory {
    readonly type: string;
    readonly id: PermissionCategories | string;
    readonly name: string;
    readonly map: Map<PermissionEntities, IEntity>;
    readonly entities: IEntity[];
    readonly actions: string[];

    count: number;

    checkAll(): void

    checkCount(): void;

    disable(): void;

    clearValue(): void;

    addValue(permissions: Permissions[]): void;

    mergeValue(permissions: Permissions[]): void;

    addEntity(permission: IPermission): IEntity;
}

export interface IEntity {
    readonly parent: ICategory;
    readonly id: PermissionEntities;
    readonly name: string;
    readonly type: string;
    readonly actions: IAction[];
    readonly map: Map<PermissionActions, IAction>;
    readonly control: UntypedFormControl;
    readonly canAll: boolean;
    all: boolean;

    addAction(permission: IPermission): IAction;

    selectAll(): void;

    checkAll(): void;

    checkCount(): void;

    disable(): void;

    clearValue(): void;

    addValue(permissions: Permissions[]): void;

    mergeValue(permissions: Permissions[]): void;
}

export const entityNames = new Map<PermissionEntities, string>([
    [PermissionEntities.ACCOUNT, 'Account'],
    [PermissionEntities.STANDARD_REGISTRY, 'Standard Registry'],
    [PermissionEntities.USER, 'User'],
    [PermissionEntities.BALANCE, 'Balance'],
    [PermissionEntities.RESTORE, 'Restore'],
    [PermissionEntities.RECORD, 'Record'],
    [PermissionEntities.POLICY, 'Policy'],
    [PermissionEntities.EXTERNAL_POLICY, 'Remote Policy'],
    [PermissionEntities.TOOL, 'Tool'],
    [PermissionEntities.DOCUMENT, 'Document'],
    [PermissionEntities.SCHEMA, 'Schema'],
    [PermissionEntities.RULE, 'Schema Rule'],
    [PermissionEntities.MODULE, 'Module'],
    [PermissionEntities.FILE, 'File'],
    [PermissionEntities.CONFIG, 'Config'],
    [PermissionEntities.CONTRACT, 'Contract'],
    [PermissionEntities.WIPE_REQUEST, 'Wipe Request'],
    [PermissionEntities.WIPE_ADMIN, 'Wipe Admin'],
    [PermissionEntities.WIPE_MANAGER, 'Wipe Manager'],
    [PermissionEntities.WIPER, 'Wiper'],
    [PermissionEntities.POOL, 'Pool'],
    [PermissionEntities.RETIRE_REQUEST, 'Retire Request'],
    [PermissionEntities.RETIRE_ADMIN, 'Retire Admin'],
    [PermissionEntities.PERMISSIONS, 'Permissions'],
    [PermissionEntities.KEY, 'Key'],
    [PermissionEntities.LOG, 'Log'],
    [PermissionEntities.MIGRATION, 'Migration'],
    [PermissionEntities.SETTINGS, 'Settings'],
    [PermissionEntities.SUGGESTIONS, 'Suggestions'],
    [PermissionEntities.TAG, 'Tag'],
    [PermissionEntities.SYSTEM_SCHEMA, 'System Schema'],
    [PermissionEntities.THEME, 'Theme'],
    [PermissionEntities.TOKEN, 'Token'],
    [PermissionEntities.TRUST_CHAIN, 'Trust Chain'],
    [PermissionEntities.ROLE, 'Role'],
    [PermissionEntities.STATISTIC, 'Statistic'],
    [PermissionEntities.LABEL, 'Label'],
    [PermissionEntities.FORMULA, 'Formula']
])

export const actionIndexes = new Map<PermissionActions, number>([
    [PermissionActions.READ, 0],
    [PermissionActions.CREATE, 1],
    [PermissionActions.UPDATE, 2],
    [PermissionActions.DELETE, 3],
    [PermissionActions.REVIEW, 4],
    [PermissionActions.EXECUTE, 5],
    [PermissionActions.MANAGE, 6],
    [PermissionActions.AUDIT, 7],
    [PermissionActions.TAG, 8],
    [PermissionActions.ALL, -1],
])

export const accessIndexes = new Map<PermissionActions, number>([
    [PermissionActions.ASSIGNED, 0],
    [PermissionActions.PUBLISHED, 1],
    [PermissionActions.ASSIGNED_AND_PUBLISHED, 2],
    [PermissionActions.ALL, 3],
])

export const categoryNames = new Map<PermissionCategories, string>([
    [PermissionCategories.ACCOUNTS, 'Accounts'],
    [PermissionCategories.SESSION, 'Session'],
    [PermissionCategories.PROFILES, 'Profiles'],
    [PermissionCategories.ANALYTIC, 'Analytic'],
    [PermissionCategories.ARTIFACTS, 'Artifacts'],
    [PermissionCategories.POLICIES, 'Policies'],
    [PermissionCategories.BRANDING, 'Branding'],
    [PermissionCategories.CONTRACTS, 'Contracts'],
    [PermissionCategories.DEMO, 'Demo'],
    [PermissionCategories.IPFS, 'IPFS'],
    [PermissionCategories.LOG, 'Logs'],
    [PermissionCategories.MODULES, 'Modules'],
    [PermissionCategories.SETTINGS, 'Settings'],
    [PermissionCategories.SUGGESTIONS, 'Suggestions'],
    [PermissionCategories.TAGS, 'Tags'],
    [PermissionCategories.SCHEMAS, 'Schemas'],
    [PermissionCategories.TOKENS, 'Tokens'],
    [PermissionCategories.AUDIT, 'Audit'],
    [PermissionCategories.TOOLS, 'Tools'],
    [PermissionCategories.PERMISSIONS, 'Permissions'],
    [PermissionCategories.STATISTICS, 'Policy Statistics'],
    [PermissionCategories.FORMULAS, 'Formulas'],
    [PermissionCategories.ACCESS, 'Access']
])

export const actionName = [
    'Read',
    'Create',
    'Edit',
    'Delete',
    'Review',
    'Execute',
    'Manage'
]

export const actionPolicyName = [
    'Read',
    'Create',
    'Edit',
    'Delete',
    'Review',
    'Execute',
    'Manage',
    'Audit',
    'Tag'
]

export const actionAccessName = [
    'Assigned',
    'Published',
    'Assigned & Published',
    'All'
]

export const delegateAccessName = [
    'Delegate',
]

export const actionLogsName = [
    'Read',
    'System',
    'Users',
]

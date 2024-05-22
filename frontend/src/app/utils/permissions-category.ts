import { Permissions, PermissionCategories, PermissionEntities } from "@guardian/interfaces";
import { IPermission } from "./permissions";
import { EntityAccess, EntityGroup } from "./permissions-entity";

const categoryNames = new Map<PermissionCategories, string>([
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
    [PermissionCategories.ACCESS, 'Access']
])

const actionName = [
    'Read',
    'Create',
    'Edit',
    'Delete',
    'Review',
    'Execute',
    'Manage'
]

export const actionAccessName = [
    'Assigned',
    'Published',
    'Assigned & Published',
    'All'
]

export class CategoryAccess {
    public readonly type: string = 'Access';
    public readonly id: PermissionCategories;
    public readonly name: string;
    public readonly map = new Map<PermissionEntities, EntityAccess>();
    public readonly entities: EntityAccess[] = [];
    public readonly actions: string[];
    public count: number = 0;

    constructor() {
        this.id = PermissionCategories.ACCESS;
        this.name = 'Access';
        this.actions = actionAccessName;
    }

    public addEntity(permission: IPermission): EntityAccess {
        if (this.map.has(permission.entity)) {
            return this.map.get(permission.entity) as any;
        } else {
            const item = new EntityAccess(permission, this);
            this.map.set(permission.entity, item);
            this.entities.push(item);
            return item;
        }
    }

    public checkCount() {
        this.count = 0;
    }

    public disable(): void {
        for (const entity of this.map.values()) {
            entity.disable();
        }
    }

    public clearValue(): void {
        for (const entity of this.map.values()) {
            entity.clearValue();
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const entity of this.map.values()) {
            entity.addValue(permissions);
        }
    }
}


export class CategoryDetails {
    public readonly type: string = 'Role';
    public readonly id: string;
    public readonly name: string;
    public readonly map = new Map<PermissionEntities, EntityGroup>();
    public readonly entities: EntityGroup[] = [];
    public readonly actions: string[] = [];
    public count: number = 0;

    constructor(name: string) {
        this.id = '';
        this.name = name;
    }

    public checkCount() {
        this.count = 0;
    }

    public disable(): void {
    }

    public clearValue(): void {
    }

    public addValue(permissions: Permissions[]): void {
    }
}

export class CategoryGroup {
    public readonly type: string = 'Permissions';
    public readonly id: PermissionCategories;
    public readonly name: string;
    public readonly map = new Map<PermissionEntities, EntityGroup>();
    public readonly entities: EntityGroup[] = [];
    public readonly actions: string[];
    public count: number = 0;

    constructor(permission: IPermission) {
        this.id = permission.category;
        this.name = categoryNames.get(permission.category) || '';
        this.actions = actionName;
    }

    public addEntity(permission: IPermission): EntityGroup {
        if (this.map.has(permission.entity)) {
            return this.map.get(permission.entity) as any;
        } else {
            const entity = new EntityGroup(permission, this);
            this.map.set(permission.entity, entity);
            this.entities.push(entity);
            return entity;
        }
    }

    public checkAll() {
        for (const entity of this.map.values()) {
            entity.checkAll();
        }
    }

    public checkCount() {
        let count = 0;
        for (const entity of this.map.values()) {
            for (const action of entity.actions) {
                if (action && action.control && action.control.value) {
                    count++;
                }
            }
        }
        this.count = count;
    }

    public disable(): void {
        for (const entity of this.entities) {
            entity.disable();
        }
    }

    public clearValue(): void {
        for (const entity of this.entities) {
            entity.clearValue();
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const entity of this.entities) {
            entity.addValue(permissions);
        }
    }
}
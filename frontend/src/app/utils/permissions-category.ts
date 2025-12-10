import { Permissions, PermissionCategories, PermissionEntities } from "@guardian/interfaces";
import { EntityAccess, EntityDelegate, EntityGroup, EntityLog, EntityPolicy } from "./permissions-entity";
import {
    ICategory,
    IEntity,
    IPermission,
    actionAccessName,
    actionName,
    actionPolicyName,
    categoryNames,
    delegateAccessName,
    actionLogsName
} from "./permissions-interface";

export class CategoryDetails implements ICategory {
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

    public checkAll() { }

    public disable(): void { }

    public clearValue(): void { }

    public addValue(permissions: Permissions[]): void { }

    public addEntity(permission: IPermission): EntityGroup {
        throw new Error("Method not implemented.");
    }

    public mergeValue(permissions: Permissions[]): void {
        throw new Error("Method not implemented.");
    }
}

export class CategoryAccess implements ICategory {
    public readonly type: string = 'Access';
    public readonly id: PermissionCategories;
    public readonly name: string;
    public readonly map = new Map<PermissionEntities, IEntity>();
    public readonly entities: IEntity[] = [];
    public readonly actions: string[];
    public count: number = 0;

    constructor() {
        this.id = PermissionCategories.ACCESS;
        this.name = 'Access';
        this.actions = actionAccessName;
    }

    public addEntity(permission: IPermission): IEntity {
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

    public checkAll() { }

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

    public mergeValue(permissions: Permissions[]): void {
        for (const entity of this.map.values()) {
            entity.mergeValue(permissions);
        }
    }
}

export class CategoryDelegate implements ICategory {
    public readonly type: string = 'Permissions';
    public readonly id: PermissionCategories;
    public readonly name: string;
    public readonly map = new Map<PermissionEntities, IEntity>();
    public readonly entities: IEntity[] = [];
    public readonly actions: string[];
    public count: number = 0;

    constructor() {
        this.id = PermissionCategories.DELEGATION;
        this.name = 'Delegate';
        this.actions = delegateAccessName;
    }

    public addEntity(permission: IPermission): IEntity {
        if (this.map.has(permission.entity)) {
            return this.map.get(permission.entity) as any;
        } else {
            const entity = new EntityDelegate(permission, this);
            this.map.set(permission.entity, entity);
            this.entities.push(entity);
            return entity;
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

    public checkAll() { }

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

    public mergeValue(permissions: Permissions[]): void {
        for (const entity of this.entities) {
            entity.mergeValue(permissions);
        }
    }
}

export class CategoryGroup implements ICategory {
    public readonly type: string = 'Permissions';
    public readonly id: PermissionCategories;
    public readonly name: string;
    public readonly map = new Map<PermissionEntities, EntityGroup>();
    public readonly entities: EntityGroup[] = [];
    public readonly actions: string[];
    public count: number = 0;

    constructor(permission: IPermission) {
        this.id = permission.category;
        this.name = categoryNames.get(permission.category) || permission.category || '';
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

    public mergeValue(permissions: Permissions[]): void {
        for (const entity of this.entities) {
            entity.mergeValue(permissions);
        }
    }
}


export class CategoryPolicy implements ICategory {
    public readonly type: string = 'Permissions';
    public readonly id: PermissionCategories;
    public readonly name: string;
    public readonly map = new Map<PermissionEntities, EntityPolicy>();
    public readonly entities: EntityPolicy[] = [];
    public readonly actions: string[];
    public count: number = 0;

    constructor(permission: IPermission) {
        this.id = permission.category;
        this.name = categoryNames.get(permission.category) || permission.category || '';
        this.actions = actionPolicyName;
    }

    public addEntity(permission: IPermission): EntityPolicy {
        if (this.map.has(permission.entity)) {
            return this.map.get(permission.entity) as any;
        } else {
            const entity = new EntityPolicy(permission, this);
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

    public mergeValue(permissions: Permissions[]): void {
        for (const entity of this.entities) {
            entity.mergeValue(permissions);
        }
    }
}

export class CategoryLogs implements ICategory {
    public readonly type: string = 'Permissions';
    public readonly id: PermissionCategories;
    public readonly name: string;
    public readonly map = new Map<PermissionEntities, IEntity>();
    public readonly entities: IEntity[] = [];
    public readonly actions: string[];
    public count: number = 0;

    constructor() {
        this.id = PermissionCategories.LOG;
        this.name = categoryNames.get(PermissionCategories.LOG) || 'Logs';
        this.actions = actionLogsName;
    }

    public addEntity(permission: IPermission): IEntity {
        if (this.map.has(permission.entity)) {
            return this.map.get(permission.entity) as any;
        } else {
            const entity = new EntityLog(permission, this);
            this.map.set(permission.entity, entity);
            this.entities.push(entity);
            return entity;
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

    public checkAll() { }

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

    public mergeValue(permissions: Permissions[]): void {
        for (const entity of this.entities) {
            entity.mergeValue(permissions);
        }
    }
}

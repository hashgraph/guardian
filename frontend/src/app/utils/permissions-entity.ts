import { UntypedFormControl } from "@angular/forms";
import { Permissions, PermissionActions, PermissionEntities } from "@guardian/interfaces";
import { ActionGroup } from "./permissions-action";
import { ICategory, IEntity, IPermission, accessIndexes, actionIndexes, entityNames } from "./permissions-interface";

export class EntityDelegate implements IEntity {
    public readonly parent: ICategory;
    public readonly id: PermissionEntities;
    public readonly name: string;
    public readonly type: string;
    public readonly actions: ActionGroup[];
    public readonly map = new Map<PermissionActions, ActionGroup>();
    public readonly canAll = false;

    public all: boolean = false;

    constructor(permission: IPermission, parent: ICategory) {
        this.parent = parent;
        this.id = permission.entity;
        this.name = entityNames.get(permission.entity) || permission.entity || '';
        this.type = 'checkbox';
        this.actions = new Array(1);
    }

    public get control(): UntypedFormControl {
        return null as any;
    }

    public addAction(permission: IPermission): ActionGroup {
        const action = new ActionGroup(permission, this);
        this.actions[0] = action;
        this.map.set(permission.action, action);
        return action;
    }

    public selectAll(): void { }

    public checkAll(): void { }

    public checkCount(): void {
        this.parent.checkCount();
    }

    public disable(): void {
        for (const action of this.actions) {
            if (action) {
                action.disable();
            }
        }
    }

    public clearValue(): void {
        for (const action of this.actions) {
            if (action) {
                action.clearValue();
            }
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }

    public mergeValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }
}

export class EntityGroup implements IEntity {
    public readonly parent: ICategory;
    public readonly id: PermissionEntities;
    public readonly name: string;
    public readonly type: string;
    public readonly actions: ActionGroup[];
    public readonly map = new Map<PermissionActions, ActionGroup>();
    public readonly canAll = true;

    public all: boolean = false;

    constructor(permission: IPermission, parent: ICategory) {
        this.parent = parent;
        this.id = permission.entity;
        this.name = entityNames.get(permission.entity) || permission.entity || '';
        if (permission.action === PermissionActions.ALL) {
            this.type = 'all';
            this.actions = new Array(1);
        } else {
            this.type = 'checkbox';
            this.actions = new Array(7);
        }
    }

    public get control(): UntypedFormControl {
        return null as any;
    }

    public addAction(permission: IPermission): ActionGroup {
        const action = new ActionGroup(permission, this);
        if (permission.action === PermissionActions.ALL) {
            this.actions[0] = action;
            this.map.set(permission.action, action);
        } else {
            const index = actionIndexes.get(permission.action) || 0;
            this.actions[index] = action;
            this.map.set(permission.action, action);
        }
        return action;
    }

    public selectAll(): void {
        let _all = true;
        for (const action of this.actions) {
            if (action && action.control) {
                _all = _all && action.control.value;
            }
        }
        _all = !_all;
        for (const action of this.actions) {
            if (action && action.control) {
                action.control.setValue(_all);
            }
        }
        this.all = _all;
    }

    public checkAll(): void {
        let _all = true;
        for (const action of this.actions) {
            if (action && action.control) {
                _all = _all && action.control.value;
            }
        }
        this.all = _all;
    }

    public checkCount(): void {
        this.parent.checkCount();
    }

    public disable(): void {
        for (const action of this.actions) {
            if (action) {
                action.disable();
            }
        }
    }

    public clearValue(): void {
        for (const action of this.actions) {
            if (action) {
                action.clearValue();
            }
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }

    public mergeValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }
}

export class EntityAccess implements IEntity {
    public readonly parent: ICategory;
    public readonly id: PermissionEntities;
    public readonly name: string;
    public readonly type: string;
    public readonly actions: ActionGroup[];
    public readonly map = new Map<PermissionActions, ActionGroup>();
    public readonly canAll = true;
    public readonly control: UntypedFormControl;

    public all: boolean = false;

    constructor(permission: IPermission, parent: ICategory) {
        this.parent = parent;
        this.id = permission.entity;
        this.name = entityNames.get(permission.entity) || permission.entity || '';
        this.type = 'radio';
        this.actions = new Array(4);
        this.control = new UntypedFormControl('Assigned & Published');
        this.control.valueChanges.subscribe(value => {
            for (const action of this.actions) {
                if (action) {
                    action.setValue(value === action.permission);
                }
            }
        });
    }

    public addAction(permission: IPermission): ActionGroup {
        const action = new ActionGroup(permission, this);
        const index = accessIndexes.get(permission.action) || 0;
        this.actions[index] = action;
        this.map.set(permission.action, action);
        return action;
    }

    public selectAll(): void { }

    public checkAll(): void { }

    public checkCount(): void {
        this.parent.checkCount();
    }

    public disable(): void {
        for (const action of this.actions) {
            if (action) {
                action.disable();
            }
        }
    }

    public clearValue(): void {
        this.control.setValue('');
        for (const action of this.actions) {
            if (action) {
                action.clearValue();
            }
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                const value = permissions && permissions.includes(action.permission);
                if (value) {
                    this.control.setValue(action.permission);
                }
            }
        }
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }

    public mergeValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }
}

export class EntityLog implements IEntity {
    public readonly parent: ICategory;
    public readonly id: PermissionEntities;
    public readonly name: string;
    public readonly type: string;
    public readonly actions: ActionGroup[];
    public readonly map = new Map<PermissionActions, ActionGroup>();
    public readonly canAll = true;

    public all: boolean = false;

    private static readonly logActionIndexes = new Map<PermissionActions, number>([
        [PermissionActions.READ, 0],
        [PermissionActions.SYSTEM, 1],
        [PermissionActions.USERS, 2]
    ]);

    constructor(permission: IPermission, parent: ICategory) {
        this.parent = parent;
        this.id = permission.entity;
        this.name = entityNames.get(permission.entity) || permission.entity || '';
        this.type = 'checkbox';
        this.actions = new Array(3);
    }

    public get control(): UntypedFormControl {
        return null as any;
    }

    public addAction(permission: IPermission): ActionGroup {
        const action = new ActionGroup(permission, this);
        const index = EntityLog.logActionIndexes.get(permission.action);
        if (index === undefined) {
            throw new Error(`Unhandled permission ${permission.name}`);
        }
        this.actions[index] = action;
        this.map.set(permission.action, action);
        return action;
    }

    public selectAll(): void {
        let _all = true;
        for (const action of this.actions) {
            if (action && !action.control.disabled) {
                _all = _all && action.control.value;
            }
        }
        _all = !_all;
        for (const action of this.actions) {
            if (action && !action.control.disabled) {
                action.setValue(_all);
            }
        }
        this.all = _all;
    }

    public checkAll(): void {
        let _all = true;
        for (const action of this.actions) {
            if (action && !action.control.disabled) {
                _all = _all && action.control.value;
            }
        }
        this.all = _all;
    }

    public checkCount(): void {
        this.parent.checkCount();
    }

    public disable(): void {
        for (const action of this.actions) {
            if (action) {
                action.disable();
            }
        }
    }

    public clearValue(): void {
        for (const action of this.actions) {
            if (action) {
                action.clearValue();
            }
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
        this.checkAll()
    }

    public mergeValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }
}

export class EntityPolicy implements IEntity {
    public readonly parent: ICategory;
    public readonly id: PermissionEntities;
    public readonly name: string;
    public readonly type: string;
    public readonly actions: ActionGroup[];
    public readonly map = new Map<PermissionActions, ActionGroup>();
    public readonly canAll = true;

    public all: boolean = false;

    constructor(permission: IPermission, parent: ICategory) {
        this.parent = parent;
        this.id = permission.entity;
        this.name = entityNames.get(permission.entity) || permission.entity || '';
        if (permission.action === PermissionActions.ALL) {
            this.type = 'all';
            this.actions = new Array(1);
        } else {
            this.type = 'checkbox';
            this.actions = new Array(8);
        }
    }

    public get control(): UntypedFormControl {
        return null as any;
    }

    public addAction(permission: IPermission): ActionGroup {
        const action = new ActionGroup(permission, this);
        if (permission.action === PermissionActions.ALL) {
            this.actions[0] = action;
            this.map.set(permission.action, action);
        } else {
            const index = actionIndexes.get(permission.action) || 0;
            this.actions[index] = action;
            this.map.set(permission.action, action);
        }
        return action;
    }

    public selectAll(): void {
        let _all = true;
        for (const action of this.actions) {
            if (action && action.control) {
                _all = _all && action.control.value;
            }
        }
        _all = !_all;
        for (const action of this.actions) {
            if (action && action.control) {
                action.control.setValue(_all);
            }
        }
        this.all = _all;
    }

    public checkAll(): void {
        let _all = true;
        for (const action of this.actions) {
            if (action && action.control) {
                _all = _all && action.control.value;
            }
        }
        this.all = _all;
    }

    public checkCount(): void {
        this.parent.checkCount();
    }

    public disable(): void {
        for (const action of this.actions) {
            if (action) {
                action.disable();
            }
        }
    }

    public clearValue(): void {
        for (const action of this.actions) {
            if (action) {
                action.clearValue();
            }
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }

    public mergeValue(permissions: Permissions[]): void {
        for (const action of this.actions) {
            if (action) {
                action.addValue(permissions);
            }
        }
    }
}
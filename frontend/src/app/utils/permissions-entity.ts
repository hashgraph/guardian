import { FormControl } from "@angular/forms";
import { Permissions, PermissionActions, PermissionEntities } from "@guardian/interfaces";
import { CategoryAccess, CategoryGroup } from "./permissions-category";
import { IPermission } from "./permissions";
import { ActionAccess, ActionGroup } from "./permissions-action";

const entityNames = new Map<PermissionEntities, string>([
    [PermissionEntities.ACCOUNT, 'Account'],
    [PermissionEntities.STANDARD_REGISTRY, 'Standard Registry'],
    [PermissionEntities.USER, 'User'],
    [PermissionEntities.BALANCE, 'Balance'],
    [PermissionEntities.RESTORE, 'Restore'],
    [PermissionEntities.RECORD, 'Record'],
    [PermissionEntities.POLICY, 'Policy'],
    [PermissionEntities.TOOL, 'Tool'],
    [PermissionEntities.DOCUMENT, 'Document'],
    [PermissionEntities.SCHEMA, 'Schema'],
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
    [PermissionEntities.ROLE, 'Role']
])

const actionIndexes = new Map<PermissionActions, number>([
    [PermissionActions.READ, 0],
    [PermissionActions.CREATE, 1],
    [PermissionActions.UPDATE, 2],
    [PermissionActions.DELETE, 3],
    [PermissionActions.REVIEW, 4],
    [PermissionActions.EXECUTE, 5],
    [PermissionActions.MANAGE, 6],

    [PermissionActions.ALL, -1],
    [PermissionActions.AUDIT, -1],
])

export class EntityAccess {
    public readonly parent: CategoryAccess;
    public readonly id: PermissionEntities;
    public readonly name: string;
    public readonly type: string;
    public readonly actions: ActionAccess[];
    public readonly map = new Map<PermissionActions, ActionGroup>();
    public readonly control: FormControl;

    constructor(permission: IPermission, parent: CategoryAccess) {
        this.parent = parent;
        this.id = permission.entity;
        this.name = entityNames.get(permission.entity) || '';
        this.type = 'group';
        this.actions = [
            new ActionAccess('Assigned', this),
            new ActionAccess('Published', this),
            new ActionAccess('Assigned & Published', this),
            new ActionAccess('All', this)
        ];
        this.control = new FormControl('Assigned & Published');
        this.control.valueChanges.subscribe(value => {
            for (const control of this.map.values()) {
                control.setValue(false);
            }
            if (value === 'Assigned') {
                this.map.get(PermissionActions.ASSIGNED)?.setValue(true);
            } else if (value === 'Published') {
                this.map.get(PermissionActions.PUBLISHED)?.setValue(true);
            } else if (value === 'Assigned & Published') {
                this.map.get(PermissionActions.ASSIGNED)?.setValue(true);
                this.map.get(PermissionActions.PUBLISHED)?.setValue(true);
            } else if (value === 'All') {
                this.map.get(PermissionActions.ALL)?.setValue(true);
            }
        });
    }

    public addAction(permission: IPermission): ActionGroup {
        const action = new ActionGroup(permission, this as any);
        this.map.set(permission.action, action);
        return action;
    }

    public disable(): void {
        this.control.disable();
        for (const action of this.map.values()) {
            action.disable();
        }
    }

    public clearValue(): void {
        this.control.setValue('Assigned & Published');
        for (const action of this.map.values()) {
            action.clearValue();
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const action of this.map.values()) {
            action.addValue(permissions);
        }
        const all = this.map.get(PermissionActions.ALL)?.getValue();
        const published = this.map.get(PermissionActions.PUBLISHED)?.getValue();
        const assigned = this.map.get(PermissionActions.ASSIGNED)?.getValue();
        if (all) {
            this.control.setValue('All');
        } else {
            if (assigned && published) {
                this.control.setValue('Assigned & Published');
            } else if (assigned) {
                this.control.setValue('Assigned');
            } else if (published) {
                this.control.setValue('Published');
            } else {
                this.control.setValue('');
            }
        }
    }
}

export class EntityGroup {
    public readonly parent: CategoryGroup;
    public readonly id: PermissionEntities;
    public readonly name: string;
    public readonly type: string;
    public readonly actions: ActionGroup[];
    public readonly map = new Map<PermissionActions, ActionGroup>();

    public all: boolean = false;

    constructor(permission: IPermission, parent: CategoryGroup) {
        this.parent = parent;
        this.id = permission.entity;
        this.name = entityNames.get(permission.entity) || '';
        if (permission.action === PermissionActions.ALL) {
            this.type = 'all';
            this.actions = new Array(1);
        } else {
            this.type = 'checkbox';
            this.actions = new Array(7);
        }
    }

    public get control(): FormControl {
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
        for (const action of this.map.values()) {
            action.disable();
        }
    }

    public clearValue(): void {
        for (const action of this.map.values()) {
            action.clearValue();
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const action of this.map.values()) {
            action.addValue(permissions);
        }
    }
}
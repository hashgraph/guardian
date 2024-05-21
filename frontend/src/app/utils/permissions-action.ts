import { FormControl } from "@angular/forms";
import { Permissions, PermissionActions } from "@guardian/interfaces";
import { IPermission } from "./permissions";
import { EntityAccess, EntityGroup } from "./permissions-entity";

export class ActionAccess {
    public readonly parent: EntityAccess;
    public readonly id: string;
    public tooltip: string;

    constructor(action: string, parent: EntityAccess) {
        this.parent = parent;
        this.id = action;
        this.tooltip = '';
    }
}

export class ActionGroup {
    public readonly parent: EntityGroup;
    public readonly id: PermissionActions;
    public readonly permission: Permissions;
    public readonly control: FormControl;
    public tooltip: string;

    constructor(permission: IPermission, parent: EntityGroup) {
        this.parent = parent;
        this.id = permission.action;
        this.permission = permission.name;
        this.control = new FormControl(false);
        this.tooltip = '';
    }

    public setValue(value: boolean): void {
        this.control.setValue(value);
    }

    public getValue(): boolean {
        return this.control.value;
    }

    public disable(): void {
        this.control.disable();
    }

    public clearValue(): void {
        this.control.setValue(false);
    }

    public addValue(permissions: Permissions[]): void {
        const value = permissions && permissions.includes(this.permission);
        this.control.setValue(value);
    }
}
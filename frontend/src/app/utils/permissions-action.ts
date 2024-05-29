import { FormControl } from "@angular/forms";
import { Permissions, PermissionActions } from "@guardian/interfaces";
import { IAction, IEntity, IPermission } from "./permissions-interface";

export class ActionGroup implements IAction {
    public readonly parent: IEntity;
    public readonly id: PermissionActions;
    public readonly permission: Permissions;
    public readonly control: FormControl;
    public readonly refs: ActionGroup[];
    public tooltip: string;
    private _disable: boolean;

    constructor(permission: IPermission, parent: IEntity) {
        this.parent = parent;
        this.id = permission.action;
        this.permission = permission.name;
        this.control = new FormControl(false);
        this.refs = [];
        this.tooltip = '';
        this._disable = false;
    }

    public setValue(value: boolean): void {
        this.control.setValue(value);
    }

    public getValue(): boolean {
        return this.control.value;
    }

    public disable(): void {
        this._disable = true;
        this.control.disable();
    }

    public clearValue(): void {
        this.control.setValue(false);
    }

    public addValue(permissions: Permissions[]): void {
        const value = permissions && permissions.includes(this.permission);
        const newValue = this.control.value || value;
        this.control.setValue(newValue);
    }

    public addRef(action: ActionGroup) {
        this.refs.push(action);
        action.control.valueChanges.subscribe(value => {
            this._update()
        });
    }

    private _update() {
        let dependent = false;
        for (const ref of this.refs) {
            dependent = dependent || ref.getValue();
        }
        if (dependent) {
            this.control.disable();
            if (!this.control.value) {
                this.control.setValue(true);
                this.parent.checkAll();
                this.parent.checkCount();
            }
        } else if (!this._disable) {
            this.control.enable();
        }
    }

    public isDepend(permissions: Permissions): boolean {
        if (this.permission === permissions) {
            return true;
        }
        if (this.refs && this.refs.length) {
            for (const ref of this.refs) {
                if (ref.permission === permissions) {
                    return true;
                }
            }
        }
        return false;
    }
}
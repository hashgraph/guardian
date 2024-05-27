import { FormControl, FormGroup } from "@angular/forms";
import { Permissions, PermissionActions, PermissionCategories, PermissionEntities } from "@guardian/interfaces";
import { CategoryAccess, CategoryDetails, CategoryGroup } from "./permissions-category";
import { ActionGroup } from "./permissions-action";

export interface IPermission {
    name: Permissions;
    category: PermissionCategories;
    entity: PermissionEntities;
    action: PermissionActions;
    disabled: boolean;
    default: boolean;
    dependOn?: Permissions[];
}

export class PermissionsGroup {
    public readonly form = new FormGroup({});
    public readonly controls = new Map<Permissions, FormControl>();
    public readonly actions = new Map<Permissions, ActionGroup>();
    public readonly map = new Map<PermissionCategories, CategoryGroup>();
    public readonly categories: CategoryGroup[] = [];

    public get first(): CategoryGroup {
        return this.categories[0];
    }

    public get last(): CategoryGroup {
        return this.categories[this.categories.length - 1];
    }

    public next(current: CategoryGroup | null): CategoryGroup {
        const index = this.categories.findIndex((e) => e === current);
        return this.categories[index + 1];
    }

    public addCategory(permission: IPermission): CategoryGroup {
        if (this.map.has(permission.category)) {
            return this.map.get(permission.category) as any;
        } else {
            const category = new CategoryGroup(permission);
            this.map.set(permission.category, category);
            this.categories.push(category);
            return category;
        }
    }

    public addRole(): void {
        const category = new CategoryDetails('Role Details')
        this.categories.unshift(category as any);
    }

    public addAccess(permissions: IPermission[]): void {
        const category = new CategoryAccess();
        this.categories.push(category as any);
        for (const permission of permissions) {
            if (permission.category === PermissionCategories.ACCESS) {
                const entity = category.addEntity(permission);
                const action = entity.addAction(permission);
                this.actions.set(permission.name, action);
                this.controls.set(permission.name, action.control);
                this.form.addControl(permission.name, action.control);
            }
        }
    }

    public disable(): void {
        for (const category of this.categories) {
            category.disable();
        }
    }

    public clearValue(): void {
        for (const category of this.categories) {
            category.clearValue();
        }
    }

    public addValue(permissions: Permissions[]): void {
        for (const category of this.categories) {
            category.addValue(permissions);
        }
    }

    public setValue(permissions: Permissions[]): void {
        this.clearValue();
        this.addValue(permissions);
        this.checkCount();
        this.checkAll();
    }

    public getValue(): Permissions[] {
        const permissions: Permissions[] = [];
        for (const [name, control] of this.controls) {
            if (control.value) {
                permissions.push(name);
            }
        }
        return permissions;
    }

    public checkCount() {
        for (const category of this.map.values()) {
            category.checkCount();
        }
    }

    public checkAll() {
        for (const category of this.map.values()) {
            category.checkAll();
        }
    }

    public getAction(permissions: Permissions): ActionGroup | undefined {
        return this.actions.get(permissions);
    }

    public getDependencies(permissions: Permissions): ActionGroup[] {
        const result:ActionGroup[] = [];
        for (const action of this.actions.values()) {
            if(action.isDepend(permissions)) {
                result.push(action);
            }
        }
        return result;
    }

    public static from(permissions: IPermission[]): PermissionsGroup {
        const group = new PermissionsGroup();
        for (const permission of permissions) {
            if (permission.category !== PermissionCategories.ACCESS) {
                const category = group.addCategory(permission);
                const entity = category.addEntity(permission);
                const action = entity.addAction(permission);
                group.actions.set(permission.name, action);
                group.controls.set(permission.name, action.control);
                group.form.addControl(permission.name, action.control);
            }
        }
        for (const permission of permissions) {
            const action = group.actions.get(permission.name);
            if(permission.dependOn) {
                for (const sub of permission.dependOn) {
                    const subAction = group.actions.get(sub);
                    if(action && subAction) {
                        subAction.addRef(action);
                    }
                }
            }
        }
        return group;
    }
}
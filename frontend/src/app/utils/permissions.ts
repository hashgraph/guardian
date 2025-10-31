import { UntypedFormControl, UntypedFormGroup } from "@angular/forms";
import { Permissions, PermissionCategories } from "@guardian/interfaces";
import { CategoryAccess, CategoryDelegate, CategoryDetails, CategoryGroup, CategoryLogs, CategoryPolicy } from "./permissions-category";
import { IAction, ICategory, IPermission } from "./permissions-interface";

export class PermissionsGroup {
    public readonly form = new UntypedFormGroup({});
    public readonly controls = new Map<Permissions, UntypedFormControl>();
    public readonly actions = new Map<Permissions, IAction>();
    public readonly map = new Map<PermissionCategories, ICategory>();
    public readonly categories: ICategory[] = [];

    public get first(): ICategory {
        return this.categories[0];
    }

    public get last(): ICategory {
        return this.categories[this.categories.length - 1];
    }

    public next(current: ICategory | null): ICategory {
        const index = this.categories.findIndex((e) => e === current);
        return this.categories[index + 1];
    }

    public addCategory(permission: IPermission): ICategory {
        if (this.map.has(permission.category)) {
            return this.map.get(permission.category) as any;
        } else {
            switch (permission.category) {
                case PermissionCategories.ACCESS: {
                    const category = new CategoryAccess();
                    this.map.set(permission.category, category);
                    this.categories.push(category);
                    return category;
                }
                case PermissionCategories.DELEGATION: {
                    const category = new CategoryDelegate();
                    this.map.set(permission.category, category);
                    this.categories.push(category);
                    return category;
                }
                case PermissionCategories.LOG: {
                    const category = new CategoryLogs();
                    this.map.set(permission.category, category);
                    this.categories.push(category);
                    return category;
                }
                case PermissionCategories.POLICIES: {
                    const category = new CategoryPolicy(permission);
                    this.map.set(permission.category, category);
                    this.categories.push(category);
                    return category;
                }
                default: {
                    const category = new CategoryGroup(permission);
                    this.map.set(permission.category, category);
                    this.categories.push(category);
                    return category;
                }
            }
        }
    }

    public addRole(): void {
        const category = new CategoryDetails('Role Details')
        this.categories.unshift(category as any);
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

    public mergeValue(permissions: Permissions[]): void {
        for (const category of this.categories) {
            category.mergeValue(permissions);
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

    public getAction(permissions: Permissions): IAction | undefined {
        return this.actions.get(permissions);
    }

    public getDependencies(permissions: Permissions): IAction[] {
        const result: IAction[] = [];
        for (const action of this.actions.values()) {
            if (action.isDepend(permissions)) {
                result.push(action);
            }
        }
        return result;
    }

    public static from(permissions: IPermission[]): PermissionsGroup {
        const group = new PermissionsGroup();
        for (const permission of permissions) {
            const category = group.addCategory(permission);
            const entity = category.addEntity(permission);
            const action = entity.addAction(permission);
            group.actions.set(permission.name, action);
            group.controls.set(permission.name, action.control);
            group.form.addControl(permission.name, action.control);
        }
        for (const permission of permissions) {
            const action = group.actions.get(permission.name);
            if (permission.dependOn) {
                for (const sub of permission.dependOn) {
                    const subAction = group.actions.get(sub);
                    if (action && subAction) {
                        subAction.addRef(action);
                    }
                }
            }
        }
        return group;
    }
}

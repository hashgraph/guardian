import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PermissionActions, PermissionCategories, PermissionEntities } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

const categoryNames = new Map<string, string>([
    ['ACCOUNTS', 'Accounts'],
    ['SESSION', 'Session'],
    ['PROFILES', 'Profiles'],
    ['ANALYTIC', 'Analytic'],
    ['ARTIFACTS', 'Artifacts'],
    ['POLICIES', 'Policies'],
    ['BRANDING', 'Branding'],
    ['CONTRACTS', 'Contracts'],
    ['DEMO', 'Demo'],
    ['IPFS', 'IPFS'],
    ['LOG', 'Logs'],
    ['MODULES', 'Modules'],
    ['SETTINGS', 'Settings'],
    ['SUGGESTIONS', 'Suggestions'],
    ['TAGS', 'Tags'],
    ['SCHEMAS', 'Schemas'],
    ['TOKENS', 'Tokens'],
    ['AUDIT', 'Audit'],
    ['TOOLS', 'Tools'],
    ['PERMISSIONS', 'Permissions']
])

const entityNames = new Map<string, string>([
    ['ACCOUNT', 'Account'],
    ['STANDARD_REGISTRY', 'Standard Registry'],
    ['USER', 'User'],
    ['BALANCE', 'Balance'],
    ['RESTORE', 'Restore'],
    ['RECORD', 'Record'],
    ['POLICY', 'Policy'],
    ['TOOL', 'Tool'],
    ['DOCUMENT', 'Document'],
    ['SCHEMA', 'Schema'],
    ['MODULE', 'Module'],
    ['FILE', 'File'],
    ['CONFIG', 'Config'],
    ['CONTRACT', 'Contract'],
    ['WIPE_REQUEST', 'Wipe Request'],
    ['WIPE_ADMIN', 'Wipe Admin'],
    ['WIPE_MANAGER', 'Wipe Manager'],
    ['WIPER', 'Wiper'],
    ['POOL', 'Pool'],
    ['RETIRE_REQUEST', 'Retire Request'],
    ['RETIRE_ADMIN', 'Retire Admin'],
    ['PERMISSIONS', 'Permissions'],
    ['KEY', 'Key'],
    ['LOG', 'Log'],
    ['MIGRATION', 'Migration'],
    ['SETTINGS', 'Settings'],
    ['SUGGESTIONS', 'Suggestions'],
    ['TAG', 'Tag'],
    ['SYSTEM_SCHEMA', 'System Schema'],
    ['THEME', 'Theme'],
    ['TOKEN', 'Token'],
    ['TRUST_CHAIN', 'Trust Chain'],
    ['ROLE', 'Role']
])

const actionIndexes = new Map<string, number>([
    ['READ', 0],
    ['CREATE', 1],
    ['UPDATE', 2],
    ['DELETE', 3],
    ['REVIEW', 4],
    ['EXECUTE', 5],
    ['ALL', -1],
    ['AUDIT', -1],
    ['ASSOCIATE', 7],
    ['MANAGE', 6]
])

@Component({
    selector: 'app-permissions-dialog',
    templateUrl: './permissions-dialog.component.html',
    styleUrls: ['./permissions-dialog.component.scss'],
})
export class PermissionsDialogComponent implements OnInit {
    public permissions: any[];
    public categories: any[];
    public currentId: string;
    public nameControl = new FormControl('Role Name', Validators.required);

    private controls: Map<string, FormControl>;

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig
    ) { }

    ngOnInit(): void {
        this.permissions = this.dialogConfig.data?.permissions || [];
        this.setPermissions(this.permissions);
        this.setData(this.dialogConfig.data?.role);
    }

    private setPermissions(permissions: {
        name: Permissions;
        category: PermissionCategories;
        entity: PermissionEntities;
        action: PermissionActions;
        disabled: boolean;
        default: boolean;
    }[]) {
        this.controls = new Map<string, FormControl>();

        const categories = new Map<string, any>();
        for (const permission of permissions) {
            if (!categories.has(permission.category)) {
                categories.set(permission.category, {
                    name: categoryNames.get(permission.category),
                    entities: new Map<string, any>()
                })
            }
            const entities = categories.get(permission.category).entities;
            if (!entities.has(permission.entity)) {
                entities.set(permission.entity, {
                    name: entityNames.get(permission.entity),
                    actions: new Array(7)
                })
            }
            const actions = entities.get(permission.entity).actions;
            const index = actionIndexes.get(permission.action) as number;
            const formControl = new FormControl(false);
            if (index === -1) {
                actions.length = 1;
                actions[0] = formControl
            } else if (Number.isFinite(index)) {
                actions[index] = formControl;
            }
            this.controls.set(String(permission.name), formControl);
        }

        this.categories = [];
        for (const category of categories.values()) {
            const entities: any[] = [];
            for (const entity of category.entities.values()) {
                entities.push({
                    name: entity.name,
                    actions: entity.actions,
                })
            }
            this.categories.push({
                name: category.name,
                entities
            });
        }
    }

    private setData(role:any) {
        if(role) {
            this.nameControl.setValue(role.name);
            for (const permission of role.permissions) {
                this.controls.get(permission)?.setValue(true);
            }
        }
    }

    public onClose() {
        this.dialogRef.close()
    }

    public onSave() {
        if (this.controls && this.nameControl.valid) {
            const role: any = {
                name: this.nameControl.value,
                permissions: []
            }
            for (const [permission, form] of this.controls.entries()) {
                if (form.value) {
                    role.permissions.push(permission);
                }
            }
            this.dialogRef.close(role);
        }
    }
}

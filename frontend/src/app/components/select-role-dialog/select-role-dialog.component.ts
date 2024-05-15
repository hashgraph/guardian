import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-select-role-dialog',
    templateUrl: './select-role-dialog.component.html',
    styleUrls: ['./select-role-dialog.component.scss'],
})
export class SelectRoleDialogComponent implements OnInit {
onChangeRoles() {
throw new Error('Method not implemented.');
}
    public roles: any[];
    public roleMap: Map<string, string>;
    public user: any;
    public permissionsGroup: string[];

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig
    ) { }

    ngOnInit(): void {
        this.roles = this.dialogConfig.data?.roles || [];
        this.user = this.dialogConfig.data?.user || {};
        this.roleMap = this.roles
            .reduce((map, role) => map.set(role.id, role.name), new Map<string, string>());
        if (this.user.permissionsGroup) {
            this.permissionsGroup = [...this.user.permissionsGroup];
        } else {
            this.permissionsGroup = []
        }
    }

    public onClose() {
        this.dialogRef.close()
    }

    public onSave() {
        this.user.permissionsGroup = this.permissionsGroup;
        this.dialogRef.close(this.user);
    }

    public getRoleName(roleId: string): string {
        return this.roleMap.get(roleId) || roleId;
    }

    public onDeleteRole(roleId: string) {
        this.permissionsGroup = this.permissionsGroup.filter((id) => id !== roleId);
    }

    public onFilter(event: any) {
    }
}

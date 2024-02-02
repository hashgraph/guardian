import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { UserRole } from '@guardian/interfaces';

@Component({
    selector: 'app-account-type-selector-dialog',
    templateUrl: './account-type-selector-dialog.component.html',
    styleUrls: ['./account-type-selector-dialog.component.scss']
})
export class AccountTypeSelectorDialogComponent implements OnInit {

    selectedRoleType: UserRole = UserRole.USER;

    get userRole() {
        return UserRole;
    }

    constructor(private dialogRef: DynamicDialogRef) {
    }

    ngOnInit(): void {
    }

    onNoClick() {
        this.dialogRef.close(false);
    }

    onSubmit() {
        this.dialogRef.close(this.selectedRoleType);
    }

    selectUserRole(userRole: UserRole) {
        this.selectedRoleType = userRole;
    }
}

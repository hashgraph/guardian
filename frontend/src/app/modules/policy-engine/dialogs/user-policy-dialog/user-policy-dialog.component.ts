import { Component } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { UserPermissions } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PermissionsService } from 'src/app/services/permissions.service';
import { ProfileService } from 'src/app/services/profile.service';

/**
 * Search policy dialog.
 */
@Component({
    selector: 'user-policy-dialog',
    templateUrl: './user-policy-dialog.component.html',
    styleUrls: ['./user-policy-dialog.component.scss']
})
export class UserPolicyDialog {
    public loading = false;
    public policy: any;
    public policyId: string;

    public user: UserPermissions = new UserPermissions();
    public page: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 10;
    public count: number = 0;

    public searchFilter = new UntypedFormControl('');
    public readonly: boolean = false;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private permissionsService: PermissionsService,
        private profileService: ProfileService,
    ) {
        this.policy = this.config.data?.policy || {};
        this.policyId = this.policy.id;
    }

    ngOnInit() {
        this.loadProfile();
    }

    private loadProfile() {
        this.loading = true;
        this.profileService
            .getProfile()
            .subscribe((profile) => {
                this.user = new UserPermissions(profile);
                this.loadData();
            }, (e) => {
                this.loadError(e);
            });
    }

    private loadError(error: any): void {
        this.page = [];
        this.count = 0;
        this.loading = false;
        console.error(error);
    }

    private loadData() {
        this.loading = true;
        const options = this.getFilters();
        this.permissionsService.getUsers(
            options,
            this.pageIndex,
            this.pageSize
        ).subscribe((response) => {
            this.page = response.body?.map((user: any) => {
                return user;
            }) || [];
            this.count = parseInt(response.headers.get('X-Total-Count') as any, 10) || this.page.length;
            this.updateUsers();
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loadError(e);
        });
    }

    private updateUsers() {
        for (const user of this.page) {
            user.assigned = !!user.assignedEntities?.find((e: any) => e.type === "Policy" && e.entityId === this.policyId);
        }
    }

    public onClose(): void {
        this.ref.close(null);
    }

    private getFilters() {
        const options: any = {};
        if (this.searchFilter && this.searchFilter.value) {
            options.username = this.searchFilter.value;
        }
        return options;
    }

    public onFilter() {
        this.loadData();
    }

    public assignPolicy(user: any) {
        if(this.readonly) {
            return;
        }
        const assign = !user.assigned;
        if (this.user.PERMISSIONS_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.assignPolicy(user.username, [this.policyId], assign).subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loadError(e);
            });
        } else if (this.user.DELEGATION_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.delegatePolicy(user.username, [this.policyId], assign).subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loadError(e);
            });
        }
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }
}
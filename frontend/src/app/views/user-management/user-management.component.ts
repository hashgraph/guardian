import { Component, OnDestroy, OnInit } from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';
import { ProfileService } from '../../services/profile.service';
import { UserPermissions } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
    selector: 'app-user-management',
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.scss']
})
export class UsersManagementComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public user: UserPermissions = new UserPermissions();
    public page: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 25;
    public count: number = 0;
    public roles: any[] = [];
    public roleFilterValue: any = { name: 'All' };
    public statusFilterValue: any = { name: 'All' };
    public roleFilterOption: any[] = [];
    public statusFilterOption = [{
        name: 'All',
    }, {
        name: 'Active',
        color: ''
    },
    {
        name: 'Inactive',
        color: ''
    }]
    public searchFilter = new FormControl('');
    public roleMap = new Map<string, string>();

    constructor(
        private permissionsService: PermissionsService,
        private profileService: ProfileService,
        private router: Router
    ) {
    }

    ngOnInit() {
        this.loadProfile();
    }

    ngOnDestroy() {
    }

    private loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.permissionsService.getRoles()
        ]).subscribe(([profile, roles]) => {
            this.user = new UserPermissions(profile);
            this.roles = roles.body || [];
            this.roleFilterOption = [{ name: 'All' }, ...this.roles];
            this.roleMap = this.roles
                .reduce((map, role) => map.set(role.id, role.name), new Map<string, string>());
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
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
            for (const user of this.page) {
                const permissionsGroup = [];
                if (Array.isArray(user.permissionsGroup)) {
                    for (const roleId of user.permissionsGroup) {
                        const name = this.roleMap.get(roleId) || roleId;
                        permissionsGroup.push(name);
                    }
                }
                user.__permissionsGroup = permissionsGroup.join(', ');
            }
            this.count = parseInt(response.headers.get('X-Total-Count') as any, 10) || this.page.length;
            setTimeout(() => {
                this.loading = false;
            }, 500);
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

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public onChangeRole(row: any) {
        this.loading = true;
        this.permissionsService.updateUser(row.username, row).subscribe((response) => {
            this.loadData();
        }, (e) => {
            this.loading = false;
            console.error(e);
        });
    }

    public onFilter() {
        this.loadData();
    }

    private getFilters() {
        const options: any = {};
        if (this.roleFilterValue && this.roleFilterValue.id) {
            options.role = this.roleFilterValue.id
        }
        if (this.statusFilterValue && this.statusFilterValue.name !== 'All') {
            options.status = this.statusFilterValue.name;
        }
        if (this.searchFilter && this.searchFilter.value) {
            options.username = this.searchFilter.value
        }
        return options;
    }

    public onChangeRoles(row:any) {
        this.router.navigate(['user-management', row.username]);
    }
}

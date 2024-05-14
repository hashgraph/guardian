import { Component, OnDestroy, OnInit } from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';
import { ProfileService } from '../../services/profile.service';
import { IUser, UserPermissions } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-users-view',
    templateUrl: './users-view.component.html',
    styleUrls: ['./users-view.component.scss']
})
export class UsersViewComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public user: UserPermissions = new UserPermissions();
    public page: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 25;
    public count: number = 0;
    public roles: any[] = [];

    constructor(
        private permissionsService: PermissionsService,
        private profileService: ProfileService,
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
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
    }

    private loadData() {
        this.loading = true;
        this.permissionsService.getUsers(this.pageIndex, this.pageSize).subscribe((response) => {
            this.page = response.body?.map((user: any) => {
                return user;
            }) || [];
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

    public onChangeRole(row: any, $event: any) {
        this.loading = true;
        this.permissionsService.updateUser(row.username, row).subscribe((response) => {
            this.loadData();
        }, (e) => {
            this.loading = false;
            console.error(e);
        });
    }
}

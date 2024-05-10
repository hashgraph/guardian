import { Component, OnDestroy, OnInit } from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';
import { ProfileService } from '../../services/profile.service';
import { UserPermissions } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { PermissionsDialogComponent } from 'src/app/components/permissions-dialog/permissions-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-roles-view',
    templateUrl: './roles-view.component.html',
    styleUrls: ['./roles-view.component.scss']
})
export class RolesViewComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public user: UserPermissions = new UserPermissions();
    public page: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 25;
    public count: number = 0;
    public permissions: any[] = [];

    constructor(
        private permissionsService: PermissionsService,
        private profileService: ProfileService,
        private dialog: DialogService
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
            this.permissionsService.permissions()
        ]).subscribe(([profile, permissions]) => {
            this.user = new UserPermissions(profile);
            this.permissions = permissions || [];
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
    }

    private loadData() {
        this.loading = true;
        this.permissionsService.getRoles(this.pageIndex, this.pageSize).subscribe((response) => {
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
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public onCreate() {
        this.dialog.open(PermissionsDialogComponent, {
            closable: true,
            modal: true,
            width: '850px',
            styleClass: 'custom-permissions-dialog',
            header: 'New Role',
            data: {
                permissions: this.permissions
            }
        }).onClose.subscribe((result: any) => {
            if (!result) {
                return;
            }
            this.saveRole(result)
        });
    }

    public saveRole(result: any) {
        console.log(result);
        this.loading = true;
        this.permissionsService.createRole(result).subscribe((response) => {
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
    }

    public updateRole(id: string, result: any) {
        console.log(result);
        this.loading = true;
        this.permissionsService.updateRole(id, result).subscribe((response) => {
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
    }

    public onDelete(row: any) {
        this.loading = true;
        this.permissionsService.deleteRole(row.id).subscribe((response) => {
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
    }

    public onEdit(row: any) {
        this.dialog.open(PermissionsDialogComponent, {
            closable: true,
            modal: true,
            width: '850px',
            styleClass: 'custom-permissions-dialog',
            header: 'New Role',
            data: {
                permissions: this.permissions,
                role: row
            }
        }).onClose.subscribe((result: any) => {
            if (!result) {
                return;
            }
            this.updateRole(row.id, result)
        });
    }

    public goToUsers(row: any) {
        throw new Error('Method not implemented.');
    }
}

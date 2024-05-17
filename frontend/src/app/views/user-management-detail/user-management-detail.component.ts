import { Component, OnDestroy, OnInit } from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';
import { ProfileService } from '../../services/profile.service';
import { IUser, PermissionActions, PermissionCategories, PermissionEntities, UserPermissions } from '@guardian/interfaces';
import { Subscription, forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { PermissionsUtils } from 'src/app/utils/permissions';

@Component({
    selector: 'app-user-management-detail',
    templateUrl: './user-management-detail.component.html',
    styleUrls: ['./user-management-detail.component.scss']
})
export class UsersManagementDetailComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public user: UserPermissions = new UserPermissions();
    public roles: any[] = [];
    public roleMap = new Map<string, any>();
    public target: any | null = null;
    public username: string = '';
    public permissionsGroup: string[];
    public controls: Map<string, any>;
    public categories: any[];
    public permissions: any[] = [];

    public policyPage: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 25;
    public policyCount: number = 0;
    public selectedIndex: number = 0;

    private subscription = new Subscription();

    constructor(
        private permissionsService: PermissionsService,
        private profileService: ProfileService,
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit() {
        this.username = this.route.snapshot.params['id'];
        this.loadProfile();
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                const username = this.route.snapshot.params['id'];
                if (this.username != username) {
                    this.loadData();
                }
            })
        );
    }

    ngOnDestroy() {
    }

    private loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.permissionsService.getRoles(),
            this.permissionsService.permissions()
        ]).subscribe(([profile, roles, permissions]) => {
            this.user = new UserPermissions(profile);
            this.roles = roles.body || [];
            this.roleMap = this.roles
                .reduce((map, role) => map.set(role.id, role), new Map<string, any>());
            this.permissions = permissions || [];
            const { controls, categories } = PermissionsUtils.parsePermissions(this.permissions);
            this.controls = controls;
            this.categories = categories;
            for (const control of controls.values()) {
                control.tooltip = ''
                control.formControl = new FormControl(false);
                control.formControl.disable();
            }
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
    }

    private loadData() {
        if (this.selectedIndex === 0) {
            this.loadUser();
        } else {
            this.loadPolicies();
        }
    }

    private loadUser() {
        this.loading = true;
        this.permissionsService.getUser(this.username).subscribe((user) => {
            this.target = user;
            if (this.target.permissionsGroup) {
                this.permissionsGroup = [...this.target.permissionsGroup];
            } else {
                this.permissionsGroup = []
            }
            this.updateControls();
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loadError(e);
        });
    }

    private loadPolicies() {
        this.loading = true;
        this.permissionsService.getPolicies(
            this.username,
            this.pageIndex,
            this.pageSize
        ).subscribe((response) => {
            this.policyPage = response.body || [];
            this.policyCount = parseInt(response.headers.get('X-Total-Count') as any, 10) || this.policyPage.length;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loadError(e);
        });
    }

    private loadError(error: any): void {
        this.target = null;
        this.loading = false;
        console.error(error);
    }

    private updateControls() {
        for (const control of this.controls.values()) {
            control.tooltip = ''
            control.formControl.setValue(false);
        }
        for (const id of this.permissionsGroup) {
            const role = this.roleMap.get(id);
            if (role && role.permissions) {
                for (const permission of role.permissions) {
                    const control = this.controls.get(permission);
                    if (control) {
                        control.tooltip = control.tooltip ?
                            `${control.tooltip}, ${role.name}` :
                            `${role.name}`
                        control.formControl.setValue(true);
                    }
                }
            }
        }
    }

    public onChangeRole() {
        this.updateControls();
        this.onSave();
    }

    public onDeleteRole(roleId: string) {
        this.permissionsGroup = this.permissionsGroup.filter((id) => id !== roleId);
        this.updateControls();
        this.onSave();
    }

    public goToPage() {
        this.router.navigate(['user-management']);
    }

    public getRoleName(roleId: string): string {
        return this.roleMap.get(roleId)?.name || roleId;
    }

    public onSave() {
        this.target.permissionsGroup = this.permissionsGroup;
        this.loading = true;
        this.permissionsService.updateUser(this.username, this.target).subscribe((response) => {
            this.loadData();
        }, (e) => {
            this.loading = false;
            console.error(e);
        });
    }

    public onChange(event: any) {
        this.selectedIndex = event;
        this.loadData();
    }

    public onPolicyPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public assignPolicy(policy: any) {

    }
}

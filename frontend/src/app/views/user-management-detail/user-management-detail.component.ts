import { Component, OnDestroy, OnInit } from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';
import { ProfileService } from '../../services/profile.service';
import { UserPermissions } from '@guardian/interfaces';
import { Subscription, forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionsGroup } from 'src/app/utils/index';

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
    public roleIds: string[];
    public roleGroups: {
        roleId: string,
        roleName: string,
        owner: string,
        own: boolean,
        canEdit: boolean
    }[];
    public group: PermissionsGroup;
    public permissions: any[] = [];
    public policyPage: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 25;
    public policyCount: number = 0;
    public selectedIndex: number = 0;
    public statusFilterValue: any = 'ALL';
    public statusFilterOption = [{
        name: 'All',
        value: 'ALL',
    }, {
        name: 'Draft',
        value: 'DRAFT',
        color: 'grey'
    },
    {
        name: 'Dry Run',
        value: 'DRY-RUN',
        color: 'grey'
    },
    {
        name: 'Publish Error',
        value: 'PUBLISH_ERROR',
        color: 'red'
    },
    {
        name: 'Discontinued',
        value: 'DISCONTINUED',
        color: 'red'
    },
    {
        name: 'Published',
        value: 'PUBLISH',
        color: 'green'
    }];
    public needSave: boolean = false;
    public allPolicy: boolean = false;

    private subscription = new Subscription();
    private oldGroups: Map<string, any>;

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
            this.group = PermissionsGroup.from(this.permissions);
            this.group.disable();
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
            this.setControls();
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
        const status = this.statusFilterValue;
        this.permissionsService.getPolicies(
            this.username,
            this.pageIndex,
            this.pageSize,
            status
        ).subscribe((response) => {
            this.policyPage = response.body || [];
            this.policyCount = parseInt(response.headers.get('X-Total-Count') as any, 10) || this.policyPage.length;
            this.allPolicy = true;
            for (const p of this.policyPage) {
                this.allPolicy = this.allPolicy && p.assigned;
                p._canAssign = !(p.assigned && p.assignedBy !== this.user.did && !this.user.PERMISSIONS_ROLE_MANAGE);
            }
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

    private setControls() {
        const oldGroups = new Map<string, any>();
        const groups = this.target.permissionsGroup || [];
        for (const group of groups) {
            const item = {
                roleId: group.roleId,
                roleName: group.roleName,
                owner: group.owner,
                canEdit: group.owner === this.user.did || this.user.PERMISSIONS_ROLE_MANAGE,
                own: group.owner === this.user.did
            }
            if (!item.canEdit) {
                const role = this.roleMap.get(item.roleId);
                if (role) {
                    role.disabled = true;
                }
            }
            if (oldGroups.has(item.roleId)) {
                const old = oldGroups.get(item.roleId);
                if (!old.own) {
                    oldGroups.set(item.roleId, item);
                }
            } else {
                oldGroups.set(item.roleId, item);
            }
        }
        this.roleIds = Array.from(oldGroups.keys());
        this.oldGroups = oldGroups;
    }

    private updateControls() {
        const roleGroups = new Map<string, any>();
        for (const id of this.roleIds) {
            const role = this.roleMap.get(id);
            roleGroups.set(id, {
                roleId: id,
                roleName: role?.name || id,
                owner: this.user.did,
                canEdit: true,
                own: true
            })
        }
        for (const group of this.oldGroups.values()) {
            if (group.canEdit && roleGroups.has(group.roleId)) {
                roleGroups.set(group.roleId, group);
            }
            if (!group.canEdit) {
                roleGroups.set(group.roleId, group);
            }
        }
        this.roleGroups = Array.from(roleGroups.values());

        this.group.clearValue();

        for (const action of this.group.actions.values()) {
            action.tooltip = '';
        }
        for (const group of this.roleGroups) {
            const role = this.roleMap.get(group.roleId);
            if (role && role.permissions) {
                this.group.mergeValue(role.permissions);
                for (const permission of role.permissions) {
                    const dependencies = this.group.getDependencies(permission);
                    for (const action of dependencies) {
                        if (action.tooltip) {
                            action.tooltip = `${action.tooltip}, "${role.name}"`;
                        } else {
                            action.tooltip = `Roles: "${role.name}"`;
                        }
                    }
                }
            }
        }
    }

    private changed(): boolean {
        if (!this.roleIds || !this.target) {
            return false;
        }
        if (!this.target.permissionsGroup) {
            return true;
        }
        if (this.roleIds.length !== this.target.permissionsGroup.length) {
            return true;
        }
        const list = new Set(this.roleIds);
        for (const group of this.target.permissionsGroup) {
            if (!list.has(group.roleId)) {
                return true;
            }
        }
        return false;
    }

    public onChangeRole() {
        this.updateControls();
        this.needSave = this.changed();
    }

    public onDeleteRole(roleId: string) {
        this.roleIds = this.roleIds.filter((id) => id !== roleId);
        this.updateControls();
        this.needSave = this.changed();
    }

    public goToPage() {
        this.router.navigate(['user-management']);
    }

    public getRoleName(roleId: string): string {
        return this.roleMap.get(roleId)?.name || roleId;
    }

    public onSave() {
        if (!this.changed()) {
            return;
        }
        if (this.user.PERMISSIONS_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.updateUser(
                this.username,
                this.roleIds
            ).subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
                console.error(e);
            });
        } else if (this.user.DELEGATION_ROLE_MANAGE) {
            this.loading = true;
            const ids = [];
            for (const group of this.roleGroups) {
                if (group.own) {
                    ids.push(group.roleId);
                }
            }
            this.permissionsService.delegateRole(this.username, ids).subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loading = false;
                console.error(e);
            });
        }
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
        const ids = [policy.id];
        const assign = !policy.assigned;
        if (this.user.PERMISSIONS_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.assignPolicy(this.username, ids, assign).subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loadError(e);
            });
        } else if (this.user.DELEGATION_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.delegatePolicy(this.username, ids, assign).subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loadError(e);
            });
        }
    }

    public getColor(status: string, expired: boolean = false) {
        switch (status) {
            case 'DRAFT':
                return 'grey';
            case 'DRY-RUN':
                return 'grey';
            case 'DISCONTINUED':
            case 'PUBLISH_ERROR':
                return 'red';
            case 'PUBLISH':
                return expired ? 'yellow' : 'green';
            default:
                return 'grey';
        }
    }

    public getLabelStatus(status: string, expired: boolean = false) {
        switch (status) {
            case 'DRAFT':
                return 'Draft';
            case 'DRY-RUN':
                return 'Dry Run';
            case 'PUBLISH_ERROR':
                return 'Publish Error';
            case 'PUBLISH':
                return `Published${expired ? '*' : ''}`;
            case 'DISCONTINUED':
                return `Discontinued`;
            default:
                return 'Incorrect status';
        }
    }

    public onFilter() {
        this.loadPolicies();
    }

    public onCancelRole() {
        this.needSave = false;
        this.setControls();
        this.updateControls();
    }

    public onSaveRole() {
        this.needSave = false;
        this.onSave();
    }

    public assignAllPolicy() {
        const ids: string[] = [];
        const assign = !this.allPolicy;
        for (const policy of this.policyPage) {
            if (policy.assigned !== assign && policy._canAssign) {
                ids.push(policy.id);
            }
        }
        if (!ids.length) {
            return;
        }
        if (this.user.PERMISSIONS_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.assignPolicy(this.username, ids, assign).subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loadError(e);
            });
        } else if (this.user.DELEGATION_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.delegatePolicy(this.username, ids, assign).subscribe((response) => {
                this.loadData();
            }, (e) => {
                this.loadError(e);
            });
        }
    }
}

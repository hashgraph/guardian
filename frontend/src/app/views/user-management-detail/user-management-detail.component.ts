import { Component, OnDestroy, OnInit } from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';
import { ProfileService } from '../../services/profile.service';
import { PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { Subscription, forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionsGroup, getUserInitials, shortDid } from 'src/app/utils/index';
import { ToastService } from 'src/app/services/toast.service';

@Component({
    selector: 'app-user-management-detail',
    templateUrl: './user-management-detail.component.html',
    styleUrls: ['../../modules/policy-engine/styles/top-toolbar.scss', './user-management-detail.component.scss'],
    standalone: false
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
    }[] = [];
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
        value: PolicyStatus.DRAFT,
        color: 'grey'
    },
    {
        name: 'Dry Run',
        value: PolicyStatus.DRY_RUN,
        color: 'grey'
    },
    {
        name: 'Publish Error',
        value: PolicyStatus.PUBLISH_ERROR,
        color: 'red'
    },
    {
        name: 'Discontinued',
        value: PolicyStatus.DISCONTINUED,
        color: 'red'
    },
    {
        name: 'Published',
        value: PolicyStatus.PUBLISH,
        color: 'green'
    }];
    public needSave: boolean = false;
    public allPolicy: boolean = false;
    public assignedCount: number = 0;
    public grantedCount: number = 0;
    public showAll: boolean = false;
    public shortDid = shortDid;
    public visiblePreview: typeof this.preview = [];
    public preview: {
        name: string,
        actions: string[],
        entities: { name: string, type: string, granted: boolean, cells: ({ value: boolean, tooltip: string } | null)[] }[]
    }[] = [];

    private subscription = new Subscription();
    private oldGroups: Map<string, any>;

    constructor(
        private permissionsService: PermissionsService,
        private profileService: ProfileService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
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
            this.needSave = false;
            this.setControls();
            this.updateControls();
            this.assignedCount = user?.assignedEntities?.length || 0;
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

    private loadAssignedCount() {
        this.permissionsService.getUser(this.username).subscribe((user) => {
            this.assignedCount = user?.assignedEntities?.length || 0;
        }, (e) => {
            console.error(e);
        });
    }

    public get parentLabel(): string {
        const parent = this.target?.parent;
        if (!parent) {
            return '';
        }
        return parent === this.user.did ? this.user.username : shortDid(parent);
    }

    public get initials(): string {
        return getUserInitials(this.username);
    }

    public copyDid() {
        if (this.target?.did) {
            navigator.clipboard.writeText(this.target.did).then(() => {
                this.toastService.success('Copied to clipboard');
            }).catch((error) => console.error(error));
        }
    }

    private updatePreview() {
        let granted = 0;
        const preview: typeof this.preview = [];
        for (const category of this.group.categories) {
            const entities = [];
            for (const entity of category.entities) {
                const cells = Array.from(entity.actions as any[], (action: any) => {
                    if (!action) {
                        return null;
                    }
                    return { value: !!action.control?.value, tooltip: action.tooltip || '' };
                });
                const count = cells.filter((cell) => cell?.value).length;
                granted += count;
                entities.push({ name: entity.name, type: entity.type, granted: count > 0, cells });
            }
            preview.push({ name: category.name, actions: category.actions, entities });
        }
        this.preview = preview;
        this.grantedCount = granted;
        this.updateVisiblePreview();
    }

    public setShowAll(value: boolean) {
        this.showAll = value;
        this.updateVisiblePreview();
    }

    private updateVisiblePreview() {
        this.visiblePreview = this.showAll
            ? this.preview
            : this.preview
                .map((category) => ({ ...category, entities: category.entities.filter((e) => e.granted) }))
                .filter((category) => category.entities.length);
    }

    public onToggleAssign(row: any, checked: boolean) {
        row.assigned = checked;
        this.assignPolicy(row, checked);
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
        this.updatePreview();
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

    public onChange(index: string | number | undefined) {
        this.selectedIndex = typeof index === 'number' ? index : 0;
        if (this.selectedIndex === 0 && this.needSave) {
            return;
        }
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

    public assignPolicy(policy: any, checked: boolean) {
        const ids = [policy.id];
        const assign = checked;
        if (this.user.PERMISSIONS_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.assignPolicy(this.username, ids, assign).subscribe((response) => {
                this.loadData();
                this.loadAssignedCount();
            }, (e) => {
                this.loadError(e);
            });
        } else if (this.user.DELEGATION_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.delegatePolicy(this.username, ids, assign).subscribe((response) => {
                this.loadData();
                this.loadAssignedCount();
            }, (e) => {
                this.loadError(e);
            });
        }
    }

    public getColor(status: string, expired: boolean = false) {
        switch (status) {
            case PolicyStatus.DRAFT:
                return 'grey';
            case PolicyStatus.DRY_RUN:
                return 'dry-run';
            case PolicyStatus.DISCONTINUED:
            case PolicyStatus.PUBLISH_ERROR:
                return 'red';
            case PolicyStatus.PUBLISH:
                return expired ? 'yellow' : 'green';
            default:
                return 'grey';
        }
    }

    public getLabelStatus(status: string, expired: boolean = false) {
        switch (status) {
            case PolicyStatus.DRAFT:
                return 'Draft';
            case PolicyStatus.DRY_RUN:
                return 'Dry Run';
            case PolicyStatus.PUBLISH_ERROR:
                return 'Publish Error';
            case PolicyStatus.PUBLISH:
                return `Published${expired ? '*' : ''}`;
            case PolicyStatus.DISCONTINUED:
                return `Discontinued`;
            default:
                return 'Incorrect status';
        }
    }

    public onFilter() {
        this.loadPolicies();
    }

    public onCancelRole() {
        if (!this.needSave) {
            return;
        }
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
        const assign = this.allPolicy;
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
                this.loadAssignedCount();
            }, (e) => {
                this.loadError(e);
            });
        } else if (this.user.DELEGATION_ROLE_MANAGE) {
            this.loading = true;
            this.permissionsService.delegatePolicy(this.username, ids, assign).subscribe((response) => {
                this.loadData();
                this.loadAssignedCount();
            }, (e) => {
                this.loadError(e);
            });
        }
    }
}

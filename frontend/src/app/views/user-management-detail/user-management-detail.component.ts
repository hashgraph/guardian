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
    public permissionsGroup: string[];
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
    }]

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
            this.group = PermissionsGroup.from(this.permissions);
            this.group.addAccess(this.permissions);
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
        const status = this.statusFilterValue;
        this.permissionsService.getPolicies(
            this.username,
            this.pageIndex,
            this.pageSize,
            status
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
        this.group.clearValue();
        for (const id of this.permissionsGroup) {
            const role = this.roleMap.get(id);
            if (role && role.permissions) {
                this.group.addValue(role.permissions);
                for (const permission of role.permissions) {
                    const action = this.group.getAction(permission);
                    if (action) {
                        action.tooltip = action.tooltip ?
                            `${action.tooltip}, ${role.name}` :
                            `${role.name}`;
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
        this.loading = true;
        this.permissionsService.assignPolicy(
            this.username,
            policy.id,
            !policy.assigned
        ).subscribe((response) => {
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
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
}

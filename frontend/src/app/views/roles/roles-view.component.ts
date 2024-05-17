import { Component, OnDestroy, OnInit } from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';
import { ProfileService } from '../../services/profile.service';
import { UserPermissions } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { PermissionsUtils } from 'src/app/utils/permissions';

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
    public searchFilter = new FormControl('');
    public newRole: FormGroup | null = null;
    public controls: Map<string, any>;
    public categories: any[];
    public selectedCategory: any = null;
    public lastCategory: boolean = false;

    constructor(
        private permissionsService: PermissionsService,
        private profileService: ProfileService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder
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
        const options = this.getFilters();
        this.permissionsService.getRoles(
            options,
            this.pageIndex,
            this.pageSize
        ).subscribe((response) => {
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
        this.openEditView();
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

    public onSave() {
        if (this.newRole?.valid) {
            const role = this.newRole.value;
            const permissions: string[] = [];
            for (const [key, value] of Object.entries(role.permissions)) {
                if (value === true) {
                    permissions.push(key)
                }
            }
            role.permissions = permissions;
            if (role.id) {
                this.updateRole(role.id, role);
            } else {
                this.saveRole(role);
            }
            this.newRole = null;
        }
    }

    public onEdit(row: any) {
        this.openEditView(row);
    }

    public goToUsers(row: any) {
        this.router.navigate(['user-management'], {
            queryParams: {
                role: row.id
            },
        });
    }

    public onFilter() {
        const filters = this.getFilters();
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: filters
        });
        this.loadData();
    }

    private getFilters() {
        const options: any = {};
        if (this.searchFilter && this.searchFilter.value) {
            options.name = this.searchFilter.value
        }
        return options;
    }

    public goToPage() {
        this.newRole = null;
    }

    private openEditView(row?: any) {
        const { controls, categories } = PermissionsUtils.parsePermissions(this.permissions);
        this.controls = controls;
        this.categories = categories;
        for (const control of controls.values()) {
            control.formControl = new FormControl(false);
        }
        this.categories.unshift({
            name: 'Role Details',
        })

        const permissions = new FormGroup({});
        this.newRole = this.fb.group({
            id: [row?.id],
            name: [row?.name || 'Role name', Validators.required],
            description: [row?.description || 'Role name'],
            permissions
        });
        for (const [name, control] of controls) {
            permissions.addControl(name, control.formControl);
        }
        if (row?.permissions) {
            for (const permission of row.permissions) {
                this.controls.get(permission)?.formControl?.setValue(true);
            }
        }
        for (const category of this.categories) {
            this.checkCount(category);
        }
        this.selectedCategory = this.categories[0];
        this.lastCategory = false;
    }

    private checkCount(category: any) {
        let count = 0;
        if (category.entities) {
            for (const entity of category.entities) {
                for (const action of entity.actions) {
                    if (action && action.formControl && action.formControl.value) {
                        count++;
                    }
                }
            }
        }
        category.count = count;
    }

    public onSelectCategory(category: any) {
        this.selectedCategory = category;
        this.lastCategory = this.categories[this.categories.length - 1] === category;
    }

    public onAll(entity: any) {
        let _all = true;
        for (const action of entity.actions) {
            if (action && action.formControl) {
                _all = _all && action.formControl.value;
            }
        }
        _all = !_all;
        for (const action of entity.actions) {
            if (action && action.formControl) {
                action.formControl.setValue(_all);
            }
        }
        entity.all = _all;
        this.checkCount(this.selectedCategory);
    }

    public onCheckAll(entity: any) {
        let _all = true;
        for (const action of entity.actions) {
            if (action && action.formControl) {
                _all = _all && action.formControl.value;
            }
        }
        entity.all = _all;
        this.checkCount(this.selectedCategory);
    }

    public onNextLabel(): string {
        if (!this.lastCategory) {
            return 'Next';
        }
        return this.newRole?.value.id ? 'Save' : 'Create';
    }

    public onNext() {
        if (this.lastCategory) {
            this.onSave()
        } else {
            const index = this.categories.findIndex((e) => e === this.selectedCategory);
            this.selectedCategory = this.categories[index + 1];
            this.lastCategory = this.categories[this.categories.length - 1] === this.selectedCategory;
        }
    }
}

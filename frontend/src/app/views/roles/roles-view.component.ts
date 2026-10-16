import { Component, OnDestroy, OnInit } from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';
import { ProfileService } from '../../services/profile.service';
import { UserPermissions } from '@guardian/interfaces';
import { Subscription, forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { PermissionsGroup } from 'src/app/utils/index';
import { ICategory, IEntity } from 'src/app/utils/permissions-interface';
import { DialogService } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';

@Component({
    selector: 'app-roles-view',
    templateUrl: './roles-view.component.html',
    styleUrls: ['../../modules/policy-engine/styles/top-toolbar.scss', './roles-view.component.scss'],
    standalone: false
})
export class RolesViewComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public user: UserPermissions = new UserPermissions();
    public page: any[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 25;
    public count: number = 0;
    public permissions: any[] = [];
    public searchFilter = new UntypedFormControl('');
    public newRole: UntypedFormGroup | null = null;
    public controls: Map<string, any>;
    public group: PermissionsGroup;
    public selectedCategory: ICategory | null = null;
    public editingRow: any | null = null;
    public dirty: boolean = false;
    public categoryCount: number = 0;
    public defaultRoleName: string = '';
    public generalCategories: ICategory[] = [];
    public permissionCategories: ICategory[] = [];
    public accessCategories: ICategory[] = [];

    private snapshot: string = '';
    private formSubscription?: Subscription;

    constructor(
        private permissionsService: PermissionsService,
        private profileService: ProfileService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: UntypedFormBuilder,
        private dialog: DialogService,
    ) {
    }

    ngOnInit() {
        this.loadProfile();
    }

    ngOnDestroy() {
        this.formSubscription?.unsubscribe();
    }

    private loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.permissionsService.permissions()
        ]).subscribe(([profile, permissions]) => {
            this.user = new UserPermissions(profile);
            this.permissions = permissions || [];
            this.categoryCount = PermissionsGroup.from(this.permissions).categories.length;
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
            this.loadDefaultRole();
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
        const dialogRef = this.dialog.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete Role',
                text: `Are you sure want to delete role (${row.name})?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.loading = true;
                this.permissionsService.deleteRole(row.id).subscribe((response) => {
                    this.loadData();
                }, (e) => {
                    this.loadError(e);
                });
            }
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
            this.goToPage();
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
        this.formSubscription?.unsubscribe();
        this.newRole = null;
        this.editingRow = null;
    }

    private loadDefaultRole() {
        this.permissionsService.getRoles().subscribe((response) => {
            this.defaultRoleName = (response.body || []).find((role: any) => role.default)?.name || '';
        }, (e) => {
            console.error(e);
        });
    }

    public get isNew(): boolean {
        return !this.newRole?.value.id;
    }

    public get canSave(): boolean {
        return !!this.newRole && this.newRole.valid && (this.isNew || this.dirty);
    }

    public getCount(category: ICategory): number {
        if (category.type === 'Access') {
            return category.entities.filter((entity) => entity.control?.value).length;
        }
        return category.count;
    }

    public getTotal(category: ICategory): number {
        if (category.type === 'Access') {
            return category.entities.length;
        }
        let total = 0;
        for (const entity of category.entities) {
            total += entity.actions.filter((action) => !!action).length;
        }
        return total;
    }

    public get coverage(): { category: ICategory, count: number, total: number }[] {
        const list = [];
        for (const category of [...this.permissionCategories, ...this.accessCategories]) {
            const count = this.getCount(category);
            if (count > 0) {
                list.push({ category, count, total: this.getTotal(category) });
            }
        }
        return list.sort((a, b) => b.count - a.count);
    }

    public get coverageTotal(): number {
        return this.coverage.reduce((sum, item) => sum + item.count, 0);
    }

    public get emptyCategories(): ICategory[] {
        return [...this.permissionCategories, ...this.accessCategories]
            .filter((category) => this.getCount(category) === 0);
    }

    public onSelectEmpty() {
        const category = this.emptyCategories[0];
        if (category) {
            this.onSelectCategory(category);
        }
    }

    private openEditView(row?: any) {
        this.group = PermissionsGroup.from(this.permissions);
        this.newRole = this.fb.group({
            id: [row?.id],
            name: [row?.name || '', Validators.required],
            description: [row?.description || ''],
            permissions: this.group.form
        });
        this.group.addRole();
        this.group.setValue(row?.permissions);
        this.group.checkCount();
        this.editingRow = row || null;
        this.generalCategories = this.group.categories.filter((c) => c.type === 'Role');
        this.permissionCategories = this.group.categories.filter((c) => c.type === 'Permissions');
        this.accessCategories = this.group.categories.filter((c) => c.type === 'Access');
        this.selectedCategory = this.group.first;
        this.dirty = false;
        this.snapshot = JSON.stringify(this.newRole.getRawValue());
        this.formSubscription?.unsubscribe();
        this.formSubscription = this.newRole.valueChanges.subscribe(() => {
            this.dirty = JSON.stringify(this.newRole?.getRawValue()) !== this.snapshot;
        });
    }

    public onSelectCategory(category: ICategory) {
        this.selectedCategory = category;
    }

    public onAll(entity: IEntity) {
        entity.selectAll();
        this.group.checkCount();
    }

    public onCheckAll(entity: IEntity) {
        entity.checkAll();
        this.group.checkCount();
    }

    public setDefault(row: any) {
        if (row.default) {
            return;
        }
        this.loading = true;
        this.permissionsService.setDefaultRole(row.id).subscribe((response) => {
            row.default = true;
            this.loadData();
        }, (e) => {
            this.loadError(e);
        });
    }
}

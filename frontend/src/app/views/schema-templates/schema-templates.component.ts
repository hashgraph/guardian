import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ISchemaTemplate, ModuleStatus, UserPermissions } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaTemplateGridItem, SchemaTemplatesService } from 'src/app/services/schema-templates.service';

interface TemplateForm {
    id?: string;
    name: string;
    description: string;
}

@Component({
    selector: 'app-schema-templates',
    templateUrl: './schema-templates.component.html',
    styleUrls: ['./schema-templates.component.scss'],
    standalone: false
})
export class SchemaTemplatesComponent implements OnInit {
    public loading: boolean = true;
    public templates: SchemaTemplateGridItem[] = [];
    public total: number = 0;
    public pageIndex: number = 0;
    public pageSize: number = 20;
    public user: UserPermissions = new UserPermissions();
    public isConfirmed: boolean = false;
    public textSearch: string = '';

    public showTemplateDialog: boolean = false;
    public saving: boolean = false;
    public form: TemplateForm = this.getEmptyForm();

    constructor(
        private readonly profileService: ProfileService,
        private readonly templatesService: SchemaTemplatesService,
        private readonly dialogService: DialogService,
        private readonly route: ActivatedRoute,
        private readonly router: Router
    ) {
    }

    public ngOnInit(): void {
        this.textSearch = this.route.snapshot.queryParams['search'] || '';
        this.loadProfile();
    }

    public get canCreate(): boolean {
        return this.isConfirmed && this.user.TEMPLATES_TEMPLATE_CREATE;
    }

    public canEdit(template: SchemaTemplateGridItem): boolean {
        return this.isConfirmed &&
            this.user.TEMPLATES_TEMPLATE_UPDATE &&
            template.status !== ModuleStatus.PUBLISHED;
    }

    public canExport(template: SchemaTemplateGridItem): boolean {
        return this.isConfirmed &&
            this.user.TEMPLATES_TEMPLATE_READ &&
            template.status === ModuleStatus.PUBLISHED;
    }

    public canDelete(template: SchemaTemplateGridItem): boolean {
        return this.isConfirmed &&
            this.user.TEMPLATES_TEMPLATE_DELETE &&
            template.status !== ModuleStatus.PUBLISHED;
    }

    public openCreateDialog(): void {
        this.form = this.getEmptyForm();
        this.showTemplateDialog = true;
    }

    public openEditDialog(template: SchemaTemplateGridItem): void {
        if (!this.canEdit(template)) {
            return;
        }
        this.form = {
            id: template.id,
            name: template.name || '',
            description: template.description || ''
        };
        this.showTemplateDialog = true;
    }

    public exportTemplate(template: SchemaTemplateGridItem): void {
        if (!this.canExport(template)) {
            return;
        }
    }

    public saveTemplate(): void {
        if (!this.form.name.trim() || this.saving) {
            return;
        }
        this.saving = true;
        const payload: Partial<ISchemaTemplate> = {
            name: this.form.name.trim(),
            description: this.form.description.trim()
        };
        if (this.form.id) {
            this.templatesService.update(this.form.id, payload).subscribe({
                next: () => {
                    this.saving = false;
                    this.showTemplateDialog = false;
                    this.loadTemplates();
                },
                error: () => {
                    this.saving = false;
                }
            });
            return;
        }

        this.templatesService.pushCreate(payload).subscribe({
            next: (result) => {
                this.saving = false;
                this.showTemplateDialog = false;
                void this.router.navigate(['/task', result.taskId], {
                    queryParams: {
                        last: btoa(location.href)
                    }
                });
            },
            error: () => {
                this.saving = false;
            }
        });
    }

    public deleteTemplate(template: SchemaTemplateGridItem): void {
        const id = template.id || (template as any)._id;
        if (!id || !this.canDelete(template)) {
            return;
        }
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete Schema Template',
                text: `Are you sure want to delete schema template (${template.name})?`,
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
                this.templatesService.pushDelete(id).subscribe({
                    next: (task) => {
                        void this.router.navigate(['/task', task.taskId], {
                            queryParams: {
                                last: btoa(location.href)
                            }
                        });
                    },
                    error: () => {
                        this.loading = false;
                    }
                });
            }
        });
    }

    public openSchemas(template: SchemaTemplateGridItem): void {
        if (!template.topicId) {
            return;
        }
        void this.router.navigate(['/schema-configuration'], {
            queryParams: {
                type: 'template',
                topic: template.topicId,
                templateId: template.id || (template as any)._id
            }
        });
    }

    public onPage(event: any): void {
        this.pageIndex = Math.floor((event.first || 0) / (event.rows || this.pageSize));
        this.pageSize = event.rows || this.pageSize;
        this.loadTemplates();
    }

    public applyFilters(): void {
        this.pageIndex = 0;
        this.router.navigate(['/schema-templates'], {
            queryParams: {
                search: this.textSearch || null
            }
        });
        this.loadTemplates();
    }

    public clearFilters(): void {
        this.textSearch = '';
        this.pageIndex = 0;
        this.router.navigate(['/schema-templates'], {
            queryParams: {
                search: null
            }
        });
        this.loadTemplates();
    }

    public getStatusLabel(status?: ModuleStatus): string {
        switch (status) {
            case ModuleStatus.PUBLISHED:
                return 'Published';
            case ModuleStatus.PUBLISH_ERROR:
                return 'Publish Error';
            case ModuleStatus.DRY_RUN:
                return 'Dry Run';
            case ModuleStatus.DRAFT:
            default:
                return 'Draft';
        }
    }

    public getStatusColor(status?: ModuleStatus): string {
        switch (status) {
            case ModuleStatus.PUBLISHED:
                return 'green';
            case ModuleStatus.PUBLISH_ERROR:
                return 'red';
            case ModuleStatus.DRY_RUN:
                return 'blue';
            case ModuleStatus.DRAFT:
            default:
                return 'grey';
        }
    }

    private loadProfile(): void {
        this.loading = true;
        this.profileService.getProfile().subscribe({
            next: (profile) => {
                this.isConfirmed = !!profile?.confirmed;
                this.user = new UserPermissions(profile);
                if (this.isConfirmed) {
                    this.loadTemplates();
                } else {
                    this.loading = false;
                }
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    private loadTemplates(): void {
        this.loading = true;
        this.templatesService.page(this.pageIndex, this.pageSize, this.textSearch).subscribe({
            next: (response) => {
                this.templates = response.body || [];
                this.total = Number(response.headers.get('X-Total-Count') || this.templates.length);
                this.loading = false;
            },
            error: () => {
                this.templates = [];
                this.total = 0;
                this.loading = false;
            }
        });
    }

    private getEmptyForm(): TemplateForm {
        return {
            name: '',
            description: ''
        };
    }
}

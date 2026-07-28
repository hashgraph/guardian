import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ISchemaTemplate, ModuleStatus, UserPermissions } from '@guardian/interfaces';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaTemplateGridItem, SchemaTemplatesService } from 'src/app/services/schema-templates.service';

interface TemplateForm {
    id?: string;
    name: string;
    description: string;
    version: string;
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

    public showTemplateDialog: boolean = false;
    public saving: boolean = false;
    public form: TemplateForm = this.getEmptyForm();

    constructor(
        private readonly profileService: ProfileService,
        private readonly templatesService: SchemaTemplatesService,
        private readonly router: Router
    ) {
    }

    public ngOnInit(): void {
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
        this.form = {
            id: template.id,
            name: template.name || '',
            description: template.description || '',
            version: template.version || ''
        };
        this.showTemplateDialog = true;
    }

    public saveTemplate(): void {
        if (!this.form.name.trim() || this.saving) {
            return;
        }
        this.saving = true;
        const payload: Partial<ISchemaTemplate> = {
            name: this.form.name.trim(),
            description: this.form.description.trim(),
            version: this.form.version.trim() || undefined
        };
        const request = this.form.id
            ? this.templatesService.update(this.form.id, payload)
            : this.templatesService.create(payload);

        request.subscribe({
            next: () => {
                this.saving = false;
                this.showTemplateDialog = false;
                this.loadTemplates();
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
        if (!confirm(`Delete schema template "${template.name}"?`)) {
            return;
        }
        this.templatesService.delete(id).subscribe({
            next: () => this.loadTemplates()
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
        this.templatesService.page(this.pageIndex, this.pageSize).subscribe({
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
            description: '',
            version: ''
        };
    }
}

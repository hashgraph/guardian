import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ISchemaTemplate, ModuleStatus, UserPermissions } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { ImportEntityDialog, ImportEntityType, IImportEntityResult } from 'src/app/modules/common/import-entity-dialog/import-entity-dialog.component';
import { ExportPolicyDialog } from 'src/app/modules/policy-engine/dialogs/export-policy-dialog/export-policy-dialog.component';
import { PublishSchemaTemplateDialog } from 'src/app/modules/policy-engine/dialogs/publish-schema-template-dialog/publish-schema-template-dialog.component';
import { Subject, takeUntil } from 'rxjs';
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
export class SchemaTemplatesComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public templates: SchemaTemplateGridItem[] = [];
    public total: number = 0;
    public pageIndex: number = 0;
    public pageSize: number = 25;
    public user: UserPermissions = new UserPermissions();
    public isConfirmed: boolean = false;
    public textSearch: string = '';
    public publishMenuSelector: any = null;

    private readonly publishStatusOptions = [{
        id: 'Publish',
        title: 'Publish',
        description: 'Release version into public domain.',
        color: '#4caf50',
    }];

    public showTemplateDialog: boolean = false;
    public saving: boolean = false;
    public form: TemplateForm = this.getEmptyForm();
    private readonly destroy$ = new Subject<void>();

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

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public get canCreate(): boolean {
        return this.isConfirmed && this.user.TEMPLATES_TEMPLATE_CREATE;
    }

    public canEdit(): boolean {
        return this.isConfirmed && this.user.TEMPLATES_TEMPLATE_READ;
    }

    public canExport(): boolean {
        return this.isConfirmed && this.user.TEMPLATES_TEMPLATE_READ;
    }

    public canDelete(template: SchemaTemplateGridItem): boolean {
        return this.isConfirmed &&
            this.user.TEMPLATES_TEMPLATE_DELETE &&
            template.status !== ModuleStatus.PUBLISHED;
    }

    public canPublish(template: SchemaTemplateGridItem): boolean {
        return this.isConfirmed &&
            this.user.TEMPLATES_TEMPLATE_UPDATE &&
            template.status !== ModuleStatus.PUBLISHED;
    }

    public canCreateNewVersion(template: SchemaTemplateGridItem): boolean {
        return this.isConfirmed &&
            this.user.TEMPLATES_TEMPLATE_UPDATE &&
            template.status === ModuleStatus.PUBLISHED;
    }

    public openCreateDialog(): void {
        this.form = this.getEmptyForm();
        this.showTemplateDialog = true;
    }

    public openEditDialog(template: SchemaTemplateGridItem): void {
        if (!this.canEdit()) {
            return;
        }
        this.openTemplateConfiguration(template);
    }

    public exportTemplate(template: SchemaTemplateGridItem): void {
        if (!this.canExport()) {
            return;
        }
        const id = template.id || (template as any)._id;
        if (!id) {
            return;
        }
        this.loading = true;
        this.templatesService.exportInMessage(id).subscribe({
            next: (schemaTemplate) => {
                this.loading = false;
                this.dialogService.open(ExportPolicyDialog, {
                    showHeader: false,
                    header: 'Export Schema Template',
                    width: '700px',
                    styleClass: 'guardian-dialog',
                    data: {
                        schemaTemplate
                    },
                });
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    public importTemplate(messageId?: string): void {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.Template,
                timeStamp: messageId
            }
        })!;
        dialogRef.onClose.subscribe((result: IImportEntityResult | null) => {
            if (result) {
                this.importTemplateDetails(result);
            }
        });
    }

    private importTemplateDetails(result: IImportEntityResult): void {
        this.loading = true;
        const request = result.type === 'message'
            ? this.templatesService.pushImportByMessage(result.data)
            : this.templatesService.pushImportByFile(result.data);
        request.subscribe({
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
        const usedByPoliciesCount = template.usedByPoliciesCount || 0;
        const usedByPolicyNames = template.usedByPolicyNames || [];
        const isUsedByPolicies = usedByPoliciesCount > 0;
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete Schema Template',
                text: isUsedByPolicies
                    ? `Schema template "${template.name}" cannot be deleted.`
                    : `Are you sure want to delete schema template (${template.name})?`,
                details: isUsedByPolicies
                    ? [
                        `This template is applied to ${usedByPoliciesCount} ${usedByPoliciesCount === 1 ? 'policy' : 'policies'}.`,
                        usedByPolicyNames.length
                            ? `Used by: ${usedByPolicyNames.join(', ')}${usedByPoliciesCount > usedByPolicyNames.length ? '...' : ''}`
                            : 'Detach it from policies before deleting.'
                    ]
                    : undefined,
                buttons: isUsedByPolicies
                    ? [{
                        name: 'Close',
                        class: 'secondary'
                    }]
                    : [{
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

    public publishTemplate(template: SchemaTemplateGridItem): void {
        const id = template.id || (template as any)._id;
        if (!id || !this.canPublish(template)) {
            return;
        }
        const dialogRef = this.dialogService.open(PublishSchemaTemplateDialog, {
            showHeader: false,
            header: 'Publish Schema Template',
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                template
            },
        })!;
        dialogRef.onClose.subscribe((options: { templateVersion: string } | null) => {
            if (!options) {
                return;
            }
            this.loading = true;
            this.templatesService.pushPublish(id, options).subscribe({
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
        });
    }

    public createNewVersion(template: SchemaTemplateGridItem): void {
        const id = template.id || (template as any)._id;
        if (!id || !this.canCreateNewVersion(template)) {
            return;
        }
        this.loading = true;
        this.templatesService.pushNewVersion(id).subscribe({
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

    public openSchemas(template: SchemaTemplateGridItem): void {
        if (!template.topicId) {
            return;
        }
        this.openTemplateConfiguration(template);
    }

    private openTemplateConfiguration(template: SchemaTemplateGridItem): void {
        void this.router.navigate(['/schema-template-configuration'], {
            queryParams: {
                type: 'template',
                topic: template.topicId,
                templateId: template.id || (template as any)._id
            }
        });
    }

    /**
     * app-paginator emits {pageIndex, pageSize}; the p-table pager this replaced emitted
     * {first, rows}. Changing the page size resets to the first page, matching the
     * Schemas grid.
     */
    public onPage(event: any): void {
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
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

    public showStatusActions(template: SchemaTemplateGridItem): boolean {
        return this.user.TEMPLATES_TEMPLATE_UPDATE &&
            (
                template.status === ModuleStatus.DRAFT ||
                template.status === ModuleStatus.PUBLISH_ERROR
            );
    }

    public getStatusOptions(): any[] {
        return this.publishStatusOptions;
    }

    public getStatusName(template: SchemaTemplateGridItem): string {
        if (template.status === ModuleStatus.PUBLISH_ERROR) {
            return 'Not published';
        }
        return this.getStatusLabel(template.status);
    }

    public onChangeStatus(event: any, template: SchemaTemplateGridItem): void {
        if (event.value?.id === 'Publish') {
            this.publishTemplate(template);
        }
        setTimeout(() => this.publishMenuSelector = null, 0);
    }

    private loadProfile(): void {
        this.loading = true;
        this.profileService.getProfile().pipe(takeUntil(this.destroy$)).subscribe({
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
        this.templatesService.page(this.pageIndex, this.pageSize, this.textSearch).pipe(takeUntil(this.destroy$)).subscribe({
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

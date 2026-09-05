import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ModuleStatus } from '@guardian/interfaces';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { ToastService } from 'src/app/services/toast.service';
import { SchemaTemplateGridItem, SchemaTemplatesService } from 'src/app/services/schema-templates.service';
import { ApplySchemaTemplateDialog } from '../apply-schema-template-dialog/apply-schema-template-dialog.component';

interface AppliedTemplateRow {
    templateId: string;
    templateName: string;
    templateVersion?: string;
    templateStatus?: ModuleStatus;
}

@Component({
    selector: 'manage-schema-templates-dialog',
    templateUrl: './manage-schema-templates-dialog.component.html',
    styleUrls: ['./manage-schema-templates-dialog.component.scss'],
    standalone: false
})
export class ManageSchemaTemplatesDialog implements OnInit, OnDestroy {
    public policy: any;
    public loading = true;
    public appliedRows: AppliedTemplateRow[] = [];
    public availableTemplates: SchemaTemplateGridItem[] = [];
    public filtersForm = new UntypedFormGroup({
        name: new UntypedFormControl('')
    });

    private readonly destroy$ = new Subject<void>();

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private readonly dialogService: DialogService,
        private readonly templatesService: SchemaTemplatesService,
        private readonly toastService: ToastService
    ) {
        this.policy = this.config.data?.policy;
    }

    public ngOnInit(): void {
        this.appliedRows = (this.policy?.schemaTemplates || [])
            .filter((binding: any) => !!binding?.templateId)
            .map((binding: any) => ({
                templateId: binding.templateId,
                templateName: binding.templateName || 'Schema Template',
                templateVersion: binding.templateVersion,
                templateStatus: binding.templateStatus
            }));

        this.filtersForm.get('name')?.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((value) => {
                this.searchValue = String(value || '').trim();
                this.loadAvailableTemplates(this.searchValue);
            });
        this.loadAvailableTemplates();
    }

    public searchValue: string = '';

    public get filteredAppliedRows(): AppliedTemplateRow[] {
        if (!this.searchValue) {
            return this.appliedRows;
        }
        const search = this.searchValue.toLowerCase();
        return this.appliedRows.filter((row) => (row.templateName || '').toLowerCase().includes(search));
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private getAppliedTemplateIds(): Set<string> {
        return new Set(this.appliedRows.map((row) => row.templateId));
    }

    public loadAvailableTemplates(search: string = ''): void {
        this.loading = true;
        const appliedTemplateIds = this.getAppliedTemplateIds();
        this.templatesService.page(0, 1000, search)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.availableTemplates = (response.body || []).filter((template) => {
                        if (template.status !== ModuleStatus.DRAFT && template.status !== ModuleStatus.PUBLISHED) {
                            return false;
                        }
                        const templateId = this.getTemplateId(template);
                        return !!templateId && !appliedTemplateIds.has(templateId);
                    });
                    this.loading = false;
                },
                error: () => {
                    this.availableTemplates = [];
                    this.loading = false;
                }
            });
    }

    public getTemplateId(template: SchemaTemplateGridItem): string | null {
        return template.id || (template as any)._id || null;
    }

    public getStatusLabel(status?: ModuleStatus): string {
        switch (status) {
            case ModuleStatus.PUBLISHED:
                return 'Published';
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

    public openApply(template: SchemaTemplateGridItem): void {
        const templateId = this.getTemplateId(template);
        if (!templateId) {
            return;
        }
        const templateName = template.name || 'schema template';
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Apply Schema Template',
                text: `Apply "${templateName}" to this policy?`,
                buttons: [{
                    name: 'Cancel',
                    class: 'secondary'
                }, {
                    name: 'Apply',
                    class: 'primary'
                }]
            },
        })!;
        dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe((result) => {
            if (result !== 'Apply') {
                return;
            }
            this.templatesService.pushApply(templateId, this.policy.id).subscribe({
                next: (task) => {
                    if (!task?.taskId) {
                        return;
                    }
                    this.ref.close(task);
                },
                error: ({ message }) => {
                    this.toastService.error(message);
                }
            });
        });
    }

    public openUpdate(row: AppliedTemplateRow): void {
        const dialogRef = this.dialogService.open(ApplySchemaTemplateDialog, {
            showHeader: false,
            width: '820px',
            styleClass: 'guardian-dialog',
            data: {
                policy: this.policy,
                mode: 'update',
                templateId: row.templateId
            }
        })!;
        dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe((task: any) => {
            if (!task?.taskId) {
                return;
            }
            this.ref.close(task);
        });
    }

    public detach(row: AppliedTemplateRow): void {
        const templateName = row.templateName || 'schema template';
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Detach Schema Template',
                text: `Detach "${templateName}" from this policy?`,
                details: [
                    'Template locks and field restrictions will be removed.'
                ],
                options: [{
                    title: 'Keep the schemas',
                    sub: 'The imported from template schemas remain in the policy as regular schemas.',
                    value: false
                }, {
                    title: 'Also delete the schemas',
                    sub: 'Permanently deletes the imported from template schemas. This cannot be undone and fails for any schema already used by a submitted document.',
                    value: true
                }],
                optionValue: false,
                buttons: [{
                    name: 'Cancel',
                    class: 'secondary'
                }, {
                    name: 'Detach',
                    class: 'primary'
                }]
            },
        })!;
        dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe((result) => {
            if (result?.button !== 'Detach') {
                return;
            }
            const deleteSchemas = !!result.option;
            this.templatesService.pushDetach(row.templateId, this.policy.id, { deleteSchemas }).subscribe({
                next: (task) => {
                    if (!task?.taskId) {
                        return;
                    }
                    this.ref.close(task);
                },
                error: ({ message }) => {
                    this.toastService.error(message);
                }
            });
        });
    }

    public onClose(): void {
        this.ref.close(null);
    }
}

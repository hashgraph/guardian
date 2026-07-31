import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ModuleStatus } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import {
    SchemaTemplateGridItem,
    SchemaTemplatesService,
    SchemaTemplateUpdateConflict,
    SchemaTemplateUpdatePreview,
    SchemaTemplateUpdateResolutionAction
} from 'src/app/services/schema-templates.service';

interface SchemaTemplateDiffGroup {
    schemaName: string;
    schemaChanges: SchemaTemplateUpdatePreview['changes'];
    fieldChanges: SchemaTemplateUpdatePreview['changes'];
    changesCount: number;
}

@Component({
    selector: 'apply-schema-template-dialog',
    templateUrl: './apply-schema-template-dialog.component.html',
    styleUrls: ['./apply-schema-template-dialog.component.scss'],
    standalone: false
})
export class ApplySchemaTemplateDialog implements OnInit, OnDestroy {
    public loading = true;
    public applying = false;
    public previewLoading = false;
    public policy: any;
    public mode: 'apply' | 'update' = 'apply';
    public list: SchemaTemplateGridItem[] = [];
    public selectedTemplateId: string | null = null;
    public updatePreview: SchemaTemplateUpdatePreview | null = null;
    public resolutions: Record<string, SchemaTemplateUpdateResolutionAction> = {};
    public readonly resolutionAction = SchemaTemplateUpdateResolutionAction;
    public filtersForm = new UntypedFormGroup({
        name: new UntypedFormControl('')
    });
    private readonly destroy$ = new Subject<void>();

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private readonly templatesService: SchemaTemplatesService
    ) {
        this.policy = this.config.data?.policy;
        this.mode = this.config.data?.mode === 'update' ? 'update' : 'apply';
    }

    public ngOnInit(): void {
        this.filtersForm.get('name')?.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((value) => {
                this.selectedTemplateId = null;
                this.updatePreview = null;
                this.resolutions = {};
                this.loadTemplates(String(value || '').trim());
            });
        this.loadTemplates();
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public loadTemplates(search: string = ''): void {
        this.loading = true;
        this.templatesService.page(0, 1000, search)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
            next: (response) => {
                this.list = (response.body || []).filter((template) => {
                    return template.status === ModuleStatus.DRAFT ||
                        template.status === ModuleStatus.PUBLISHED;
                });
                this.loading = false;
            },
            error: () => {
                this.list = [];
                this.loading = false;
            }
        });
    }

    public selectTemplate(template: SchemaTemplateGridItem): void {
        this.selectedTemplateId = this.getTemplateId(template);
        this.updatePreview = null;
        this.resolutions = {};
        if (this.mode === 'update' && this.selectedTemplateId && this.policy?.id) {
            this.loadUpdatePreview(this.selectedTemplateId);
        }
    }

    public loadUpdatePreview(templateId: string): void {
        this.previewLoading = true;
        this.templatesService.previewUpdate(templateId, this.policy.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (preview) => {
                    this.updatePreview = preview;
                    this.resolutions = {};
                    this.previewLoading = false;
                },
                error: () => {
                    this.updatePreview = null;
                    this.previewLoading = false;
                }
            });
    }

    public getTemplateId(template: SchemaTemplateGridItem): string | null {
        return template.id || (template as any)._id || null;
    }

    public applyTemplate(): void {
        if (!this.selectedTemplateId || !this.policy?.id || this.applying || !this.canSubmit()) {
            return;
        }
        this.applying = true;
        const request = this.mode === 'update'
            ? this.templatesService.pushUpdate(this.selectedTemplateId, this.policy.id, {
                resolutions: Object.entries(this.resolutions).map(([conflictId, action]) => ({ conflictId, action }))
            })
            : this.templatesService.pushApply(this.selectedTemplateId, this.policy.id);
        request.subscribe({
            next: (task) => {
                this.ref.close(task);
            },
            error: () => {
                this.applying = false;
            }
        });
    }

    public setResolution(conflict: SchemaTemplateUpdateConflict, action: SchemaTemplateUpdateResolutionAction): void {
        this.resolutions[conflict.id] = action;
    }

    public canSubmit(): boolean {
        if (!this.selectedTemplateId || this.previewLoading) {
            return false;
        }
        if (this.mode !== 'update') {
            return true;
        }
        if (!this.updatePreview) {
            return false;
        }
        return this.visibleConflicts.every((conflict) => !!this.resolutions[conflict.id]);
    }

    public get headerText(): string {
        return this.mode === 'update' ? 'Update Schema Template' : 'Apply Schema Template';
    }

    public get submitText(): string {
        return this.mode === 'update' ? 'Update' : 'Apply';
    }

    public get visibleChanges(): SchemaTemplateUpdatePreview['changes'] {
        const changes = this.updatePreview?.changes || [];
        const schemasWithFieldChanges = new Set(
            changes
                .filter((change) => !this.isSchemaChange(change.type))
                .map((change) => change.schemaName || 'Template')
        );
        return changes.filter((change) => {
            if (change.type !== 'SCHEMA_UPDATE') {
                return true;
            }
            if (!schemasWithFieldChanges.has(change.schemaName || 'Template')) {
                return true;
            }
            return this.hasDetails(change);
        });
    }

    public get visibleChangesCount(): number {
        return this.visibleChanges.length;
    }

    public get visibleConflicts(): SchemaTemplateUpdateConflict[] {
        return (this.updatePreview?.conflicts || [])
            .filter((conflict) => (conflict.allowedActions || []).length > 1);
    }

    public get visibleConflictsCount(): number {
        return this.visibleConflicts.length;
    }

    public get diffGroups(): SchemaTemplateDiffGroup[] {
        const groups = new Map<string, SchemaTemplateDiffGroup>();
        for (const change of this.visibleChanges) {
            const key = change.schemaName || 'Template';
            if (!groups.has(key)) {
                groups.set(key, {
                    schemaName: key,
                    schemaChanges: [],
                    fieldChanges: [],
                    changesCount: 0
                });
            }
            const group = groups.get(key);
            if (!group) {
                continue;
            }
            if (this.isSchemaChange(change.type)) {
                group.schemaChanges.push(change);
            } else {
                group.fieldChanges.push(change);
            }
            group.changesCount += 1;
        }
        return Array.from(groups.values());
    }

    public isSchemaChange(type: string): boolean {
        return type.startsWith('SCHEMA');
    }

    public isAddChange(type: string): boolean {
        return type.endsWith('_ADD');
    }

    public isRemoveChange(type: string): boolean {
        return type.endsWith('_REMOVE') || type === 'CUSTOM_FIELD_REMOVE';
    }

    public hasDetails(change: SchemaTemplateUpdatePreview['changes'][number]): boolean {
        return !!change.details?.length;
    }

    public getChangeLabel(type: string): string {
        switch (type) {
            case 'SCHEMA_ADD':
            case 'FIELD_ADD':
                return 'Added';
            case 'SCHEMA_UPDATE':
            case 'FIELD_UPDATE':
                return 'Changed';
            case 'SCHEMA_REMOVE':
            case 'FIELD_REMOVE':
            case 'CUSTOM_FIELD_REMOVE':
                return 'Removed';
            case 'CUSTOM_FIELD_PRESERVE':
                return 'Preserved';
            default:
                return 'Change';
        }
    }

    public getChangeColor(type: string): string {
        switch (type) {
            case 'SCHEMA_ADD':
            case 'FIELD_ADD':
                return 'green';
            case 'SCHEMA_REMOVE':
            case 'FIELD_REMOVE':
            case 'CUSTOM_FIELD_REMOVE':
                return 'red';
            case 'CUSTOM_FIELD_PRESERVE':
                return 'blue';
            case 'SCHEMA_UPDATE':
            case 'FIELD_UPDATE':
            default:
                return 'yellow';
        }
    }

    public getChangeTitle(change: SchemaTemplateUpdatePreview['changes'][number]): string {
        return change.fieldName
            ? change.fieldName
            : change.schemaName || 'Template';
    }

    public getChangeScope(type: string): string {
        return type.startsWith('SCHEMA') ? 'Schema' : 'Field Name';
    }

    public onClose(): void {
        this.ref.close(null);
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
}

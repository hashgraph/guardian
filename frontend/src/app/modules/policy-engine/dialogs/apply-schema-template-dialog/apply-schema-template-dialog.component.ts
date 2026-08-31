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
    public resolutions: Record<string, SchemaTemplateUpdateResolutionAction> = {};
    public visibleChanges: SchemaTemplateUpdatePreview['changes'] = [];
    public visibleChangesCount: number = 0;
    public visibleConflicts: SchemaTemplateUpdateConflict[] = [];
    public visibleConflictsCount: number = 0;
    public diffGroups: SchemaTemplateDiffGroup[] = [];

    private _updatePreview: SchemaTemplateUpdatePreview | null = null;
    public get updatePreview(): SchemaTemplateUpdatePreview | null {
        return this._updatePreview;
    }
    public set updatePreview(value: SchemaTemplateUpdatePreview | null) {
        this._updatePreview = value;
        this._recomputeDerivedState();
    }
    public readonly resolutionAction = SchemaTemplateUpdateResolutionAction;
    public filtersForm = new UntypedFormGroup({
        name: new UntypedFormControl('')
    });
    private readonly destroy$ = new Subject<void>();

    private readonly preselectTemplateId: string | null = null;
    private preselectionApplied = false;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private readonly templatesService: SchemaTemplatesService
    ) {
        this.policy = this.config.data?.policy;
        this.mode = this.config.data?.mode === 'update' ? 'update' : 'apply';
        this.preselectTemplateId = this.config.data?.templateId || null;
    }

    private getAppliedTemplateIds(): Set<string> {
        return new Set(
            (this.policy?.schemaTemplates || [])
                .map((binding: any) => binding?.templateId)
                .filter((templateId: string | undefined) => !!templateId)
        );
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
        const appliedTemplateIds = this.getAppliedTemplateIds();
        this.templatesService.page(0, 1000, search)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
            next: (response) => {
                this.list = (response.body || []).filter((template) => {
                    if (template.status !== ModuleStatus.DRAFT && template.status !== ModuleStatus.PUBLISHED) {
                        return false;
                    }
                    const templateId = this.getTemplateId(template);
                    const isApplied = !!templateId && appliedTemplateIds.has(templateId);
                    // Apply can only target a template not yet bound to this policy;
                    // update can only target one that already is.
                    return this.mode === 'update' ? isApplied : !isApplied;
                });
                this.loading = false;
                // Only ever auto-select once, on the initial load: re-applying it on every
                // search debounce would silently override a selection the user made by hand.
                if (this.preselectTemplateId && !this.preselectionApplied) {
                    this.preselectionApplied = true;
                    const preselected = this.list.find(
                        (template) => this.getTemplateId(template) === this.preselectTemplateId
                    );
                    if (preselected) {
                        this.selectTemplate(preselected);
                    }
                }
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

    public get emptyListHeader(): string {
        return this.mode === 'update'
            ? 'This policy has no applied schema templates to update'
            : 'There are no schema templates left to apply';
    }

    public get headerText(): string {
        return this.mode === 'update' ? 'Update Schema Template' : 'Apply Schema Template';
    }

    public get submitText(): string {
        return this.mode === 'update' ? 'Update' : 'Apply';
    }

    private _recomputeDerivedState(): void {
        const changes = this._updatePreview?.changes || [];
        const schemasWithFieldChanges = new Set(
            changes
                .filter((change) => !this.isSchemaChange(change.type))
                .map((change) => change.schemaName || 'Template')
        );
        this.visibleChanges = changes.filter((change) => {
            if (change.type !== 'SCHEMA_UPDATE') {
                return true;
            }
            if (!schemasWithFieldChanges.has(change.schemaName || 'Template')) {
                return true;
            }
            return this.hasDetails(change);
        });
        this.visibleChangesCount = this.visibleChanges.length;
        this.visibleConflicts = (this._updatePreview?.conflicts || [])
            .filter((conflict) => (conflict.allowedActions || []).length > 1);
        this.visibleConflictsCount = this.visibleConflicts.length;

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
            const group = groups.get(key)!;
            if (this.isSchemaChange(change.type)) {
                group.schemaChanges.push(change);
            } else {
                group.fieldChanges.push(change);
            }
            group.changesCount += 1;
        }
        this.diffGroups = Array.from(groups.values());
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

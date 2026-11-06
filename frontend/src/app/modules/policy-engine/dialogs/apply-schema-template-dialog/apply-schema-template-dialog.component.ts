import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ModuleStatus } from '@guardian/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { FIELD_TYPES_UI } from 'src/app/modules/schema-engine/field-type-ui';
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
    conditionChanges: SchemaTemplateUpdatePreview['changes'];
    linkChanges: SchemaTemplateUpdatePreview['changes'];
    changesCount: number;
}

interface SchemaTemplateConflictGroup {
    schemaName: string;
    conflicts: SchemaTemplateUpdateConflict[];
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
    public conflictGroups: SchemaTemplateConflictGroup[] = [];
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

    /**
     * The binding being touched, in update mode - fixed for the life of the dialog.
     * `selectedTemplateId` is the target and can be changed freely: picking one
     * other than this compares against, and switches to, a different template
     * entirely rather than just refreshing this one.
     */
    private readonly baseTemplateId: string | null = null;
    private preselectionApplied = false;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private readonly templatesService: SchemaTemplatesService
    ) {
        this.policy = this.config.data?.policy;
        this.mode = this.config.data?.mode === 'update' ? 'update' : 'apply';
        this.baseTemplateId = this.config.data?.templateId || null;
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
                    // Apply can only target a template not yet bound to this policy.
                    // Update can target the template already bound here (the common
                    // "refresh to the latest state" case) or any template not bound to
                    // some *other* binding - picking a different one is a swap, not a
                    // refresh, and previews/applies as such.
                    if (this.mode === 'update') {
                        return templateId === this.baseTemplateId || !isApplied;
                    }
                    return !isApplied;
                });
                this.loading = false;
                // Auto-select the bound template once; only latch when it's actually found, in case
                // it's absent from this page, so a later load can still try again.
                if (this.baseTemplateId && !this.preselectionApplied && !this.selectedTemplateId) {
                    const preselected = this.list.find(
                        (template) => this.getTemplateId(template) === this.baseTemplateId
                    );
                    if (preselected) {
                        this.preselectionApplied = true;
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

    /** @param targetTemplateId the template to compare/switch to - the base (this dialog's own binding) stays fixed. */
    public loadUpdatePreview(targetTemplateId: string): void {
        this.previewLoading = true;
        this.templatesService.previewUpdate(this.baseTemplateId!, this.policy.id, targetTemplateId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (preview) => {
                    // Clear first: assigning the preview runs the setter, which
                    // auto-resolves every conflict left with a single option.
                    this.resolutions = {};
                    this.updatePreview = preview;
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
            ? this.templatesService.pushUpdate(this.baseTemplateId!, this.policy.id, {
                resolutions: Object.entries(this.resolutions).map(([conflictId, action]) => ({ conflictId, action })),
                targetTemplateId: this.selectedTemplateId
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
            ? 'There are no schema templates available to update to'
            : 'There are no schema templates left to apply';
    }

    public get headerText(): string {
        return this.mode === 'update' ? 'Update Schema Template' : 'Apply Schema Template';
    }

    public get submitText(): string {
        return this.mode === 'update' ? 'Update' : 'Apply';
    }

    /**
     * A change a conflict already describes is not listed twice: the conflict row carries the
     * policy and template values, so the same item shows in one section only.
     */
    private _isCoveredByConflict(
        change: SchemaTemplateUpdatePreview['changes'][number],
        conflicts: SchemaTemplateUpdateConflict[]
    ): boolean {
        return conflicts.some((conflict) => {
            if (conflict.schemaName !== change.schemaName) {
                return false;
            }
            switch (conflict.type) {
                case 'FIELD_MODIFIED_IN_POLICY':
                case 'FIELD_REMOVED_IN_POLICY':
                    return change.type === 'FIELD_UPDATE'
                        && !!conflict.templateFieldId
                        && change.templateFieldId === conflict.templateFieldId;
                case 'SCHEMA_REMOVED_WITH_POLICY_USAGE':
                    return change.type === 'SCHEMA_REMOVE';
                case 'CONDITION_REMOVED_WITH_POLICY_USAGE':
                    return change.type === 'CONDITION_REMOVE' && change.fieldName === conflict.fieldName;
                case 'REPEATABLE_LINK_REMOVED_WITH_POLICY_USAGE':
                    return change.type === 'REPEATABLE_LINK_REMOVE' && change.fieldName === conflict.fieldName;
                default:
                    return false;
            }
        });
    }

    private _recomputeDerivedState(): void {
        // A conflict left with a single option is still worth showing - it is how the
        // user finds out a schema will be kept rather than removed, and why.
        this.visibleConflicts = (this._updatePreview?.conflicts || [])
            .filter((conflict) => (conflict.allowedActions || []).length > 0);
        const changes = (this._updatePreview?.changes || [])
            .filter((change) => !this._isCoveredByConflict(change, this.visibleConflicts));
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
        for (const conflict of this.visibleConflicts) {
            if (conflict.allowedActions.length === 1 && !this.resolutions[conflict.id]) {
                this.resolutions[conflict.id] = conflict.allowedActions[0];
            }
        }
        this.visibleConflictsCount = this.visibleConflicts.length;

        const groups = new Map<string, SchemaTemplateDiffGroup>();
        const groupFor = (schemaName?: string): SchemaTemplateDiffGroup => {
            const key = schemaName || 'Template';
            let group = groups.get(key);
            if (!group) {
                group = {
                    schemaName: key,
                    schemaChanges: [],
                    fieldChanges: [],
                    conditionChanges: [],
                    linkChanges: [],
                    changesCount: 0
                };
                groups.set(key, group);
            }
            return group;
        };
        for (const change of this.visibleChanges) {
            const group = groupFor(change.schemaName);
            if (this.isSchemaChange(change.type)) {
                group.schemaChanges.push(change);
            } else if (this.isConditionChange(change.type)) {
                group.conditionChanges.push(change);
            } else if (this.isLinkChange(change.type)) {
                group.linkChanges.push(change);
            } else {
                group.fieldChanges.push(change);
            }
            group.changesCount += 1;
        }
        // Conflicts are their own list, by schema, so the user resolves them in one place.
        const byConflictSchema = new Map<string, SchemaTemplateConflictGroup>();
        for (const conflict of this.visibleConflicts) {
            const key = conflict.schemaName || 'Template';
            if (!byConflictSchema.has(key)) {
                byConflictSchema.set(key, { schemaName: key, conflicts: [] });
            }
            byConflictSchema.get(key)!.conflicts.push(conflict);
        }
        this.conflictGroups = Array.from(byConflictSchema.values())
            .sort((a, b) => a.schemaName.localeCompare(b.schemaName));
        this.diffGroups = Array.from(groups.values())
            .sort((a, b) => a.schemaName.localeCompare(b.schemaName));
    }

    public get resolvedConflictsCount(): number {
        return this.visibleConflicts.filter((conflict) => !!this.resolutions[conflict.id]).length;
    }

    private bulkAction(conflict: SchemaTemplateUpdateConflict, mode: 'keep' | 'reset'): SchemaTemplateUpdateResolutionAction | undefined {
        const keep = [
            SchemaTemplateUpdateResolutionAction.KEEP_CUSTOM_CHANGES,
            SchemaTemplateUpdateResolutionAction.KEEP_AS_CUSTOM_SCHEMA,
            SchemaTemplateUpdateResolutionAction.KEEP_AS_CUSTOM_CONDITION,
            SchemaTemplateUpdateResolutionAction.KEEP_AS_CUSTOM_LINK
        ];
        const reset = [
            SchemaTemplateUpdateResolutionAction.RESET_TO_TEMPLATE,
            SchemaTemplateUpdateResolutionAction.REMOVE_FROM_POLICY
        ];
        const wanted = mode === 'keep' ? keep : reset;
        return (conflict.allowedActions || []).find((action) => wanted.includes(action));
    }

    /** True when at least one conflict of the schema offers this side. */
    public canResolveAll(group: SchemaTemplateConflictGroup, mode: 'keep' | 'reset'): boolean {
        return group.conflicts.some((conflict) => !!this.bulkAction(conflict, mode));
    }

    /** Keeps the policy's side, or resets to the template's, for every conflict of one schema. */
    public resolveAll(group: SchemaTemplateConflictGroup, mode: 'keep' | 'reset'): void {
        for (const conflict of group.conflicts) {
            const action = this.bulkAction(conflict, mode);
            if (action) {
                this.resolutions[conflict.id] = action;
            }
        }
    }

    public get unresolvedConflictsCount(): number {
        return this.visibleConflicts.length - this.resolvedConflictsCount;
    }

    public scrollToConflicts(): void {
        document.getElementById('schema-template-resolve')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    public getConflictKind(conflict: SchemaTemplateUpdateConflict): string {
        switch (conflict.type) {
            case 'FIELD_MODIFIED_IN_POLICY':
                return 'Changed in policy';
            case 'FIELD_REMOVED_IN_POLICY':
                return 'Deleted in policy';
            default:
                return 'Removed from template';
        }
    }

    public isEditedConflict(conflict: SchemaTemplateUpdateConflict): boolean {
        return conflict.type === 'FIELD_MODIFIED_IN_POLICY';
    }

    public getConflictTitle(conflict: SchemaTemplateUpdateConflict): string {
        return conflict.fieldName || conflict.schemaName || 'Template';
    }

    public getActionLabel(action: SchemaTemplateUpdateResolutionAction): string {
        switch (action) {
            case SchemaTemplateUpdateResolutionAction.KEEP_CUSTOM_CHANGES:
                return 'Keep policy changes';
            case SchemaTemplateUpdateResolutionAction.RESET_TO_TEMPLATE:
                return 'Reset to template';
            case SchemaTemplateUpdateResolutionAction.REMOVE_FROM_POLICY:
                return 'Remove';
            default:
                return 'Keep as custom';
        }
    }

    public isSchemaChange(type: string): boolean {
        return type.startsWith('SCHEMA');
    }

    public isConditionChange(type: string): boolean {
        return type.startsWith('CONDITION');
    }

    public isLinkChange(type: string): boolean {
        return type.startsWith('REPEATABLE_LINK');
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
            case 'CONDITION_ADD':
            case 'REPEATABLE_LINK_ADD':
                return 'Added';
            case 'SCHEMA_UPDATE':
            case 'FIELD_UPDATE':
                return 'Changed';
            case 'SCHEMA_REMOVE':
            case 'FIELD_REMOVE':
            case 'CUSTOM_FIELD_REMOVE':
            case 'CONDITION_REMOVE':
            case 'REPEATABLE_LINK_REMOVE':
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
            case 'CONDITION_ADD':
            case 'REPEATABLE_LINK_ADD':
                return 'green';
            case 'SCHEMA_REMOVE':
            case 'FIELD_REMOVE':
            case 'CUSTOM_FIELD_REMOVE':
            case 'CONDITION_REMOVE':
            case 'REPEATABLE_LINK_REMOVE':
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

    /**
     * The editor's badge for a Yes/No field attribute in a diff row, so Required reads
     * Required / Optional and Array reads Array / Not array. Anything else is plain text.
     */
    public getFlagBadge(label: string, value?: string): { text: string; css: string } | null {
        if (value !== 'Yes' && value !== 'No') {
            return null;
        }
        const on = value === 'Yes';
        switch (label) {
            case 'Required':
                return on ? { text: 'Required', css: 'fb-req' } : { text: 'Optional', css: 'fb-opt' };
            case 'Array':
                return on ? { text: 'Array', css: 'fb-arr' } : { text: 'Not array', css: 'fb-opt' };
            case 'Hidden':
                return on ? { text: 'Hidden', css: 'fb-hidden' } : { text: 'Visible', css: 'fb-opt' };
            case 'Autocalculate':
                return on ? { text: 'Auto Calculate', css: 'fb-auto' } : { text: 'Not calculated', css: 'fb-opt' };
            case 'Read only':
                return on ? { text: 'Read only', css: 'fb-hidden' } : { text: 'Editable', css: 'fb-opt' };
            default:
                return null;
        }
    }

    /** The icon the schema editor shows for a field's type name. */
    public getTypeIcon(typeLabel?: string): string {
        return FIELD_TYPES_UI.find((type) => type.label === typeLabel)?.icon || 'pi-pencil';
    }

    public getChangeScope(type: string): string {
        if (type.startsWith('SCHEMA')) {
            return 'Schema';
        }
        if (this.isConditionChange(type)) {
            return 'Condition';
        }
        if (this.isLinkChange(type)) {
            return 'Repeatable Link';
        }
        return 'Field Name';
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

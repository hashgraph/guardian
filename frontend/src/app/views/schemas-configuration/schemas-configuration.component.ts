import { ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { EMPTY, Subject, Subscription, forkJoin } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';
import { DefaultFieldDictionary, DocumentGenerator, isAncestorType, isGeoCustomType, ISchema, ISchemaArrayDependency, ISchemaArrayDependencyMapping, relationAncestors, Schema, SchemaCategory, SchemaCondition, SchemaConditionTarget, SchemaEntity, SchemaField, SchemaHelper, SchemaStatus } from '@guardian/interfaces';
import { SchemaService } from 'src/app/services/schema.service';
import { ProjectComparisonService } from 'src/app/services/project-comparison.service';
import { DialogService } from 'primeng/dynamicdialog';
import { SchemaDeleteDialogComponent } from 'src/app/modules/schema-engine/schema-delete-dialog/schema-delete-dialog.component';
import { ExportSchemaDialog } from 'src/app/modules/schema-engine/export-schema-dialog/export-schema-dialog.component';
import { SetVersionDialog } from 'src/app/modules/schema-engine/set-version-dialog/set-version-dialog.component';
import { EnumEditorDialog } from 'src/app/modules/schema-engine/enum-editor-dialog/enum-editor-dialog.component';
import { CodeEditorDialogComponent } from 'src/app/modules/policy-engine/dialogs/code-editor-dialog/code-editor-dialog.component';
import { FieldTypeUI, FIELD_TYPES_UI } from 'src/app/modules/schema-engine/field-type-ui';

export interface DrillEntry {
    fieldLabel: string;
    fields: SchemaField[];
    schemaIri: string;
}

interface ArrayDependencyFieldOption {
    pathStr: string;
    label: string;
}

interface ArrayDependencyFieldGroup {
    label: string;
    items: ArrayDependencyFieldOption[];
}

@Component({
    selector: 'app-schemas-configuration',
    templateUrl: './schemas-configuration.component.html',
    styleUrls: ['./schemas-configuration.component.scss'],
    standalone: false
})
export class SchemasConfigurationComponent implements OnInit, OnDestroy {
    public type: string = '';
    public topic: string = '';
    public schemaLoading: boolean = false;

    public activeTab: 'builder' | 'preview' = 'builder';
    public activeSideTab: 'fields' | 'schemas' = 'fields';
    public activeRpTab: 'settings' | 'logic' = 'settings';
    public activeCanvasTab: 'fields' | 'conditions' | 'links' = 'fields';
    public activeDrillTab: 'fields' | 'conditions' = 'fields';

    private readonly canvasTabStorageKey = 'sc-active-canvas-tab';

    public setCanvasTab(tab: 'fields' | 'conditions' | 'links'): void {
        this.activeCanvasTab = tab;
        try {
            sessionStorage.setItem(this.canvasTabStorageKey, tab);
        } catch {
        }
    }

    private forgetCanvasTab(): void {
        try {
            sessionStorage.removeItem(this.canvasTabStorageKey);
        } catch {
        }
    }

    private restoreCanvasTab(): void {
        let stored: string | null = null;
        try {
            stored = sessionStorage.getItem(this.canvasTabStorageKey);
        } catch {
            return;
        }
        if (stored === 'fields' || stored === 'conditions' || stored === 'links') {
            this.activeCanvasTab = stored;
        }
    }

    public schemas: Schema[] = [];
    public schemasLoading: boolean = false;
    public schemaSearch: string = '';
    public readonly schemaSearch$ = new Subject<string>();
    private readonly _cancelLoadSchemas$ = new Subject<void>();
    public schemasPage: number = 0;
    public schemasPageSize: number = 50;
    public schemasTotal: number = 0;
    public schemasLoadingMore: boolean = false;

    public selectedSchema: Schema | null = null;
    private _selectedField: SchemaField | null = null;
    public get selectedField(): SchemaField | null { return this._selectedField; }
    public set selectedField(field: SchemaField | null) {
        this._selectedField = field;
        this._rebuildRefPreset();
    }

    public refPresetFormFields: SchemaField[] | null = null;
    public refPresetValues: any = null;
    private _refPresetFormSub: Subscription | null = null;

    public previewPill: 'submitter' | 'readonly' = 'submitter';
    public previewPreset: any = null;
    public previewReadonlyFields: any = null;

    public drillStack: DrillEntry[] = [];
    public get isDrilling(): boolean { return this.drillStack.length > 0; }
    public get drillCurrentFields(): SchemaField[] { return this.drillStack[this.drillStack.length - 1]?.fields ?? []; }
    public get currentDrilledSchemaIri(): string { return this.drillStack[this.drillStack.length - 1]?.schemaIri || ''; }

    private dirtySchemaIds = new Set<string>();
    public isSaving: boolean = false;
    private _subSchemasByIri = new Map<string, Schema>();
    public newArrayDependencyField: string | null = null;
    public newArrayDependencyOn: string | null = null;
    public newArrayDependencyTitle: string | null = null;
    public newArrayDependencyMappingSource: string | null = null;
    public newArrayDependencyMappingTarget: string | null = null;
    public newArrayDependencyValueMappings: ISchemaArrayDependencyMapping[] = [];

    public isDragOverCanvas: boolean = false;
    private _dragEnterCount: number = 0;
    private _dragFieldType: FieldTypeUI | null = null;
    private _dragSchema: Schema | null = null;

    public reorderField: SchemaField | null = null;
    public reorderOverIndex: number = -1;
    public reorderAtEnd: boolean = false;
    public isDragActive: boolean = false;
    public dragFloatX: number = 0;
    public dragFloatY: number = 0;
    public dragFloatWidth: number = 0;

    public sidebarDropIndex: number = -1;
    public sidebarDropPos: 'top' | 'bot' = 'bot';

    private _dragFields: SchemaField[] | null = null;
    private _dragOffsetX: number = 0;
    private _dragOffsetY: number = 0;
    private _dragStartX: number = 0;
    private _dragStartY: number = 0;
    private _mouseMoveListener: ((e: MouseEvent) => void) | null = null;
    private _mouseUpListener: ((e: MouseEvent) => void) | null = null;

    public get hasUnsavedChanges(): boolean {
        return this.dirtySchemaIds.size > 0;
    }

    public get selectedSchemaId(): string | null {
        return this.selectedSchema?.id || (this.selectedSchema as any)?._id || null;
    }

    public get canPublish(): boolean {
        if (!this.selectedSchemaId) { return false; }
        if (this.type === 'tag' || this.type === 'system') { return false; }
        const s = this.selectedSchema?.status;
        return s === SchemaStatus.DRAFT || s === SchemaStatus.UNPUBLISHED;
    }

    public hoveredSchemaId: string | null = null;
    public showNewSchemaDialog: boolean = false;
    public newSchemaName: string = '';
    public newSchemaSaving: boolean = false;
    private newSchemaKeys = new Set<string>();
    public systemFieldsCollapsed: boolean = true;
    public schemaPropsCollapsed: boolean = false;
    public drillPropsCollapsed: boolean = false;

    public get drilledSchema(): Schema | null {
        return this.resolveRefSchema(this.currentDrilledSchemaIri) ?? null;
    }

    public get currentContextSchema(): Schema | null {
        return this.drilledSchema ?? this.selectedSchema;
    }

    public contextSchemaParents: Schema[] = [];
    private _parentLoadId: string | null = null;

    public loadParentSchemas(): void {
        const s = this.currentContextSchema;
        const id: string | null = (s as any)?._id || s?.id || null;
        if (!id || id === this._parentLoadId) { return; }
        this._parentLoadId = id;
        this.contextSchemaParents = [];
        this.schemaService.getSchemaParents(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (parents) => {
                    if (this._parentLoadId !== id) { return; }
                    this.contextSchemaParents = (parents || []).map(p => new Schema(p));
                },
                error: () => { if (this._parentLoadId === id) { this.contextSchemaParents = []; } },
            });
    }

    public readonly entityOptions: { label: string; value: SchemaEntity }[] = [
        { label: 'Default',                        value: SchemaEntity.NONE },
        { label: 'Verifiable Credential',          value: SchemaEntity.VC   },
        { label: 'Encrypted Verifiable Credential', value: SchemaEntity.EVC },
    ];

    public copiedIri: boolean = false;

    public get systemFields(): any[] {
        return DefaultFieldDictionary.getDefaultFields(this.selectedSchema?.entity as SchemaEntity);
    }

    public readonly fieldTypes: FieldTypeUI[] = FIELD_TYPES_UI;

    private static readonly NON_UPDATABLE_TYPES = new Set(['helptext', 'prefix', 'postfix', 'sub-schema']);
    private static readonly NON_ARRAY_TYPES = new Set(['boolean', 'helptext']);

    public readonly geoJsonOptions = ['Point', 'Polygon', 'LineString', 'MultiPoint', 'MultiPolygon', 'MultiLineString'];

    public get fieldTypeGroups(): { group: string; types: FieldTypeUI[] }[] {
        const groups: { group: string; types: FieldTypeUI[] }[] = [];
        for (const ft of this.fieldTypes) {
            let g = groups.find(grp => grp.group === ft.group);
            if (!g) { g = { group: ft.group, types: [] }; groups.push(g); }
            g.types.push(ft);
        }
        return groups;
    }

    public get defaultFieldType(): FieldTypeUI {
        return this.fieldTypes.find(ft => ft.key === 'string')!;
    }

    private destroy$ = new Subject<void>();
    private schemaLoad$ = new Subject<string>();
    private schemasFetched: boolean = false;

    public properties: any[] = [];

    public readonly requiredModeOptions: { label: string; value: string }[] = [
        { label: 'None',          value: 'none'          },
        { label: 'Hidden',        value: 'hidden'        },
        { label: 'Required',      value: 'required'      },
        { label: 'Auto Calculate', value: 'autocalculate' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private schemaService: SchemaService,
        private projectComparisonService: ProjectComparisonService,
        private dialogService: DialogService,
        private _elRef: ElementRef,
        private _zone: NgZone,
        private _cdr: ChangeDetectorRef,
    ) {}

    public ngOnInit(): void {
        this.restoreCanvasTab();

        this.projectComparisonService.getProperties()
            .pipe(takeUntil(this.destroy$))
            .subscribe({ next: (p) => { this.properties = p || []; }, error: () => {} });

        this.schemaLoad$.pipe(
            switchMap(id => {
                this.schemaLoading = true;
                const category = this.getCategory();
                const topicId = this.topic;
                return this.schemaService.getSchemaWithSubSchemas(category, id, topicId).pipe(
                    map((data: any) => {
                        // Spread $defs into throw-away copies so parseFields resolves $ref links
                        // without mutating the originals — updateRefs() during save needs clean docs.
                        const defs: Record<string, any> = {};
                        for (const sub of (data.subSchemas || [])) {
                            if (sub.iri && sub.document) {
                                defs[sub.iri] = typeof sub.document === 'string'
                                    ? JSON.parse(sub.document)
                                    : sub.document;
                            }
                        }
                        const hasDefs = Object.keys(defs).length > 0;
                        const withDefs = (raw: any): any => {
                            if (!hasDefs || !raw?.document) { return raw; }
                            const doc = typeof raw.document === 'string'
                                ? JSON.parse(raw.document)
                                : raw.document;
                            return { ...raw, document: { ...doc, $defs: defs } };
                        };
                        const schema = data.schema ? new Schema(withDefs(data.schema)) : null;
                        return {
                            schema,
                            subSchemas: (data.subSchemas || []).map((s: any) => new Schema(withDefs(s))),
                            // Raw sub-schemas (no withDefs) preserve the API's hierarchical $defs
                            // so updateRefs/uniqueRefs can correctly recurse into nested sub-schemas.
                            rawSubSchemas: (data.subSchemas || []).map((s: any) => new Schema(s)),
                        };
                    }),
                    catchError(() => {
                        this.schemaLoading = false;
                        return EMPTY;
                    })
                );
            }),
            takeUntil(this.destroy$)
        ).subscribe(({ schema, subSchemas, rawSubSchemas }) => {
            if (!schema) {
                this.schemaLoading = false;
                return;
            }
            this.selectedSchema = schema;
            this.resetArrayDependencyEditor();
            this.schemaLoading = false;
            const schemaId = schema.id || (schema as any)._id;
            if (schemaId) { this.dirtySchemaIds.delete(schemaId); }
            if (!this.topic && schema.topicId) {
                this.topic = schema.topicId;
            }
            // Raw sub-schemas preserve the API's hierarchical $defs; filtered to exclude
            // the current schema so it never appears in its own $defs (mirrors old editor).
            this._subSchemasByIri = new Map(
                (rawSubSchemas as Schema[])
                    .filter((s: Schema) => s.iri && s.iri !== schema.iri)
                    .map((s: Schema) => [s.iri, s] as [string, Schema])
            );
            this.mergeSchemaNames(subSchemas);
            if (!this.schemasFetched && this.topic) {
                this.loadSchemas(this.topic);
            }
            this.upsertInSidebar(schema);
            this.rebuildPreview();
            this.loadParentSchemas();
        });

        this.route.queryParamMap.pipe(
            takeUntil(this.destroy$)
        ).subscribe(params => {
            this.type = params.get('type') || '';
            this.topic = params.get('topic') || '';
            const schemaId = params.get('schemaId') || '';
            const mode = params.get('mode') || '';
            if (schemaId) {
                this.schemaLoad$.next(schemaId);
            } else {
                if (this.topic && !this.schemasFetched) {
                    this.loadSchemas(this.topic);
                }
                if (mode === 'new') {
                    this.showNewSchemaDialog = true;
                } else {
                    const selectedUuid = (this.selectedSchema as any)?.uuid;
                    const isUnsaved = selectedUuid && this.newSchemaKeys.has(`new:${selectedUuid}`);
                    if (!isUnsaved) {
                        this.selectedSchema = null;
                        this.schemaLoading = false;
                    }
                }
            }
        });

        this.schemaSearch$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(search => {
            this.schemaSearch = search;
            this.schemasPage = 0;
            this.schemas = [];
            this.loadSchemas(this.topic);
        });
    }

    public get filteredSchemas(): Schema[] {
        return this.schemas;
    }

    public isDraft(schema: Schema): boolean {
        return schema.status === SchemaStatus.DRAFT || schema.status === SchemaStatus.ERROR;
    }

    private static readonly SYSTEM_KEYS = new Set([
        '@context', 'type', 'policyId', 'ref', 'guardianVersion',
    ]);

    private getGeoDependencyError(field: SchemaField, allFields: SchemaField[]): string | null {
        const dependency = field.dependency;
        if (!dependency) {
            return null;
        }
        const parent = allFields.find(candidate => candidate.name === dependency.on);
        if (!parent) {
            return 'The dependency target does not exist.';
        }
        if (parent === field) {
            return 'A field cannot depend on itself.';
        }
        if (
            dependency.kind !== 'geo' ||
            !isGeoCustomType(field.customType || '') ||
            !isAncestorType('geo', parent.customType || '', field.customType || '')
        ) {
            return 'The selected field is not a compatible geographic ancestor.';
        }
        const visited = new Set<SchemaField>([field]);
        let current: SchemaField | undefined = parent;
        while (current) {
            if (visited.has(current)) {
                return 'Circular geographic dependencies are not allowed.';
            }
            visited.add(current);
            const next: string | undefined = current.dependency?.on;
            current = next
                ? allFields.find(candidate => candidate.name === next)
                : undefined;
        }
        return null;
    }

    private getFieldErrors(field: SchemaField, allFields: SchemaField[]): string[] {
        const errors: string[] = [];

        if (!field.description?.trim()) {
            errors.push('Description is required');
        }

        if (!field.title?.trim()) {
            errors.push('Title is required');
        }

        const key = field.name?.trim();
        if (!key) {
            errors.push('Key is required');
        } else if (/\s/.test(field.name)) {
            errors.push('Key must not contain spaces');
        } else if (SchemasConfigurationComponent.SYSTEM_KEYS.has(field.name)) {
            errors.push('Key is a reserved system name');
        } else if (allFields.filter(f => f !== field && f.name === field.name).length > 0) {
            errors.push('Key must be unique within the schema');
        }

        if ((field as any).customType === 'enum' && (!Array.isArray(field.enum) || field.enum.length === 0)) {
            errors.push('Enum must have at least one value');
        }

        const geoDependencyError = this.getGeoDependencyError(field, allFields);
        if (geoDependencyError) {
            errors.push(geoDependencyError);
        }

        return errors;
    }

    public fieldHasErrors(field: SchemaField): boolean {
        const allFields = this.isDrilling && this.drillCurrentFields.includes(field)
            ? this.drillCurrentFields
            : (this.selectedSchema?.fields ?? []);
        return this.getFieldErrors(field, allFields).length > 0;
    }

    public get selectedFieldErrors(): string[] {
        if (!this.selectedField) { return []; }
        const allFields = this.isDrilling ? this.drillCurrentFields : (this.selectedSchema?.fields ?? []);
        return this.getFieldErrors(this.selectedField, allFields);
    }

    public get currentSchemaErrorCount(): number {
        // Counts errors across all dirty schemas, not just the visible one.
        const selId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        const selUuid = (this.selectedSchema as any)?.uuid;
        let count = 0;
        for (const dirtyId of this.dirtySchemaIds) {
            let schema: Schema | null = null;
            if (selId && dirtyId === selId && this.selectedSchema) {
                schema = this.selectedSchema;
            } else if (selUuid && dirtyId === `new:${selUuid}` && this.selectedSchema) {
                schema = this.selectedSchema;
            } else {
                schema = this.schemas.find(s => (s.id || (s as any)._id) === dirtyId) ?? null;
            }
            if (schema) {
                const fields = schema.fields ?? [];
                count += fields.filter(f => this.getFieldErrors(f, fields).length > 0).length;
            }
        }
        return count;
    }

    private schemaIsValid(schema: Schema): boolean {
        const fields = schema.fields ?? [];
        return fields.every(f => this.getFieldErrors(f, fields).length === 0);
    }

    private get allDirtySchemasValid(): boolean {
        const selId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        const selUuid = (this.selectedSchema as any)?.uuid;
        for (const dirtyId of this.dirtySchemaIds) {
            let schema: Schema | null = null;
            if (selId && dirtyId === selId && this.selectedSchema) {
                schema = this.selectedSchema;
            } else if (selUuid && dirtyId === `new:${selUuid}` && this.selectedSchema) {
                schema = this.selectedSchema;
            } else {
                schema = this.schemas.find(s => (s.id || (s as any)._id) === dirtyId) ?? null;
            }
            if (schema && !this.schemaIsValid(schema)) { return false; }
        }
        return true;
    }

    public switchSchema(schema: Schema): void {
        const id = schema.id || (schema as any)._id;
        if (!id) {
            if (this.newSchemaKeys.has(`new:${(schema as any).uuid}`)) {
                this.selectedField = null;
                this.selectedSchema = schema;
                this.drillStack = [];
                this.setCanvasTab('fields');
                this.resetArrayDependencyEditor();
                this.schemaPropsCollapsed = false;
            }
            return;
        }
        if (id === this.selectedSchemaId) {
            this.drillBack();
            return;
        }
        this.selectedField = null;
        this.selectedSchema = schema; // optimistic: show header before fields load
        this.drillStack = [];
        this.setCanvasTab('fields');
        this.resetArrayDependencyEditor();
        this.schemaPropsCollapsed = false;
        void this.router.navigate(['/schema-configuration'], {
            queryParams: {
                schemaId: id,
                type: this.type || undefined,
                topic: this.topic || undefined,
            },
            replaceUrl: false
        });
    }

    public goBack(): void {
        const queryParams: Record<string, string> = {};
        if (this.type) { queryParams.type = this.type; }
        if (this.topic) { queryParams.topic = this.topic; }
        void this.router.navigate(['/schemas'], { queryParams });
    }

    public schemaEditVersion = 0;

    public markDirty(): void {
        this.schemaEditVersion++;
        // Mark both root and drilled sub-schema dirty: root needs $defs rebuilt on save.
        if (this.isDrilling) {
            const contextIri = this.currentDrilledSchemaIri;
            const subSchema = contextIri ? this.schemas.find(s => s.iri === contextIri) : null;
            const subId = subSchema?.id || (subSchema as any)?._id;
            const subUuid = (subSchema as any)?.uuid;
            if (subId) {
                this.dirtySchemaIds.add(subId);
            } else if (subUuid) {
                this.dirtySchemaIds.add(`new:${subUuid}`);
            }
        }
        const rootId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        if (rootId) {
            this.dirtySchemaIds.add(rootId);
        } else if (this.selectedSchema?.uuid) {
            this.dirtySchemaIds.add(`new:${this.selectedSchema.uuid}`);
        }
    }

    public saveAll(): void {
        if (!this.hasUnsavedChanges || this.isSaving || !this.allDirtySchemasValid) { return; }
        // Iterate dirtyIds and prefer selectedSchema over the sidebar copy to avoid
        // saving a stale object when loadSchemas() ran after the user started editing.
        const selId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        const toSave: Schema[] = [];
        const toCreate: Schema[] = [];
        for (const dirtyId of this.dirtySchemaIds) {
            if (this.newSchemaKeys.has(dirtyId)) {
                const uuid = dirtyId.slice(4);
                const s = this.schemas.find(s => s.uuid === uuid);
                if (s) { toCreate.push(s); }
            } else if (selId && dirtyId === selId && this.selectedSchema) {
                toSave.push(this.selectedSchema);
            } else {
                const s = this.schemas.find(s => (s.id || (s as any)._id) === dirtyId);
                if (s) { toSave.push(s); }
            }
        }
        if (!toSave.length && !toCreate.length) { return; }
        this.isSaving = true;
        // Sync any in-flight drill edits to the schema object in case this.schemas was refreshed
        // after enterSubSchema stored its fields reference in drillStack.
        if (this.isDrilling && this.currentDrilledSchemaIri) {
            const drillS = this.schemas.find(s => s.iri === this.currentDrilledSchemaIri);
            if (drillS && drillS.fields !== this.drillCurrentFields) {
                drillS.fields = this.drillCurrentFields;
            }
        }
        const allSchemas = [...toCreate, ...toSave];
        // Phase 1: rebuild document from fields (system fields appended, then stripped back).
        allSchemas.forEach(s => {
            const userFields = Array.isArray(s.fields) ? s.fields : [];
            const defaultFields = DefaultFieldDictionary.getDefaultFields(s.entity as SchemaEntity);
            s.update([...userFields, ...defaultFields], s.conditions);
            s.fields = userFields;
        });
        // Phase 2: rebuild $defs via BFS through fields — avoids circular deps from $defs recursion.
        allSchemas.forEach(s => { if (s.document) { s.document.$defs = this._buildRefs(s); } });
        const createObs = toCreate.map(s =>
            this.schemaService.create(s.category ?? this.getCategory(), s as unknown as ISchema, this.topic).pipe(
                map((schemas: ISchema[]) => {
                    const saved = schemas.find(r => r.uuid === s.uuid && r.topicId === this.topic);
                    const savedId = saved?.id || (saved as any)?._id;
                    if (savedId) {
                        s.id = savedId;
                        (s as any)._id = savedId;
                        const dirtyKey = `new:${s.uuid}`;
                        this.newSchemaKeys.delete(dirtyKey);
                        this.dirtySchemaIds.delete(dirtyKey);
                        if (this.selectedSchema === s) {
                            void this.router.navigate([], {
                                relativeTo: this.route,
                                queryParams: { schemaId: savedId, type: this.type || undefined, topic: this.topic || undefined },
                                replaceUrl: true,
                            });
                        }
                    }
                })
            )
        );
        const toUpdate = toSave.filter(s => s.status !== SchemaStatus.PUBLISHED);
        const toNewVersion = toSave.filter(s => s.status === SchemaStatus.PUBLISHED);

        if (toNewVersion.length > 0) {
            const s = toNewVersion[0];
            const triggerNewVersion = () => {
                this.schemaService.newVersion(s.category ?? this.getCategory(), s as unknown as ISchema)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: result => {
                            this.isSaving = false;
                            void this.router.navigate(['task', result.taskId], {
                                queryParams: { last: btoa(location.href) },
                            });
                        },
                        error: () => { this.isSaving = false; },
                    });
            };
            if (createObs.length) {
                forkJoin(createObs).pipe(takeUntil(this.destroy$)).subscribe({
                    next: triggerNewVersion,
                    error: () => { this.isSaving = false; },
                });
            } else {
                triggerNewVersion();
            }
            return;
        }

        const updateObs = toUpdate.map(s => this.schemaService.update(s as unknown as ISchema));
        forkJoin([...createObs, ...updateObs])
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.isSaving = false;
                    this.dirtySchemaIds.clear();
                    this.newSchemaKeys.clear();
                },
                error: () => { this.isSaving = false; }
            });
    }

    public addField(ft: FieldTypeUI): void {
        if (!this.selectedSchema) { return; }
        if (this.isDrilling) { this.addDrillField(ft); return; }
        const newField = this.buildNewField(ft);
        if (this.sidebarDropIndex !== -1) {
            const at = this.sidebarDropPos === 'bot' ? this.sidebarDropIndex + 1 : this.sidebarDropIndex;
            this.selectedSchema.fields.splice(at, 0, newField);
        } else {
            this.selectedSchema.fields.push(newField);
        }
        this.selectedField = newField;
        this.markDirty();
    }

    private removeGeoDependenciesByField(field: SchemaField, fields: SchemaField[]): void {
        for (const candidate of fields) {
            if (candidate.dependency?.kind === 'geo' && candidate.dependency.on === field.name) {
                delete candidate.dependency;
            }
        }
    }

    public deleteField(field: SchemaField, event: Event): void {
        event.stopPropagation();
        if (!this.selectedSchema?.fields) { return; }
        const idx = this.selectedSchema.fields.indexOf(field);
        if (idx !== -1) {
            this.removeGeoDependenciesByField(field, this.selectedSchema.fields);
            this.selectedSchema.fields.splice(idx, 1);
            if (this.selectedField === field) {
                this.selectedField = null;
            }
            this.markDirty();
        }
    }

    public duplicateField(field: SchemaField, event: Event): void {
        event.stopPropagation();
        const targetFields = this.isDrilling ? this.drillCurrentFields : this.selectedSchema?.fields;
        if (!targetFields) { return; }
        const existingNames = new Set(targetFields.map(f => f.name));
        const baseName = field.name.replace(/_\d+$/, '');
        let idx = 2;
        while (existingNames.has(`${baseName}_${idx}`)) { idx++; }
        const f = field as any;
        const clone: any = { ...f, name: `${baseName}_${idx}` };
        // Deep-copy array properties to avoid shared mutations between original and clone.
        if (Array.isArray(f.enum)) { clone.enum = [...f.enum]; }
        if (Array.isArray(f.fields)) { clone.fields = [...f.fields]; }
        if (Array.isArray(f.availableOptions)) { clone.availableOptions = [...f.availableOptions]; }
        const srcIdx = targetFields.indexOf(field);
        if (srcIdx !== -1) {
            targetFields.splice(srcIdx + 1, 0, clone as SchemaField);
        } else {
            targetFields.push(clone as SchemaField);
        }
        this.selectedField = clone as SchemaField;
        this.markDirty();
    }

    public selectField(field: SchemaField): void {
        this.selectedField = this.selectedField === field ? null : field;
    }

    public copyIri(value: string | null | undefined, event?: Event): void {
        event?.stopPropagation();
        if (!value) { return; }
        navigator.clipboard.writeText(value).then(() => {
            this.copiedIri = true;
            setTimeout(() => { this.copiedIri = false; }, 1500);
        }).catch(() => { this.copiedIri = false; });
    }

    private static readonly HIDE_VALUES_TYPES = new Set(['helptext', 'file', 'table']);

    public get selectedFieldShowValues(): boolean {
        if (!this.selectedField) { return false; }
        return !SchemasConfigurationComponent.HIDE_VALUES_TYPES.has(this.getFieldCurrentType(this.selectedField));
    }

    private _rebuildRefPreset(): void {
        this._refPresetFormSub?.unsubscribe();
        this._refPresetFormSub = null;
        const f = this._selectedField;
        if (!f?.isRef) {
            this.refPresetFormFields = null;
            this.refPresetValues = null;
            return;
        }
        this.refPresetFormFields = [
            { ...f, name: 'default', description: 'Default Value', required: false, hidden: false, default: null, suggest: null, examples: undefined },
            { ...f, name: 'suggest', description: 'Suggested Value', required: false, hidden: false, default: null, suggest: null, examples: undefined },
            { ...f, name: 'example', description: 'Test Value',      required: false, hidden: false, default: null, suggest: null, examples: undefined },
        ] as SchemaField[];
        this.refPresetValues = {
            default: f.default ?? null,
            suggest: f.suggest ?? null,
            example: Array.isArray(f.examples) ? (f.examples[0] ?? null) : null,
        };
    }

    public onRefPresetFormChange(formGroup: any): void {
        this._refPresetFormSub?.unsubscribe();
        this._refPresetFormSub = formGroup.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value: any) => {
                if (!this._selectedField) { return; }
                const f = this._selectedField as any;
                f.default = value.default ?? null;
                f.suggest = value.suggest ?? null;
                const ex = value.example;
                f.examples = (ex !== null && ex !== undefined) ? [ex] : undefined;
                this.markDirty();
            });
    }

    public getFieldValueInputType(field: SchemaField): string {
        const key = this.getFieldCurrentType(field);
        if (key === 'boolean') { return 'boolean'; }
        if (key === 'enum') { return 'enum'; }
        if (key === 'number' || key === 'integer' || key === 'prefix' || key === 'postfix') { return 'number'; }
        if (key === 'date') { return 'date'; }
        if (key === 'time') { return 'time'; }
        if (key === 'dateTime') { return 'datetime-local'; }
        return 'text';
    }

    public getFieldTestValue(): any {
        return Array.isArray(this.selectedField?.examples) ? (this.selectedField!.examples[0] ?? null) : null;
    }

    public setFieldTestValue(val: any): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any).examples = (val !== null && val !== undefined && val !== '') ? [val] : undefined;
        this.markDirty();
    }

    public setFieldBooleanValue(key: 'default' | 'suggest', val: boolean | null): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any)[key] = val;
        this.markDirty();
    }

    public setFieldTestBooleanValue(val: boolean | null): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any).examples = val !== null ? [val] : undefined;
        this.markDirty();
    }

    public setFieldPresetValue(key: 'default' | 'suggest', val: any): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any)[key] = (val === '' || val === undefined) ? null : val;
        this.markDirty();
    }

    public clearFieldValue(key: 'default' | 'suggest'): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any)[key] = null;
        this.markDirty();
    }

    public clearFieldTestValue(): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any).examples = undefined;
        this.markDirty();
    }

    public toggleBehaviour(key: 'isArray' | 'isUpdatable' | 'readOnly'): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any)[key] = !(this.selectedField as any)[key];
        this.markDirty();
    }

    public getFieldRequiredMode(field: SchemaField): string {
        const f = field as any;
        if (f.autocalculate) { return 'autocalculate'; }
        if (f.required)      { return 'required'; }
        if (f.hidden)        { return 'hidden'; }
        return 'none';
    }

    public setFieldRequiredMode(mode: string): void {
        if (!this.selectedField) { return; }
        const f = this.selectedField as any;
        f.required      = mode === 'required';
        f.hidden        = mode === 'hidden';
        f.autocalculate = mode === 'autocalculate';
        if (mode !== 'autocalculate') { f.expression = ''; }
        this.markDirty();
    }

    public openExpressionEditor(): void {
        if (!this.selectedField) { return; }
        const f = this.selectedField as any;
        const siblingFields = (this.isDrilling ? this.drillCurrentFields : (this.selectedSchema?.fields ?? []))
            .filter(sf => sf !== this.selectedField)
            .map(sf => sf.name);
        const dialogRef = this.dialogService.open(CodeEditorDialogComponent, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                mode: 'formula-lang',
                variables: siblingFields,
                expression: f.expression || '',
                placeholder: 'e.g., fieldA + fieldB\nMath.round(fieldA / fieldB * 100) / 100',
                helpContext: {
                    availableFields: siblingFields,
                    operators: [
                        { label: 'Add', symbol: '+' }, { label: 'Subtract', symbol: '-' },
                        { label: 'Multiply', symbol: '*' }, { label: 'Divide', symbol: '/' },
                        { label: 'Equals', symbol: '==' }, { label: 'Not equals', symbol: '!=' },
                        { label: 'Less than', symbol: '<' }, { label: 'Greater than', symbol: '>' },
                        { label: 'And', symbol: '&&' }, { label: 'Or', symbol: '||' },
                        { label: 'Ternary', symbol: '? :' },
                    ],
                    functions: [
                        { category: 'Math', items: [
                            { name: 'Math.abs', description: 'Absolute value' },
                            { name: 'Math.round', description: 'Round to nearest integer' },
                            { name: 'Math.floor', description: 'Round down' },
                            { name: 'Math.ceil', description: 'Round up' },
                            { name: 'Math.min', description: 'Minimum of values' },
                            { name: 'Math.max', description: 'Maximum of values' },
                            { name: 'Math.sqrt', description: 'Square root' },
                            { name: 'Math.pow', description: 'Raise to power' },
                        ]},
                    ],
                    scopeNote: 'Reference sibling fields by their key name. Evaluated as JavaScript on form submit.',
                },
                validate: true,
            },
        });
        if (!dialogRef) { return; }
        dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe(result => {
            if (result && this.selectedField) {
                (this.selectedField as any).expression = result.expression;
                this.markDirty();
            }
        });
    }

    public get selectedFieldIsEnum(): boolean {
        return (this.selectedField as any)?.customType === 'enum' || Array.isArray(this.selectedField?.enum);
    }

    public get selectedFieldIsUnit(): boolean {
        const key = this.selectedField ? this.getFieldCurrentType(this.selectedField) : '';
        return key === 'prefix' || key === 'postfix';
    }

    public get selectedFieldIsString(): boolean {
        return this.selectedField ? this.getFieldCurrentType(this.selectedField) === 'string' : false;
    }

    public get selectedFieldIsHelpText(): boolean {
        return this.selectedField ? this.getFieldCurrentType(this.selectedField) === 'helptext' : false;
    }

    public get selectedFieldIsGeoJson(): boolean {
        return this.selectedField ? this.getFieldCurrentType(this.selectedField) === 'geo' : false;
    }

    public get selectedFieldCanBeArray(): boolean {
        if (!this.selectedField) { return false; }
        const type = this.getFieldCurrentType(this.selectedField);
        return !this.selectedField.autocalculate && !SchemasConfigurationComponent.NON_ARRAY_TYPES.has(type);
    }

    public get selectedFieldEnumChips(): string[] {
        const vals: string[] = (this.selectedField as any)?.enum ?? [];
        return Array.isArray(vals) ? vals.slice(0, 5) : [];
    }

    public get selectedFieldEnumOverflow(): number {
        const vals: string[] = (this.selectedField as any)?.enum ?? [];
        return Array.isArray(vals) ? Math.max(0, vals.length - 5) : 0;
    }

    public openEnumEditor(): void {
        if (!this.selectedField) { return; }
        const currentValues: string[] = Array.isArray((this.selectedField as any).enum)
            ? (this.selectedField as any).enum
            : [];
        const dialogRef = this.dialogService.open(EnumEditorDialog, {
            showHeader: false,
            width: '540px',
            styleClass: 'guardian-dialog',
            data: {
                enumValue: currentValues,
                errorHandler: () => {},
            },
        });
        if (!dialogRef) { return; }
        dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe(res => {
            if (!res || !this.selectedField) { return; }
            if (res.enumValue !== undefined) {
                const values: string[] = String(res.enumValue)
                    .split('\n')
                    .map((v: string) => v.trim())
                    .filter((v: string) => v.length > 0);
                (this.selectedField as any).enum = [...new Set(values)];
                this.markDirty();
            }
        });
    }

    public setTextAlign(align: 'left' | 'center' | 'right'): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any).textAlign = align;
        this.markDirty();
    }

    public onSubSchemaRefChange(iri: string): void {
        const schema = this.resolveRefSchema(iri);
        if (schema) { this.changeSubSchemaRef(schema); }
    }

    public get selectedSubSchemaIri(): string {
        return (this.selectedField as any)?.type || '';
    }

    public get selectedFieldCanBeUpdatable(): boolean {
        if (!this.selectedField) { return false; }
        const type = this.getFieldCurrentType(this.selectedField);
        return !SchemasConfigurationComponent.NON_UPDATABLE_TYPES.has(type);
    }

    public isGeoJsonTypeSelected(type: string): boolean {
        const opts = (this.selectedField as any)?.availableOptions;
        return Array.isArray(opts) ? opts.includes(type) : false;
    }

    public toggleGeoJsonType(type: string): void {
        if (!this.selectedField) { return; }
        const f = this.selectedField as any;
        if (!Array.isArray(f.availableOptions)) { f.availableOptions = []; }
        const idx = f.availableOptions.indexOf(type);
        if (idx === -1) { f.availableOptions.push(type); } else { f.availableOptions.splice(idx, 1); }
        this.markDirty();
    }

    public getEnumText(): string {
        return ((this.selectedField as any)?.enum as string[] | undefined)?.join('\n') ?? '';
    }

    public onEnumChange(text: string): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any).enum = text.split('\n').map((v: string) => v.trim()).filter((v: string) => v.length > 0);
        this.markDirty();
    }

    public resetHelpText(): void {
        if (!this.selectedField) { return; }
        const f = this.selectedField as any;
        f.textColor = '#000000';
        f.textSize = '18px';
        f.textBold = false;
        this.markDirty();
    }

    public getHelpTextSize(): number | null {
        const raw = (this.selectedField as any)?.textSize;
        if (raw === null || raw === undefined || raw === '') { return null; }
        const num = parseFloat(String(raw).replace('px', ''));
        return isNaN(num) ? null : num;
    }

    public setHelpTextSize(value: number | string | null): void {
        if (!this.selectedField) { return; }
        const f = this.selectedField as any;
        if (value === null || value === undefined || value === '') {
            f.textSize = '';
        } else {
            const num = parseFloat(String(value).replace('px', ''));
            f.textSize = isNaN(num) ? '' : num + 'px';
        }
        this.markDirty();
    }

    public getFieldCurrentType(field: SchemaField): string {
        if (!field) { return 'string'; }
        const us = (field as any).unitSystem;
        if (us === 'prefix') { return 'prefix'; }
        if (us === 'postfix') { return 'postfix'; }
        if (field.isRef) {
            if (field.type === '#GeoJSON') { return 'geo'; }
            if (field.type === '#SentinelHUB') { return 'sentinel'; }
            return 'sub-schema';
        }
        const ft = this.fieldTypes.find(f =>
            !f.isRef &&
            // tslint:disable-next-line:triple-equals
            field.type == f.schemaType &&
            // tslint:disable-next-line:triple-equals
            (field.format || undefined) == f.format &&
            // tslint:disable-next-line:triple-equals
            (field.pattern || undefined) == f.pattern &&
            // tslint:disable-next-line:triple-equals
            (field.customType || undefined) == f.customType
        );
        return ft?.key || 'string';
    }

    private get currentFieldScope(): SchemaField[] {
        return this.isDrilling
            ? this.drillCurrentFields
            : (this.selectedSchema?.fields ?? []);
    }

    public get selectedFieldHasGeoAncestors(): boolean {
        return relationAncestors('geo', this.selectedField?.customType || '').length > 0;
    }

    public get geoDependencyOptions(): SchemaField[] {
        const field = this.selectedField;
        if (!field) {
            return [];
        }
        return this.currentFieldScope.filter(candidate =>
            candidate !== field &&
            isAncestorType('geo', candidate.customType || '', field.customType || '')
        );
    }

    public geoDependencyLabel(field: SchemaField | null): string {
        return field?.description || field?.title || field?.name || '';
    }

    public setGeoDependency(parentName: string | null): void {
        if (!this.selectedField) {
            return;
        }
        this.selectedField.dependency = parentName
            ? { on: parentName, kind: 'geo' }
            : undefined;
        this.markDirty();
    }

    public onFieldNameChange(name: string): void {
        if (!this.selectedField) {
            return;
        }
        const oldName = this.selectedField.name;
        this.selectedField.name = name;
        for (const candidate of this.currentFieldScope) {
            if (candidate.dependency?.kind === 'geo' && candidate.dependency.on === oldName) {
                candidate.dependency = { ...candidate.dependency, on: name };
            }
        }
        this.markDirty();
    }

    public changeFieldType(ft: FieldTypeUI): void {
        if (!this.selectedField) { return; }
        if (ft.key === 'sub-schema') {
            // Already a sub-schema: keep the current reference — the "Referenced schema"
            // dropdown is how it gets changed, so clicking the tile is a no-op.
            if (this.getFieldCurrentType(this.selectedField) === 'sub-schema') { return; }
            // Convert a plain field into a sub-schema: set up a bare reference and let the
            // "Referenced schema" dropdown pick the actual schema.
            const sub = this.selectedField as any;
            sub.isRef = true;
            sub.type = '';
            sub.fields = [];
            sub.format = '';
            sub.pattern = '';
            sub.customType = '';
            sub.unitSystem = '';
            delete sub.enum;
            sub.default = null;
            sub.suggest = null;
            sub.examples = undefined;
            this._rebuildRefPreset();
            this.markDirty();
            return;
        }
        const f = this.selectedField as any;
        f.isRef = ft.isRef || false;
        f.type = ft.schemaType || 'string';
        f.format = ft.format || '';
        f.pattern = ft.pattern || '';
        f.customType = ft.customType || '';
        f.unitSystem = ft.unitSystem || '';
        delete f.enum;
        if (ft.key === 'enum') { f.enum = []; }
        if (SchemasConfigurationComponent.NON_UPDATABLE_TYPES.has(ft.key)) { f.isUpdatable = false; }
        f.default = null;
        f.suggest = null;
        f.examples = undefined;
        this._rebuildRefPreset();
        this.markDirty();
    }

    public changeSubSchemaRef(schema: Schema): void {
        if (!this.selectedField || !this.selectedField.isRef) { return; }
        const oldIri = (this.selectedField as any).type;
        const f = this.selectedField as any;
        f.type = schema.iri || '';
        f.fields = schema.fields ? [...schema.fields] : [];
        // If the changed field's old IRI appears in the drill stack, those entries are stale — close.
        if (oldIri && this.drillStack.some(e => e.schemaIri === oldIri)) {
            this.drillStack = [];
        }
        this.markDirty();
    }

    private resetArrayDependencyEditor(): void {
        this.newArrayDependencyField = null;
        this.newArrayDependencyOn = null;
        this.newArrayDependencyTitle = null;
        this.resetArrayDependencyMappings();
    }

    private resetArrayDependencyMappings(): void {
        this.newArrayDependencyMappingSource = null;
        this.newArrayDependencyMappingTarget = null;
        this.newArrayDependencyValueMappings = [];
    }

    private arrayDependencyFieldLabel(field: SchemaField): string {
        const label = field.description || field.title || field.name;
        return label === field.name ? field.name : `${label} (${field.name})`;
    }

    private collectArrayDependencyFieldGroups(
        fields: SchemaField[],
        prefix: string[],
        labelPrefix: string,
        maxDepth: number = 12,
    ): ArrayDependencyFieldGroup[] {
        if (prefix.length > maxDepth) { return []; }
        const groups: ArrayDependencyFieldGroup[] = [];
        const directItems: ArrayDependencyFieldOption[] = [];

        for (const field of fields) {
            if (field.readOnly || !field.isRef) { continue; }
            const nestedFields = this.resolveRefSchema(field.type)?.fields ?? field.fields ?? [];
            if (!nestedFields.length) { continue; }
            const path = [...prefix, field.name];
            if (field.isArray) {
                directItems.push({
                    pathStr: path.join('.'),
                    label: this.arrayDependencyFieldLabel(field),
                });
                continue;
            }
            groups.push(...this.collectArrayDependencyFieldGroups(
                nestedFields,
                path,
                `${labelPrefix} > ${this.arrayDependencyFieldLabel(field)}`,
                maxDepth,
            ));
        }

        if (directItems.length) {
            groups.unshift({ label: labelPrefix, items: directItems });
        }
        return groups;
    }

    public get arrayDependencyFieldGroups(): ArrayDependencyFieldGroup[] {
        const schema = this.selectedSchema;
        if (!schema?.fields?.length) { return []; }
        return this.collectArrayDependencyFieldGroups(
            schema.fields,
            [],
            schema.name || 'This Schema',
        );
    }

    private resolveArrayDependencyItemFields(path: string[]): SchemaField[] {
        let fields = this.selectedSchema?.fields ?? [];
        for (const name of path) {
            const field = fields.find(item => item.name === name);
            if (!field?.isRef) { return []; }
            fields = this.resolveRefSchema(field.type)?.fields ?? field.fields ?? [];
        }
        return fields;
    }

    private arrayDependencyValueOptions(path: string | null): ArrayDependencyFieldOption[] {
        if (!path) { return []; }
        return this.resolveArrayDependencyItemFields(path.split('.'))
            .filter(field => !field.isRef && !field.isArray && !field.readOnly)
            .map(field => ({
                pathStr: field.name,
                label: this.arrayDependencyFieldLabel(field),
            }));
    }

    public get arrayDependencyTitleOptions(): ArrayDependencyFieldOption[] {
        return this.arrayDependencyValueOptions(this.newArrayDependencyOn);
    }

    public get arrayDependencyMappingSourceOptions(): ArrayDependencyFieldOption[] {
        return this.arrayDependencyValueOptions(this.newArrayDependencyOn);
    }

    public get arrayDependencyMappingTargetOptions(): ArrayDependencyFieldOption[] {
        return this.arrayDependencyValueOptions(this.newArrayDependencyField);
    }

    public arrayDependencyMappingLabel(path: string[], scope: string | null): string {
        const pathStr = path.join('.');
        const option = this.arrayDependencyValueOptions(scope)
            .find(item => item.pathStr === pathStr);
        return option ? option.label : this.arrayDependencyLabel(path);
    }

    public arrayDependencyDisplayLabel(path: string[]): string {
        const pathStr = path.join('.');
        for (const group of this.arrayDependencyFieldGroups) {
            const option = group.items.find(item => item.pathStr === pathStr);
            if (option) { return option.label; }
        }
        return this.arrayDependencyLabel(path);
    }

    public arrayDependencyTitleDisplayLabel(dependency: ISchemaArrayDependency): string {
        let fields = this.resolveArrayDependencyItemFields(dependency.on);
        let field: SchemaField | undefined;
        for (const name of dependency.title ?? []) {
            field = fields.find(item => item.name === name);
            if (!field) { return this.arrayDependencyLabel(dependency.title ?? []); }
            fields = field.isRef
                ? this.resolveRefSchema(field.type)?.fields ?? field.fields ?? []
                : [];
        }
        return field
            ? this.arrayDependencyFieldLabel(field)
            : this.arrayDependencyLabel(dependency.title ?? []);
    }

    public updateOverflowTitle(event: MouseEvent, text: string): void {
        const element = event.currentTarget;
        if (!(element instanceof HTMLElement)) { return; }
        if (element.scrollWidth > element.clientWidth || this.overflowsAncestor(element)) {
            element.setAttribute('title', text);
        } else {
            element.removeAttribute('title');
        }
    }

    private overflowsAncestor(element: HTMLElement): boolean {
        const elementRect = element.getBoundingClientRect();
        let parent = element.parentElement;
        while (parent) {
            const style = getComputedStyle(parent);
            const clipsContent = style.overflowX === 'hidden' ||
                style.overflowX === 'clip' ||
                style.overflow === 'hidden' ||
                style.overflow === 'clip';
            if (clipsContent) {
                const parentRect = parent.getBoundingClientRect();
                if (elementRect.right > parentRect.right + 1 ||
                    elementRect.left < parentRect.left - 1) {
                    return true;
                }
            }
            parent = parent.parentElement;
        }
        return false;
    }

    public updateArrayLinkPanelWidth(event: MouseEvent): void {
        const element = event.currentTarget;
        if (!(element instanceof HTMLElement)) { return; }
        document.documentElement.style.setProperty(
            '--sc-array-link-panel-width',
            `${element.getBoundingClientRect().width}px`,
        );
    }

    public get arrayDependencies(): ISchemaArrayDependency[] {
        return this.selectedSchema?.arrayDependencies ?? [];
    }

    public get arrayDependencyCount(): number {
        return this.arrayDependencies.length;
    }

    private createsArrayDependencyCycle(field: string, on: string): boolean {
        const graph = new Map<string, string[]>();
        for (const dependency of this.arrayDependencies) {
            const source = dependency.on.join('.');
            const targets = graph.get(source) ?? [];
            targets.push(dependency.field.join('.'));
            graph.set(source, targets);
        }
        const visited = new Set<string>();
        const pending = [field];
        while (pending.length) {
            const current = pending.pop();
            if (!current) { continue; }
            if (current === on) { return true; }
            if (visited.has(current)) { continue; }
            visited.add(current);
            pending.push(...(graph.get(current) ?? []));
        }
        return false;
    }

    public canAddArrayDependency(): boolean {
        const field = this.newArrayDependencyField;
        const on = this.newArrayDependencyOn;
        if (!field || !on || field === on) { return false; }
        const availablePaths = new Set(
            this.arrayDependencyFieldGroups.flatMap(group => group.items.map(item => item.pathStr))
        );
        if (!availablePaths.has(field) || !availablePaths.has(on)) { return false; }
        if (this.arrayDependencies.some(item => item.field.join('.') === field)) { return false; }
        if (this.arrayDependencies.some(item => item.on.join('.') === field)) { return false; }
        return !this.createsArrayDependencyCycle(field, on);
    }

    public addArrayDependency(): void {
        const schema = this.selectedSchema;
        const field = this.newArrayDependencyField;
        const on = this.newArrayDependencyOn;
        if (!schema || !field || !on || !this.canAddArrayDependency()) { return; }
        const dependency: ISchemaArrayDependency = {
            field: field.split('.'),
            on: on.split('.'),
            kind: 'array',
        };
        if (this.newArrayDependencyTitle) {
            dependency.title = this.newArrayDependencyTitle.split('.');
        }
        if (this.newArrayDependencyValueMappings.length) {
            dependency.valueMappings = this.newArrayDependencyValueMappings
                .map(item => ({ source: [...item.source], target: [...item.target] }));
        }
        schema.arrayDependencies = [...(schema.arrayDependencies ?? []), dependency];
        this.resetArrayDependencyEditor();
        this.markDirty();
    }

    public removeArrayDependency(dependency: ISchemaArrayDependency): void {
        const schema = this.selectedSchema;
        if (!schema) { return; }
        schema.arrayDependencies = (schema.arrayDependencies ?? [])
            .filter(item => item !== dependency);
        this.markDirty();
    }

    public onArrayDependencySourceChange(): void {
        this.newArrayDependencyTitle = null;
        this.resetArrayDependencyMappings();
    }

    public onArrayDependencyTargetChange(): void {
        this.resetArrayDependencyMappings();
    }

    public canAddArrayDependencyMapping(): boolean {
        const source = this.newArrayDependencyMappingSource;
        const target = this.newArrayDependencyMappingTarget;
        if (!source || !target) { return false; }
        return !this.newArrayDependencyValueMappings
            .some(item => item.target.join('.') === target);
    }

    public addArrayDependencyMapping(): void {
        const source = this.newArrayDependencyMappingSource;
        const target = this.newArrayDependencyMappingTarget;
        if (!source || !target || !this.canAddArrayDependencyMapping()) { return; }
        this.newArrayDependencyValueMappings = [
            ...this.newArrayDependencyValueMappings,
            { source: source.split('.'), target: target.split('.') },
        ];
        this.newArrayDependencyMappingSource = null;
        this.newArrayDependencyMappingTarget = null;
    }

    public removeArrayDependencyMapping(mapping: ISchemaArrayDependencyMapping): void {
        this.newArrayDependencyValueMappings = this.newArrayDependencyValueMappings
            .filter(item => item !== mapping);
    }

    public arrayDependencyLabel(path: string[]): string {
        return path.join(' › ');
    }

    // Referenced sub-schemas may live only in _subSchemasByIri (the API's $defs for the
    // loaded schema), not in the paginated sidebar list, so resolve from both.
    private resolveRefSchema(iri: string): Schema | undefined {
        if (!iri) { return undefined; }
        return this.schemas.find(s => s.iri === iri) ?? this._subSchemasByIri.get(iri);
    }

    public get availableRefSchemas(): Schema[] {
        const list = this.schemas.filter(s => this.canDragSchema(s));
        // Keep the currently-referenced schema selectable even when it isn't in the
        // draggable list, otherwise the dropdown value matches no option and shows blank.
        const currentIri = this.selectedSubSchemaIri;
        if (currentIri && !list.some(s => s.iri === currentIri)) {
            const current = this.resolveRefSchema(currentIri);
            if (current) { return [current, ...list]; }
        }
        return list;
    }

    public enterSubSchema(field: SchemaField, event: Event): void {
        event.stopPropagation();
        this.selectedField = null;
        // Use Schema.fields from this.schemas so edits are tracked on the sub-schema entity.
        // Fall back to field.fields (parseFields clone) for built-in refs (GeoJSON, Sentinel).
        const subSchema = this.schemas.find(s => s.iri === field.type);
        // If the sidebar schema has no fields but the withDefs-parsed root resolved them via
        // $defs, initialise the sidebar schema's fields from the clone so that drillCurrentFields
        // and subSchema.fields remain the same reference and saveAll can find the edits.
        if (subSchema && !subSchema.fields?.length && field.fields?.length) {
            subSchema.fields = [...field.fields];
        }
        const fields = subSchema?.fields ?? field.fields ?? [];
        this.drillStack = [
            ...this.drillStack,
            { fieldLabel: field.title || field.name, fields, schemaIri: field.type || '' }
        ];
        this.resetArrayDependencyEditor();
        this._parentLoadId = null;
        this.loadParentSchemas();
    }

    public drillTo(index: number): void {
        this.drillStack = this.drillStack.slice(0, index + 1);
        this.selectedField = null;
        this.resetArrayDependencyEditor();
        this._parentLoadId = null;
        this.loadParentSchemas();
    }

    public drillBack(): void {
        this.drillStack = this.drillStack.slice(0, -1);
        this.selectedField = null;
        this.activeDrillTab = 'fields';
        this.resetArrayDependencyEditor();
        this._parentLoadId = null;
        this.loadParentSchemas();
    }

    public drillClose(): void {
        this.drillStack = [];
        this.selectedField = null;
        this.activeDrillTab = 'fields';
        this.resetArrayDependencyEditor();
        this._parentLoadId = null;
        this.loadParentSchemas();
    }

    public addDrillField(ft: FieldTypeUI): void {
        const newField = this.buildNewField(ft, this.drillCurrentFields);
        if (this.sidebarDropIndex !== -1) {
            const at = this.sidebarDropPos === 'bot' ? this.sidebarDropIndex + 1 : this.sidebarDropIndex;
            this.drillCurrentFields.splice(at, 0, newField);
        } else {
            this.drillCurrentFields.push(newField);
        }
        this.selectedField = newField;
        this.markDirty();
    }

    public deleteDrillField(field: SchemaField, event: Event): void {
        event.stopPropagation();
        const idx = this.drillCurrentFields.indexOf(field);
        if (idx !== -1) {
            this.removeGeoDependenciesByField(field, this.drillCurrentFields);
            this.drillCurrentFields.splice(idx, 1);
            if (this.selectedField === field) { this.selectedField = null; }
            this.markDirty();
        }
    }

    public onFieldTypeDragStart(event: DragEvent, ft: FieldTypeUI): void {
        this._dragFieldType = ft;
        this._dragSchema = null;
        event.dataTransfer!.effectAllowed = 'copy';
        event.dataTransfer!.setData('text/plain', 'ft:' + ft.key);
        this.setDragGhost(event);
    }

    public isCircularDependency(schema: Schema): boolean {
        // Use live field refs, not document.$defs — withDefs() bloats $defs and causes false positives.
        const schemaMap = new Map<string, Schema>();
        for (const s of this.schemas) {
            if (s.iri) { schemaMap.set(s.iri, s); }
        }

        const ancestors = new Set<string>();
        if (this.selectedSchema?.iri) { ancestors.add(this.selectedSchema.iri); }
        for (const entry of this.drillStack) {
            if (entry.schemaIri) { ancestors.add(entry.schemaIri); }
        }
        if (!ancestors.size) { return false; }

        const visited = new Set<string>();
        const visit = (s: Schema): void => {
            if (!s.iri || visited.has(s.iri)) { return; }
            visited.add(s.iri);
            for (const f of (s.fields || [])) {
                if (f.isRef && f.type) {
                    const ref = schemaMap.get(f.type);
                    if (ref) { visit(ref); }
                }
            }
        };
        visit(schema);

        for (const iri of ancestors) {
            if (visited.has(iri)) { return true; }
        }
        return false;
    }

    public canDragSchema(schema: Schema): boolean {
        const selId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        const schId = schema.id || (schema as any)._id;
        if (selId && selId === schId) { return false; }
        const contextIri = this.currentDrilledSchemaIri;
        if (contextIri && schema.iri === contextIri) { return false; }
        if (this.isCircularDependency(schema)) { return false; }
        return true;
    }

    public getSchemaRowTooltip(schema: Schema): string {
        const selId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        const schId = schema.id || (schema as any)._id;
        if (selId && selId === schId) {
            return this.isDrilling
                ? 'Would create a circular dependency'
                : 'Cannot use the current schema as a sub-schema';
        }
        const contextIri = this.currentDrilledSchemaIri;
        if (contextIri && schema.iri === contextIri) { return 'Cannot add the currently viewed sub-schema to itself'; }
        if (this.isCircularDependency(schema)) { return 'Would create a circular dependency'; }
        return '';
    }

    public onSchemaDragStart(event: DragEvent, schema: Schema): void {
        if (!this.canDragSchema(schema)) { event.preventDefault(); return; }
        this._dragSchema = schema;
        this._dragFieldType = null;
        event.dataTransfer!.effectAllowed = 'copy';
        event.dataTransfer!.setData('text/plain', 'schema:' + (schema.id || (schema as any)._id));
        this.setDragGhost(event);
    }

    private setDragGhost(event: DragEvent): void {
        const src = event.currentTarget as HTMLElement;
        const ghost = src.cloneNode(true) as HTMLElement;
        ghost.style.cssText = `position:fixed;top:-1000px;left:-1000px;margin:0;pointer-events:none;`;
        document.body.appendChild(ghost);
        event.dataTransfer!.setDragImage(ghost, src.offsetWidth / 2, src.offsetHeight / 2);
        // Remove after the browser has captured the ghost frame
        setTimeout(() => { if (ghost.parentNode) { ghost.parentNode.removeChild(ghost); } }, 0);
    }

    public onDragEnd(): void {
        this._dragFieldType = null;
        this._dragSchema = null;
        this._dragEnterCount = 0;
        this.sidebarDropIndex = -1;
    }

    public onCardMouseDown(event: MouseEvent, field: SchemaField, fields: SchemaField[]): void {
        if ((event.target as HTMLElement).closest('button')) { return; }
        event.preventDefault();
        if (this._mouseMoveListener) { this.clearReorder(); }
        const card = event.currentTarget as HTMLElement;
        const rect = card.getBoundingClientRect();
        this.reorderField = field;
        this._dragFields = fields;
        this._dragStartX = event.clientX;
        this._dragStartY = event.clientY;
        this._dragOffsetX = event.clientX - rect.left;
        this._dragOffsetY = event.clientY - rect.top;
        this.dragFloatWidth = rect.width;
        this.isDragActive = false;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        this._mouseMoveListener = (e: MouseEvent) => this.onDocMouseMove(e);
        this._mouseUpListener = (e: MouseEvent) => this._zone.run(() => this.onDocMouseUp(e));
        document.addEventListener('mousemove', this._mouseMoveListener);
        document.addEventListener('mouseup', this._mouseUpListener);
    }

    private onDocMouseMove(event: MouseEvent): void {
        if (!this.reorderField || !this._dragFields) { return; }
        const dx = event.clientX - this._dragStartX;
        const dy = event.clientY - this._dragStartY;
        if (!this.isDragActive && Math.hypot(dx, dy) > 4) {
            this.isDragActive = true;
        }
        if (!this.isDragActive) { return; }
        this.dragFloatX = event.clientX - this._dragOffsetX;
        this.dragFloatY = event.clientY - this._dragOffsetY;
        this.updateDropIndicator(event.clientX, event.clientY);
        this._cdr.detectChanges();
    }

    private onDocMouseUp(event: MouseEvent): void {
        if (this.isDragActive && this.reorderField && this._dragFields) {
            const fields = this._dragFields;
            const srcIdx = fields.indexOf(this.reorderField);
            if (srcIdx !== -1) {
                if (this.reorderAtEnd) {
                    if (srcIdx !== fields.length - 1) {
                        const [f] = fields.splice(srcIdx, 1);
                        fields.push(f);
                        this.markDirty();
                    }
                } else if (this.reorderOverIndex !== -1 && this.reorderOverIndex !== srcIdx) {
                    // No index adjustment needed: splice target is valid in both directions.
                    const [f] = fields.splice(srcIdx, 1);
                    fields.splice(this.reorderOverIndex, 0, f);
                    this.markDirty();
                }
            }
        }
        this.clearReorder();
    }

    private updateDropIndicator(clientX: number, clientY: number): void {
        if (!this._dragFields || !this.reorderField) { return; }
        const isDrill = this._dragFields === this.drillCurrentFields;
        const cardSelector = isDrill
            ? '.sc-drill-card'
            : '.sc-field-card:not(.sc-field-card--system)';
        const root = this._elRef.nativeElement as HTMLElement;
        const cards = Array.from(root.querySelectorAll<HTMLElement>(cardSelector));
        const srcIdx = this._dragFields.indexOf(this.reorderField);

        this.reorderOverIndex = -1;
        this.reorderAtEnd = false;

        for (let i = 0; i < cards.length && i < this._dragFields.length; i++) {
            if (i === srcIdx) { continue; }
            const rect = cards[i].getBoundingClientRect();
            if (clientY >= rect.top && clientY <= rect.bottom) {
                this.reorderOverIndex = i;
                return;
            }
        }

        // Checking full canvas rect would fire over the system-fields section — use last card bottom instead.
        if (cards.length > 0) {
            const lastRect = cards[cards.length - 1].getBoundingClientRect();
            if (clientY > lastRect.bottom) {
                this.reorderAtEnd = true;
            }
        } else {
            const canvasSelector = isDrill ? '.sc-drill-content' : '.sc-editor-body';
            const canvas = root.querySelector<HTMLElement>(canvasSelector);
            if (canvas) {
                const cr = canvas.getBoundingClientRect();
                if (clientY >= cr.top && clientY <= cr.bottom && clientX >= cr.left && clientX <= cr.right) {
                    this.reorderAtEnd = true;
                }
            }
        }
    }

    private clearReorder(): void {
        if (this._mouseMoveListener) {
            document.removeEventListener('mousemove', this._mouseMoveListener);
            this._mouseMoveListener = null;
        }
        if (this._mouseUpListener) {
            document.removeEventListener('mouseup', this._mouseUpListener);
            this._mouseUpListener = null;
        }
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        this.reorderField = null;
        this._dragFields = null;
        this.reorderOverIndex = -1;
        this.reorderAtEnd = false;
        this.isDragActive = false;
    }

    public onCanvasDragEnter(event: DragEvent): void {
        if (!this._dragFieldType && !this._dragSchema) { return; }
        this._dragEnterCount++;
        this.isDragOverCanvas = true;
    }

    public onCanvasDragOver(event: DragEvent): void {
        if (!this._dragFieldType && !this._dragSchema) { return; }
        event.preventDefault();
        event.dataTransfer!.dropEffect = 'copy';
        this.updateSidebarDropIndicator(event.clientY);
    }

    private updateSidebarDropIndicator(clientY: number): void {
        // Midpoint boundaries so gaps between cards map unambiguously to an insertion slot.
        const cardSelector = this.isDrilling
            ? '.sc-drill-card'
            : '.sc-field-card:not(.sc-field-card--system)';
        const cards = Array.from(
            (this._elRef.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(cardSelector)
        );
        if (cards.length === 0) { this.sidebarDropIndex = -1; return; }

        for (let i = 0; i < cards.length; i++) {
            const rect = cards[i].getBoundingClientRect();
            if (clientY <= rect.top + rect.height / 2) {
                this.sidebarDropIndex = i;
                this.sidebarDropPos = 'top';
                return;
            }
        }
        this.sidebarDropIndex = cards.length - 1;
        this.sidebarDropPos = 'bot';
    }

    public onCanvasDragLeave(event: DragEvent): void {
        this._dragEnterCount--;
        if (this._dragEnterCount <= 0) {
            this._dragEnterCount = 0;
            this.isDragOverCanvas = false;
            this.sidebarDropIndex = -1;
        }
    }

    public onCanvasDrop(event: DragEvent): void {
        event.preventDefault();
        this._dragEnterCount = 0;
        this.isDragOverCanvas = false;
        if (!this.selectedSchema) { return; }
        if (this._dragFieldType) {
            if (this.isDrilling) { this.addDrillField(this._dragFieldType); }
            else { this.addField(this._dragFieldType); }
        } else if (this._dragSchema) {
            if (this.isDrilling) { this.addDrillSchemaField(this._dragSchema); }
            else { this.addSchemaField(this._dragSchema); }
        }
        this._dragFieldType = null;
        this._dragSchema = null;
        this.sidebarDropIndex = -1;
    }

    private addDrillSchemaField(schema: Schema): void {
        const existingNames = new Set((this.drillCurrentFields ?? []).map((f: SchemaField) => f.name));
        let idx = 1;
        while (existingNames.has(`field_${idx}`)) { idx++; }
        const field = {
            name: `field_${idx}`,
            title: schema.name || 'Sub-schema',
            description: schema.name || '',
            required: false,
            isArray: false,
            isRef: true,
            readOnly: false,
            type: schema.iri || '',
            format: '',
            pattern: '',
            unit: '',
            unitSystem: '',
            property: null,
            customType: 'subSchema',
            availableOptions: [],
            isUpdatable: false,
            hidden: false,
            autocalculate: false,
            expression: '',
            fields: schema.fields ? [...schema.fields] : [],
        } as unknown as SchemaField;
        if (this.sidebarDropIndex !== -1) {
            const at = this.sidebarDropPos === 'bot' ? this.sidebarDropIndex + 1 : this.sidebarDropIndex;
            this.drillCurrentFields.splice(at, 0, field);
        } else {
            this.drillCurrentFields.push(field);
        }
        this.selectedField = field;
        this.markDirty();
    }

    private addSchemaField(schema: Schema): void {
        if (!this.selectedSchema) { return; }
        const existingNames = new Set((this.selectedSchema.fields ?? []).map((f: SchemaField) => f.name));
        let idx = 1;
        while (existingNames.has(`field_${idx}`)) { idx++; }
        const field = {
            name: `field_${idx}`,
            title: schema.name || 'Sub-schema',
            description: schema.name || '',
            required: false,
            isArray: false,
            isRef: true,
            readOnly: false,
            type: schema.iri || '',
            format: '',
            pattern: '',
            unit: '',
            unitSystem: '',
            property: null,
            customType: 'subSchema',
            availableOptions: [],
            isUpdatable: false,
            hidden: false,
            autocalculate: false,
            expression: '',
            fields: schema.fields ? [...schema.fields] : [],
        } as unknown as SchemaField;
        if (this.sidebarDropIndex !== -1) {
            const at = this.sidebarDropPos === 'bot' ? this.sidebarDropIndex + 1 : this.sidebarDropIndex;
            this.selectedSchema.fields.splice(at, 0, field);
        } else {
            this.selectedSchema.fields.push(field);
        }
        this.selectedField = field;
        this.markDirty();
    }

    public onNewSchema(): void {
        this.newSchemaName = '';
        this.showNewSchemaDialog = true;
    }

    public saveNewSchema(): void {
        const name = this.newSchemaName.trim();
        if (!name) { return; }
        const schema = new Schema();
        schema.name = name;
        schema.entity = SchemaEntity.NONE;
        schema.category = this.getCategory();
        schema.topicId = this.topic || '';
        schema.status = SchemaStatus.DRAFT;
        schema.fields = [];
        schema.conditions = [];
        const dirtyKey = `new:${schema.uuid}`;
        this.newSchemaKeys.add(dirtyKey);
        this.schemas = [...this.schemas, schema];
        this.selectedSchema = schema;
        this.drillStack = [];
        this.selectedField = null;
        this.dirtySchemaIds.add(dirtyKey);
        this.showNewSchemaDialog = false;
        this.newSchemaName = '';
        // Clear schemaId from URL — queryParamMap skips the selectedSchema reset for in-memory entries.
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { type: this.type || undefined, topic: this.topic || undefined },
            replaceUrl: true,
        });
    }

    public getFieldIcon(field: SchemaField): string {
        const key = this.getFieldCurrentType(field);
        return this.fieldTypes.find(ft => ft.key === key)?.icon || 'pi-pencil';
    }

    public getFieldTypeBadge(field: SchemaField): string {
        const key = this.getFieldCurrentType(field);
        return this.fieldTypes.find(ft => ft.key === key)?.label || 'String';
    }

    public getRefSchemaName(field: SchemaField): string {
        if (!field.isRef) { return ''; }
        return this.resolveRefSchema((field as any).type)?.name || '';
    }

    // ── Conditions ─────────────────────────────────────────────────────────────

    private get _contextFields(): SchemaField[] {
        return this.isDrilling ? this.drillCurrentFields : (this.currentContextSchema?.fields ?? []);
    }

    public get conditionOwnedFieldNames(): Set<string> {
        const names = new Set<string>();
        for (const cond of this.currentContextSchema?.conditions ?? []) {
            for (const f of cond.thenFields ?? []) { names.add(f.name); }
            for (const f of cond.elseFields ?? []) { names.add(f.name); }
        }
        return names;
    }

    public get canvasFields(): SchemaField[] {
        const all = this.isDrilling ? this.drillCurrentFields : (this.selectedSchema?.fields ?? []);
        const owned = this.conditionOwnedFieldNames;
        return all.filter(f => !owned.has(f.name));
    }

    public getConditionFieldGroups(): {
        groupLabel: string;
        isRoot: boolean;
        fields: { pathStr: string; label: string }[];
    }[] {
        const schema = this.currentContextSchema;
        if (!schema) { return []; }
        const schemaByIri = new Map(this.schemas.filter(s => s.iri).map(s => [s.iri as string, s]));
        const rootGroup = { groupLabel: '', isRoot: true, fields: [] as { pathStr: string; label: string }[] };
        const nested: { groupLabel: string; isRoot: false; fields: { pathStr: string; label: string }[] }[] = [];

        for (const f of schema.fields ?? []) {
            if (f.readOnly) { continue; }
            if (f.isRef && f.type) {
                const ref = schemaByIri.get(f.type);
                const refFields = ref?.fields ?? (Array.isArray((f as any).fields) && (f as any).fields.length ? (f as any).fields : []);
                if (refFields.length) {
                    const group = { groupLabel: f.title || f.name, isRoot: false as const, fields: [] as { pathStr: string; label: string }[] };
                    this._collectLeafConditionFields(refFields, [f.name], schemaByIri, group.fields);
                    if (group.fields.length) { nested.push(group); }
                }
            } else {
                rootGroup.fields.push({ pathStr: f.name, label: f.title || f.name });
            }
        }

        const result: { groupLabel: string; isRoot: boolean; fields: { pathStr: string; label: string }[] }[] = [];
        if (rootGroup.fields.length) { result.push(rootGroup); }
        result.push(...nested);
        return result;
    }

    private _collectLeafConditionFields(
        fields: SchemaField[],
        pathParts: string[],
        schemaByIri: Map<string, Schema>,
        out: { pathStr: string; label: string }[]
    ): void {
        for (const f of fields) {
            if (f.readOnly) { continue; }
            if (f.isRef && f.type) {
                const ref = schemaByIri.get(f.type);
                const refFields = ref?.fields ?? (Array.isArray((f as any).fields) && (f as any).fields.length ? (f as any).fields : []);
                if (refFields.length) {
                    this._collectLeafConditionFields(refFields, [...pathParts, f.name], schemaByIri, out);
                }
            } else {
                out.push({ pathStr: [...pathParts, f.name].join('.'), label: f.title || f.name });
            }
        }
    }

    // Reconstructs the dot-path for the field stored in a condition row.
    // Needed because the stored object may be a field from a nested sub-schema.
    public getIfRowFieldPath(row: any): string {
        const storedPath = row?.fieldPath;
        if (Array.isArray(storedPath) && storedPath.length) { return storedPath.join('.'); }
        const field = row?.field;
        if (!field) { return ''; }
        const schema = this.currentContextSchema;
        if (!schema) { return field.name ?? ''; }
        const schemaByIri = new Map(this.schemas.filter(s => s.iri).map(s => [s.iri as string, s]));

        // Direct field match
        if (schema.fields?.some(f => f.name === field.name && !f.isRef)) { return field.name; }

        // Search inside sub-schemas
        for (const f of schema.fields ?? []) {
            if (f.isRef && f.type) {
                const ref = schemaByIri.get(f.type);
                const refFields = ref?.fields ?? (Array.isArray((f as any).fields) ? (f as any).fields : []);
                const found = this._findConditionFieldPath(field, refFields, [f.name], schemaByIri);
                if (found) { return found; }
            }
        }
        return field.name ?? '';
    }

    private _findConditionFieldPath(
        target: SchemaField,
        fields: SchemaField[],
        pathParts: string[],
        schemaByIri: Map<string, Schema>
    ): string | null {
        for (const f of fields) {
            if (!f.isRef && f.name === target.name) { return [...pathParts, f.name].join('.'); }
            if (f.isRef && f.type) {
                const ref = schemaByIri.get(f.type);
                const refFields = ref?.fields ?? (Array.isArray((f as any).fields) ? (f as any).fields : []);
                const found = this._findConditionFieldPath(target, refFields, [...pathParts, f.name], schemaByIri);
                if (found) { return found; }
            }
        }
        return null;
    }

    private _resolveConditionField(pathStr: string): SchemaField | null {
        const parts = pathStr.split('.');
        const schema = this.currentContextSchema;
        if (!schema) { return null; }
        const schemaByIri = new Map(this.schemas.filter(s => s.iri).map(s => [s.iri as string, s]));

        if (parts.length === 1) { return schema.fields?.find(f => f.name === parts[0]) ?? null; }

        let fields = schema.fields ?? [];
        for (let i = 0; i < parts.length - 1; i++) {
            const refField = fields.find(f => f.name === parts[i] && f.isRef);
            if (!refField) { return null; }
            const ref = schemaByIri.get(refField.type);
            fields = ref?.fields ?? (Array.isArray((refField as any).fields) ? (refField as any).fields : []);
        }
        return fields.find(f => f.name === parts[parts.length - 1]) ?? null;
    }

    private get _firstConditionField(): SchemaField | null {
        for (const group of this.getConditionFieldGroups()) {
            for (const opt of group.fields) {
                const f = this._resolveConditionField(opt.pathStr);
                if (f) { return f; }
            }
        }
        return null;
    }

    public get schemaConditionCount(): number {
        return this.currentContextSchema?.conditions?.length ?? 0;
    }

    public isFieldConditional(field: SchemaField): boolean {
        const schema = this.currentContextSchema;
        if (!schema?.conditions?.length) { return false; }
        return schema.conditions.some(c => {
            const ic = c.ifCondition as any;
            if ('AND' in ic) { return (ic.AND as any[])?.some((r: any) => r.field?.name === field.name); }
            if ('OR' in ic) { return (ic.OR as any[])?.some((r: any) => r.field?.name === field.name); }
            return ic.field?.name === field.name;
        });
    }

    public get canAddCondition(): boolean {
        return this.getConditionFieldGroups().some(g => g.fields.length > 0);
    }

    // ── IF operator / rows ───────────────────────────────────────────────────

    public getIfOperator(cond: SchemaCondition): 'SINGLE' | 'AND' | 'OR' {
        const ic = cond.ifCondition as any;
        if ('AND' in ic) { return 'AND'; }
        if ('OR' in ic) { return 'OR'; }
        return 'SINGLE';
    }

    public getIfRows(cond: SchemaCondition): any[] {
        const ic = cond.ifCondition as any;
        if ('AND' in ic) { return ic.AND || []; }
        if ('OR' in ic) { return ic.OR || []; }
        return [ic];
    }

    public setConditionOperator(cond: SchemaCondition, op: 'SINGLE' | 'AND' | 'OR'): void {
        const rows = this.getIfRows(cond);
        const first = rows[0] ?? { field: this._firstConditionField, fieldValue: '' };
        const predicate = {
            field: first.field,
            fieldValue: first.fieldValue,
            ...(Array.isArray(first.fieldPath) && first.fieldPath.length > 1 ? { fieldPath: first.fieldPath } : {}),
        };
        if (op === 'SINGLE') {
            (cond as any).ifCondition = predicate;
        } else if (op === 'AND') {
            (cond as any).ifCondition = { AND: [predicate] };
        } else {
            (cond as any).ifCondition = { OR: [predicate] };
        }
        this.markDirty();
    }

    public getIfRowFieldName(row: any): string { return row?.field?.name ?? ''; }
    public getIfRowValue(row: any): any { return row?.fieldValue ?? ''; }
    public isIfRowEnum(row: any): boolean { return !!(row?.field?.enum?.length); }
    public getIfRowOptions(row: any): string[] { return row?.field?.enum ?? []; }

    public setIfRowField(cond: SchemaCondition, rowIdx: number, pathStr: string): void {
        const field = this._resolveConditionField(pathStr);
        if (!field) { return; }
        const fieldPath = pathStr.split('.');
        const predicate = {
            field,
            fieldValue: '',
            ...(fieldPath.length > 1 ? { fieldPath } : {}),
        };
        const ic = cond.ifCondition as any;
        if ('AND' in ic) { ic.AND[rowIdx] = predicate; }
        else if ('OR' in ic) { ic.OR[rowIdx] = predicate; }
        else { (cond as any).ifCondition = predicate; }
        this.markDirty();
    }

    public setIfRowValue(cond: SchemaCondition, rowIdx: number, value: any): void {
        const ic = cond.ifCondition as any;
        if ('AND' in ic) { ic.AND[rowIdx].fieldValue = value; }
        else if ('OR' in ic) { ic.OR[rowIdx].fieldValue = value; }
        else { ic.fieldValue = value; }
        this.markDirty();
    }

    public addIfRow(cond: SchemaCondition): void {
        const ic = cond.ifCondition as any;
        const newRow = { field: this._firstConditionField, fieldValue: '' };
        if ('AND' in ic) { ic.AND.push(newRow); }
        else if ('OR' in ic) { ic.OR.push(newRow); }
        this.markDirty();
    }

    public removeIfRow(cond: SchemaCondition, rowIdx: number): void {
        const ic = cond.ifCondition as any;
        if ('AND' in ic && ic.AND.length > 1) { ic.AND.splice(rowIdx, 1); }
        else if ('OR' in ic && ic.OR.length > 1) { ic.OR.splice(rowIdx, 1); }
        this.markDirty();
    }

    // ── THEN / ELSE fields ───────────────────────────────────────────────────

    public addThenField(cond: SchemaCondition): void {
        const schema = this.currentContextSchema;
        if (!schema) { return; }
        const newField = this.buildNewField(this.defaultFieldType, schema.fields);
        (schema.fields ??= []).push(newField);
        (cond.thenFields ??= []).push(newField);
        this.markDirty();
    }

    public addElseField(cond: SchemaCondition): void {
        const schema = this.currentContextSchema;
        if (!schema) { return; }
        const newField = this.buildNewField(this.defaultFieldType, schema.fields);
        (schema.fields ??= []).push(newField);
        (cond.elseFields ??= []).push(newField);
        this.markDirty();
    }

    public removeThenField(cond: SchemaCondition, field: SchemaField): void {
        cond.thenFields = (cond.thenFields || []).filter(f => f !== field);
        const schema = this.currentContextSchema;
        if (schema) {
            const idx = schema.fields.indexOf(field);
            if (idx !== -1) { schema.fields.splice(idx, 1); }
        }
        if (this.selectedField === field) { this.selectedField = null; }
        this.markDirty();
    }

    public removeElseField(cond: SchemaCondition, field: SchemaField): void {
        cond.elseFields = (cond.elseFields || []).filter(f => f !== field);
        const schema = this.currentContextSchema;
        if (schema) {
            const idx = schema.fields.indexOf(field);
            if (idx !== -1) { schema.fields.splice(idx, 1); }
        }
        if (this.selectedField === field) { this.selectedField = null; }
        this.markDirty();
    }

    // ── Cross-schema targets ─────────────────────────────────────────────────

    private _resolveFieldByPath(path: string[]): SchemaField | null {
        const schemaByIri = new Map(this.schemas.map(s => [s.iri, s]));
        let fields = this.currentContextSchema?.fields ?? [];
        let field: SchemaField | null = null;
        for (let i = 0; i < path.length; i++) {
            field = fields.find(f => f.name === path[i]) ?? null;
            if (!field) { return null; }
            if (i < path.length - 1) {
                const ref = schemaByIri.get(field.type);
                fields = ref?.fields
                    ?? (Array.isArray((field as any).fields) && (field as any).fields.length ? (field as any).fields : []);
            }
        }
        return field;
    }

    public getCrossTargetPaths(): { pathStr: string; label: string }[] {
        const schema = this.currentContextSchema;
        if (!schema?.fields) { return []; }
        const schemaByIri = new Map(this.schemas.map(s => [s.iri, s]));
        const result: { pathStr: string; label: string }[] = [];

        const traverse = (fields: SchemaField[], pathParts: string[], labelParts: string[]) => {
            for (const f of fields) {
                if (f.isRef && f.type) {
                    const ref = schemaByIri.get(f.type);
                    const refFields = ref?.fields ?? (Array.isArray((f as any).fields) && (f as any).fields.length ? (f as any).fields : []);
                    if (refFields.length) {
                        traverse(refFields, [...pathParts, f.name], [...labelParts, ref?.name || f.name]);
                    }
                } else if (!f.readOnly) {
                    result.push({
                        pathStr: [...pathParts, f.name].join('.'),
                        label: [...labelParts, f.name].join(' › '),
                    });
                }
            }
        };

        for (const f of schema.fields) {
            if (f.isRef && f.type) {
                const ref = schemaByIri.get(f.type);
                const refFields = ref?.fields ?? (Array.isArray((f as any).fields) && (f as any).fields.length ? (f as any).fields : []);
                if (refFields.length) {
                    traverse(refFields, [f.name], [ref?.name || f.name]);
                }
            }
        }
        return result;
    }

    private conditionFieldGroupsCache: { label: string; items: { pathStr: string; label: string }[] }[] | null = null;
    private conditionFieldGroupsCacheSchema: Schema | null = null;
    private conditionFieldGroupsCacheSchemas: Schema[] | null = null;
    private conditionFieldGroupsCacheVersion = -1;

    public getConditionFieldPSelectGroups(): { label: string; items: { pathStr: string; label: string }[] }[] {
        const schema = this.currentContextSchema;
        if (this.conditionFieldGroupsCache
            && this.conditionFieldGroupsCacheSchema === schema
            && this.conditionFieldGroupsCacheSchemas === this.schemas
            && this.conditionFieldGroupsCacheVersion === this.schemaEditVersion) {
            return this.conditionFieldGroupsCache;
        }
        const groups = this.buildConditionFieldPSelectGroups();
        this.conditionFieldGroupsCache = groups;
        this.conditionFieldGroupsCacheSchema = schema;
        this.conditionFieldGroupsCacheSchemas = this.schemas;
        this.conditionFieldGroupsCacheVersion = this.schemaEditVersion;
        return groups;
    }

    private buildConditionFieldPSelectGroups(): { label: string; items: { pathStr: string; label: string }[] }[] {
        const schema = this.currentContextSchema;
        if (!schema) { return []; }
        const schemaByIri = new Map(this.schemas.filter(s => s.iri).map(s => [s.iri as string, s]));
        const result: { label: string; items: { pathStr: string; label: string }[] }[] = [];

        const nestLabel = (name: string, depth: number) =>
            depth <= 1 ? name : ' '.repeat((depth - 1) * 3) + '› ' + name;

        const addGroups = (fields: SchemaField[], pathParts: string[], groupName: string, depth: number) => {
            const items: { pathStr: string; label: string }[] = [];
            for (const f of fields) {
                if (f.readOnly || (f.isRef && f.type)) { continue; }
                items.push({ pathStr: [...pathParts, f.name].join('.'), label: f.description || f.title || f.name });
            }
            if (items.length) {
                result.push({ label: nestLabel(groupName, depth), items });
            }
            for (const f of fields) {
                if (f.readOnly || !f.isRef || !f.type) { continue; }
                const ref = schemaByIri.get(f.type);
                const refFields = ref?.fields
                    ?? (Array.isArray((f as any).fields) && (f as any).fields.length ? (f as any).fields : []);
                if (refFields.length) {
                    addGroups(refFields, [...pathParts, f.name], ref?.name || f.name, depth + 1);
                }
            }
        };

        addGroups(schema.fields ?? [], [], 'This schema', 0);
        return result;
    }

    public condThenRefVal: Record<number, string | null> = {};
    public condElseRefVal: Record<number, string | null> = {};

    private crossTargetGroupsCache: { label: string; items: { pathStr: string; label: string; isBlock?: boolean }[] }[] | null = null;
    private crossTargetGroupsCacheSchema: Schema | null = null;
    private crossTargetGroupsCacheSchemas: Schema[] | null = null;
    private crossTargetGroupsCacheVersion = -1;

    public getCrossTargetPSelectGroups(): { label: string; items: { pathStr: string; label: string; isBlock?: boolean }[] }[] {
        const schema = this.currentContextSchema;
        if (this.crossTargetGroupsCache
            && this.crossTargetGroupsCacheSchema === schema
            && this.crossTargetGroupsCacheSchemas === this.schemas
            && this.crossTargetGroupsCacheVersion === this.schemaEditVersion) {
            return this.crossTargetGroupsCache;
        }
        const groups = this.buildCrossTargetPSelectGroups();
        this.crossTargetGroupsCache = groups;
        this.crossTargetGroupsCacheSchema = schema;
        this.crossTargetGroupsCacheSchemas = this.schemas;
        this.crossTargetGroupsCacheVersion = this.schemaEditVersion;
        return groups;
    }

    private buildCrossTargetPSelectGroups(): { label: string; items: { pathStr: string; label: string; isBlock?: boolean }[] }[] {
        const schema = this.currentContextSchema;
        if (!schema?.fields) { return []; }
        const schemaByIri = new Map(this.schemas.map(s => [s.iri, s]));
        const result: { label: string; items: { pathStr: string; label: string; isBlock?: boolean }[] }[] = [];

        const nestLabel = (name: string, depth: number) =>
            depth <= 1 ? name : ' '.repeat((depth - 1) * 3) + '› ' + name;

        const traverse = (fields: SchemaField[], pathParts: string[], groupName: string, depth: number) => {
            const items: { pathStr: string; label: string; isBlock?: boolean }[] = [];
            for (const f of fields) {
                if (f.readOnly) { continue; }
                if (f.isRef && f.type) {
                    const ref = schemaByIri.get(f.type);
                    const refFields = ref?.fields ?? (Array.isArray((f as any).fields) && (f as any).fields.length ? (f as any).fields : []);
                    if (refFields.length) {
                        items.push({
                            pathStr: [...pathParts, f.name].join('.'),
                            label: f.description || f.title || f.name,
                            isBlock: true
                        });
                    }
                    continue;
                }
                items.push({ pathStr: [...pathParts, f.name].join('.'), label: f.description || f.title || f.name });
            }
            if (items.length) {
                result.push({ label: nestLabel(groupName, depth), items });
            }
            for (const f of fields) {
                if (f.readOnly || !f.isRef || !f.type) { continue; }
                const ref = schemaByIri.get(f.type);
                const refFields = ref?.fields ?? (Array.isArray((f as any).fields) && (f as any).fields.length ? (f as any).fields : []);
                if (refFields.length) {
                    traverse(refFields, [...pathParts, f.name], ref?.name || f.name, depth + 1);
                }
            }
        };

        for (const f of schema.fields) {
            if (f.readOnly || !f.isRef || !f.type) { continue; }
            const ref = schemaByIri.get(f.type);
            const refFields = ref?.fields ?? (Array.isArray((f as any).fields) && (f as any).fields.length ? (f as any).fields : []);
            if (refFields.length) {
                traverse(refFields, [f.name], ref?.name || f.name, 1);
            }
        }

        return result;
    }

    public onCondThenRefChange(cond: SchemaCondition, ci: number, pathStr: string): void {
        if (!pathStr) { return; }
        this.addThenTarget(cond, pathStr);
        setTimeout(() => { this.condThenRefVal[ci] = null; });
    }

    public onCondElseRefChange(cond: SchemaCondition, ci: number, pathStr: string): void {
        if (!pathStr) { return; }
        this.addElseTarget(cond, pathStr);
        setTimeout(() => { this.condElseRefVal[ci] = null; });
    }

    public addThenTarget(cond: SchemaCondition, pathStr: string): void {
        if (!pathStr) { return; }
        const path = pathStr.split('.');
        if (cond.thenTargets?.some(t => t.fieldPath.join('.') === pathStr)) { return; }
        const field = this._resolveFieldByPath(path);
        if (!field) { return; }
        cond.thenTargets = [...(cond.thenTargets ?? []), { field, fieldPath: path }];
        this.markDirty();
    }

    public addElseTarget(cond: SchemaCondition, pathStr: string): void {
        if (!pathStr) { return; }
        const path = pathStr.split('.');
        if (cond.elseTargets?.some(t => t.fieldPath.join('.') === pathStr)) { return; }
        const field = this._resolveFieldByPath(path);
        if (!field) { return; }
        cond.elseTargets = [...(cond.elseTargets ?? []), { field, fieldPath: path }];
        this.markDirty();
    }

    public removeThenTarget(cond: SchemaCondition, target: SchemaConditionTarget): void {
        cond.thenTargets = (cond.thenTargets || []).filter(t => t !== target);
        this.markDirty();
    }

    public removeElseTarget(cond: SchemaCondition, target: SchemaConditionTarget): void {
        cond.elseTargets = (cond.elseTargets || []).filter(t => t !== target);
        this.markDirty();
    }

    public openTargetSchema(target: SchemaConditionTarget): void {
        const refFieldName = target.fieldPath[0];
        if (!refFieldName) { return; }
        const refField = this.currentContextSchema?.fields.find(f => f.name === refFieldName);
        if (!refField?.type) { return; }
        const schema = this.schemas.find(s => s.iri === refField.type);
        if (schema) { this.switchSchema(schema); }
    }

    // ── Top-level condition management ────────────────────────────────────────

    public addNewCondition(): void {
        const schema = this.currentContextSchema;
        const firstField = this._firstConditionField;
        if (!schema || !firstField) { return; }
        const newCond: SchemaCondition = {
            ifCondition: { field: firstField, fieldValue: '' } as any,
            thenFields: [],
            elseFields: [],
        };
        schema.conditions = [...(schema.conditions ?? []), newCond];
        this.markDirty();
    }

    public removeConditionAt(index: number): void {
        const schema = this.currentContextSchema;
        if (!schema) { return; }
        // H1: rekey index-keyed dropdown state before the conditions array shrinks
        const rekey = (rec: Record<number, string | null>) => {
            const out: Record<number, string | null> = {};
            for (const [k, v] of Object.entries(rec)) {
                const ki = Number(k);
                if (ki < index) { out[ki] = v; }
                else if (ki > index) { out[ki - 1] = v; }
            }
            return out;
        };
        this.condThenRefVal = rekey(this.condThenRefVal);
        this.condElseRefVal = rekey(this.condElseRefVal);
        const cond = schema.conditions?.[index];
        if (cond) {
            const toRemove = new Set([
                ...(cond.thenFields ?? []).map(f => f.name),
                ...(cond.elseFields ?? []).map(f => f.name),
            ]);
            if (toRemove.size) {
                // H2: splice in-place to preserve drillStack reference
                for (let i = schema.fields.length - 1; i >= 0; i--) {
                    if (toRemove.has(schema.fields[i].name)) { schema.fields.splice(i, 1); }
                }
                if (toRemove.has(this.selectedField?.name ?? '')) { this.selectedField = null; }
            }
        }
        schema.conditions = (schema.conditions ?? []).filter((_, i) => i !== index);
        this.markDirty();
    }

    private upsertInSidebar(schema: Schema): void {
        const schemaId = schema.id || (schema as any)._id;
        const schemaUuid = (schema as any).uuid;
        if (!schemaId && !schemaUuid) { return; }
        const idx = this.schemas.findIndex(s => {
            const sId = s.id || (s as any)._id;
            if (schemaId && sId) { return sId === schemaId; }
            return (s as any).uuid === schemaUuid;
        });
        if (idx === -1) {
            this.schemas = [...this.schemas, schema];
        } else {
            const updated = [...this.schemas];
            updated[idx] = schema;
            this.schemas = updated;
        }
    }

    private loadSchemas(topicId: string, append: boolean = false): void {
        if (append) {
            this.schemasLoadingMore = true;
        } else {
            this.schemasLoading = true;
        }
        const search = this.schemaSearch.trim() || undefined;
        this._cancelLoadSchemas$.next();
        this.schemaService.getSchemasByPage({
            category: this.getCategory(),
            topicId,
            pageIndex: this.schemasPage,
            pageSize: this.schemasPageSize,
            search,
        })
            .pipe(takeUntil(this._cancelLoadSchemas$), takeUntil(this.destroy$))
            .subscribe({
                next: (response: HttpResponse<ISchema[]>) => {
                    const total = Number(response.headers?.get('X-Total-Count') || 0);
                    const items = (response.body || [])
                        .map(s => { try { return new Schema(s); } catch { return null; } })
                        .filter((s): s is Schema => s !== null);
                    this.schemasTotal = total;
                    if (search) {
                        items.sort((a, b) => this.rankMatch(b.name || '', search) - this.rankMatch(a.name || '', search));
                    }
                    if (append) {
                        const selectedId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
                        const existing = new Set(this.schemas.map(s => s.id || (s as any)._id));
                        const fresh = items.filter(s => {
                            const id = s.id || (s as any)._id;
                            return !id || id === selectedId || !existing.has(id);
                        });
                        this.schemas = [...this.schemas, ...fresh];
                        this.schemasLoadingMore = false;
                    } else {
                        this.schemas = items;
                        this.schemasLoading = false;
                    }
                    this.schemasFetched = true;
                    if (this.selectedSchema) { this.upsertInSidebar(this.selectedSchema); }
                },
                error: () => {
                    if (append) {
                        this.schemasLoadingMore = false;
                    } else {
                        this.schemas = [];
                        this.schemasLoading = false;
                    }
                }
            });
    }

    private buildNewField(ft: FieldTypeUI, contextFields?: SchemaField[]): SchemaField {
        const existingNames = new Set((contextFields ?? this.selectedSchema?.fields ?? []).map(f => f.name));
        let idx = 1;
        while (existingNames.has(`field_${idx}`)) { idx++; }
        const field: any = {
            name: `field_${idx}`,
            title: ft.label,
            description: '',
            required: false,
            isArray: false,
            isRef: ft.isRef || false,
            readOnly: false,
            type: ft.schemaType || 'string',
            format: ft.format || '',
            pattern: ft.pattern || '',
            unit: '',
            unitSystem: ft.unitSystem || '',
            property: null,
            customType: ft.customType || '',
            isUpdatable: false,
            hidden: false,
            autocalculate: false,
            expression: '',
        };
        if (ft.key === 'enum') {
            field.enum = [];
        }
        if (ft.key === 'geo' || ft.key === 'sentinel') {
            field.availableOptions = [];
        }
        return field as SchemaField;
    }

    private getCategory(): SchemaCategory {
        switch (this.type) {
            case 'tool':    return SchemaCategory.TOOL;
            case 'module':  return SchemaCategory.MODULE;
            case 'tag':     return SchemaCategory.TAG;
            case 'system':  return SchemaCategory.SYSTEM;
            case 'policy':
            default:        return SchemaCategory.POLICY;
        }
    }

    public onDeleteSchema(schema: Schema): void {
        const dirtyKey = `new:${(schema as any).uuid}`;
        if (this.newSchemaKeys.has(dirtyKey)) {
            const wasSelected = this.selectedSchema === schema;
            this.schemas = this.schemas.filter(s => s !== schema);
            this.newSchemaKeys.delete(dirtyKey);
            this.dirtySchemaIds.delete(dirtyKey);
            if (wasSelected) {
                this.selectedSchema = this.schemas[0] ?? null;
                this.drillStack = [];
                this.selectedField = null;
                const nextId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
                void this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: {
                        schemaId: nextId || undefined,
                        type: this.type || undefined,
                        topic: this.topic || undefined,
                    },
                    replaceUrl: true,
                });
            }
            return;
        }
        const id = schema.id || (schema as any)._id;
        if (!id) { return; }
        this.schemaService.getSchemaDeletionPreview([id])
            .pipe(takeUntil(this.destroy$))
            .subscribe(result => {
                const dialogRef = this.dialogService.open(SchemaDeleteDialogComponent, {
                    showHeader: false,
                    width: '640px',
                    styleClass: 'guardian-dialog',
                    data: {
                        header: 'Delete Schema',
                        itemNames: [schema.name],
                        deletableChildren: result.deletableChildren,
                        blockedChildren: result.blockedChildren,
                    },
                });
                if (!dialogRef) { return; }
                dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
                    if (res?.action === 'Delete') {
                        const wasSelected = this.selectedSchema?.id === id || (this.selectedSchema as any)?._id === id;
                        let returnUrl = location.href;
                        if (wasSelected) {
                            const deletedIndex = this.schemas.findIndex(s => s.id === id || (s as any)._id === id);
                            const remaining = this.schemas.filter(s => s.id !== id && (s as any)._id !== id);
                            const next = remaining[Math.min(deletedIndex, remaining.length - 1)] ?? null;
                            const nextId = next?.id || (next as any)?._id;
                            const urlTree = this.router.createUrlTree([], {
                                relativeTo: this.route,
                                queryParams: {
                                    schemaId: nextId || undefined,
                                    type: this.type || undefined,
                                    topic: this.topic || undefined,
                                },
                            });
                            returnUrl = location.origin + this.router.serializeUrl(urlTree);
                        }
                        this.schemaService.delete(id, res.includeChildren)
                            .pipe(takeUntil(this.destroy$))
                            .subscribe((result: any) => {
                                void this.router.navigate(['task', result.taskId], {
                                    queryParams: { last: btoa(returnUrl) },
                                });
                            });
                    }
                });
            });
    }

    // Build $defs the same way as the old editor (SchemaHelper.findRefs + uniqueRefs),
    // then post-process to strip nested $defs from every entry and exclude the root schema
    // so it never appears in its own $defs (prevents circular dependency errors).
    private _buildRefs(schema: Schema): Record<string, any> {
        const subSchemasList = [...this._subSchemasByIri.values()];
        const rawDefs = SchemaHelper.findRefs(schema, subSchemasList);
        const result: Record<string, any> = {};
        for (const [iri, doc] of Object.entries(rawDefs)) {
            if (iri === schema.iri) { continue; }   // never put root schema in its own $defs
            const clean = { ...(doc as any) };
            delete clean.$defs;                     // strip nested $defs from each entry
            result[iri] = clean;
        }
        return result;
    }

    public onPublish(): void {
        const id = this.selectedSchemaId;
        if (!id || !this.canPublish) { return; }
        const dialogRef = this.dialogService.open(SetVersionDialog, {
            width: '350px',
            modal: true,
            closable: false,
            data: { schema: this.selectedSchema },
        });
        if (!dialogRef) { return; }
        dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe((version: string) => {
            if (!version) { return; }
            this.schemaService.pushPublish(id, version)
                .pipe(takeUntil(this.destroy$))
                .subscribe(result => {
                    void this.router.navigate(['task', result.taskId], {
                        queryParams: { last: btoa(location.href) },
                    });
                });
        });
    }

    public setPreviewPill(pill: 'submitter' | 'readonly'): void {
        this.previewPill = pill;
        this.rebuildPreview();
    }

    private rebuildPreview(): void {
        if (!this.selectedSchema || this.previewPill === 'submitter') {
            this.previewPreset = null;
            this.previewReadonlyFields = null;
            return;
        }
        this.previewPreset = DocumentGenerator.generateDocument(this.selectedSchema);
        this.previewReadonlyFields = this.selectedSchema.fields;
    }

    public onExport(): void {
        const id = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        if (!id) { return; }
        this.schemaService.exportInMessage(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(schema => {
                this.dialogService.open(ExportSchemaDialog, {
                    header: 'Export Schema',
                    width: '700px',
                    styleClass: 'custom-dialog',
                    data: { schema },
                });
            });
    }

    public onSidebarScroll(event: Event): void {
        const el = event.target as HTMLElement;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (!nearBottom || this.schemasLoadingMore || this.schemasLoading) { return; }
        if (this.schemas.length >= this.schemasTotal) { return; }
        this.schemasPage++;
        this.loadSchemas(this.topic, true);
    }

    private rankMatch(name: string, search: string): number {
        const n = name.toLowerCase();
        const s = search.toLowerCase();
        if (n === s) { return 3; }
        if (n.startsWith(s)) { return 2; }
        if (n.includes(s)) { return 1; }
        return 0;
    }

    private mergeSchemaNames(subSchemas: Schema[]): void {
        if (!subSchemas.length || !this.schemas.length) { return; }
        const nameMap = new Map<string, string>();
        for (const s of subSchemas) {
            const id = s.id || (s as any)._id;
            if (id && s.name) { nameMap.set(id, s.name); }
        }
        this.schemas = this.schemas.map(s => {
            const id = s.id || (s as any)._id;
            if (id && !s.name && nameMap.has(id)) {
                return Object.assign(Object.create(Object.getPrototypeOf(s)), s, { name: nameMap.get(id) });
            }
            return s;
        });
    }

    public ngOnDestroy(): void {
        this.clearReorder();
        this.forgetCanvasTab();
        this.destroy$.next();
        this.destroy$.complete();
    }
}

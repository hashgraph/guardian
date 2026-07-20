import { ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { EMPTY, Subject, forkJoin } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { DefaultFieldDictionary, ISchema, Schema, SchemaCategory, SchemaEntity, SchemaField, SchemaHelper, SchemaStatus } from '@guardian/interfaces';
import { SchemaService } from 'src/app/services/schema.service';
import { DialogService } from 'primeng/dynamicdialog';
import { SchemaDeleteDialogComponent } from 'src/app/modules/schema-engine/schema-delete-dialog/schema-delete-dialog.component';

export interface FieldType {
    key: string;
    label: string;
    icon: string;
    group: string;
    schemaType?: string;
    format?: string;
    pattern?: string;
    isRef?: boolean;
    customType?: string;
    unitSystem?: string;
    accent?: boolean;
}

export interface DrillEntry {
    fieldLabel: string;
    fields: SchemaField[];
    schemaIri: string;
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

    public schemas: Schema[] = [];
    public schemasLoading: boolean = false;
    public schemaSearch: string = '';

    public selectedSchema: Schema | null = null;
    public selectedField: SchemaField | null = null;
    public previewPill: 'submitter' | 'reviewer' | 'readonly' = 'submitter';

    public drillStack: DrillEntry[] = [];
    public get isDrilling(): boolean { return this.drillStack.length > 0; }
    public get drillCurrentFields(): SchemaField[] { return this.drillStack[this.drillStack.length - 1]?.fields ?? []; }
    public get currentDrilledSchemaIri(): string { return this.drillStack[this.drillStack.length - 1]?.schemaIri || ''; }

    private dirtySchemaIds = new Set<string>();
    public isSaving: boolean = false;

    // ── Drag-and-drop state ──
    public isDragOverCanvas: boolean = false;
    private _dragEnterCount: number = 0;
    private _dragFieldType: FieldType | null = null;
    private _dragSchema: Schema | null = null;

    // ── Field card reorder state (mouse-based) ──
    public reorderField: SchemaField | null = null;
    public reorderOverIndex: number = -1;
    public reorderAtEnd: boolean = false;
    public isDragActive: boolean = false;
    public dragFloatX: number = 0;
    public dragFloatY: number = 0;
    public dragFloatWidth: number = 0;

    // ── Sidebar DnD insert-position state ──
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

    public hoveredSchemaId: string | null = null;
    public showNewSchemaDialog: boolean = false;
    public newSchemaName: string = '';
    public newSchemaSaving: boolean = false;
    private newSchemaKeys = new Set<string>(); // 'new:<uuid>' keys for unsaved schemas
    public systemFieldsCollapsed: boolean = true;
    public schemaPropsCollapsed: boolean = false;
    public drillPropsCollapsed: boolean = false;

    public get drilledSchema(): Schema | null {
        const iri = this.currentDrilledSchemaIri;
        return iri ? (this.schemas.find(s => s.iri === iri) ?? null) : null;
    }

    public readonly entityOptions: { label: string; value: SchemaEntity }[] = [
        { label: 'Default',                        value: SchemaEntity.NONE },
        { label: 'Verifiable Credential',          value: SchemaEntity.VC   },
        { label: 'Encrypted Verifiable Credential', value: SchemaEntity.EVC },
    ];

    public get systemFields(): any[] {
        return DefaultFieldDictionary.getDefaultFields(this.selectedSchema?.entity as SchemaEntity);
    }

    public readonly fieldTypes: FieldType[] = [
        // Simple Types (matches FieldTypesDictionary.FieldTypes)
        { key: 'number',        label: 'Number',      icon: 'pi-hashtag',             group: 'Simple Types',    schemaType: 'number' },
        { key: 'integer',       label: 'Integer',     icon: 'pi-sort-numeric-up-alt', group: 'Simple Types',    schemaType: 'integer' },
        { key: 'string',        label: 'String',      icon: 'pi-pencil',              group: 'Simple Types',    schemaType: 'string' },
        { key: 'boolean',       label: 'Boolean',     icon: 'pi-check-square',        group: 'Simple Types',    schemaType: 'boolean' },
        { key: 'date',          label: 'Date',        icon: 'pi-calendar',            group: 'Simple Types',    schemaType: 'string', format: 'date' },
        { key: 'time',          label: 'Time',        icon: 'pi-clock',               group: 'Simple Types',    schemaType: 'string', format: 'time' },
        { key: 'dateTime',      label: 'DateTime',    icon: 'pi-calendar',            group: 'Simple Types',    schemaType: 'string', format: 'date-time' },
        { key: 'duration',      label: 'Duration',    icon: 'pi-hourglass',           group: 'Simple Types',    schemaType: 'string', format: 'duration' },
        { key: 'url',           label: 'URL',         icon: 'pi-link',                group: 'Simple Types',    schemaType: 'string', format: 'url' },
        { key: 'uri',           label: 'URI',         icon: 'pi-external-link',       group: 'Simple Types',    schemaType: 'string', format: 'uri' },
        { key: 'email',         label: 'Email',       icon: 'pi-envelope',            group: 'Simple Types',    schemaType: 'string', format: 'email' },
        // tslint:disable-next-line:no-invalid-template-strings
        { key: 'image',         label: 'Image',       icon: 'pi-image',               group: 'Simple Types',    schemaType: 'string', pattern: '^ipfs:\/\/.+' },
        // tslint:disable-next-line:no-invalid-template-strings
        { key: 'file',          label: 'File',        icon: 'pi-upload',              group: 'Simple Types',    schemaType: 'string', pattern: '^ipfs:\/\/.+', customType: 'file' },
        { key: 'enum',          label: 'Enum',        icon: 'pi-list',                group: 'Simple Types',    schemaType: 'string', customType: 'enum' },
        { key: 'helptext',      label: 'Help Text',   icon: 'pi-info-circle',         group: 'Simple Types',    schemaType: 'null' },
        { key: 'geo',           label: 'GeoJSON',     icon: 'pi-map-marker',          group: 'Simple Types',    schemaType: '#GeoJSON',     isRef: true, customType: 'geo' },
        { key: 'sentinel',      label: 'SentinelHUB', icon: 'pi-globe',               group: 'Simple Types',    schemaType: '#SentinelHUB', isRef: true, customType: 'sentinel' },
        { key: 'table',         label: 'Table',       icon: 'pi-table',               group: 'Simple Types',    schemaType: 'string', customType: 'table' },
        // Units of Measure (matches FieldTypesDictionary.CustomFieldTypes)
        { key: 'prefix',        label: 'Prefix',      icon: 'pi-hashtag',             group: 'Units of Measure', schemaType: 'number', unitSystem: 'prefix' },
        { key: 'postfix',       label: 'Postfix',     icon: 'pi-hashtag',             group: 'Units of Measure', schemaType: 'number', unitSystem: 'postfix' },
        { key: 'hederaAccount', label: 'Account',     icon: 'pi-id-card',             group: 'Hedera',           schemaType: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$', customType: 'hederaAccount' },
        // Schema-defined sub-schema reference
        { key: 'sub-schema',    label: 'Sub-schema',  icon: 'pi-sitemap',             group: 'Schema',           isRef: true, accent: true },
    ];

    public get fieldTypeGroups(): { group: string; types: FieldType[] }[] {
        const groups: { group: string; types: FieldType[] }[] = [];
        for (const ft of this.fieldTypes) {
            let g = groups.find(grp => grp.group === ft.group);
            if (!g) { g = { group: ft.group, types: [] }; groups.push(g); }
            g.types.push(ft);
        }
        return groups;
    }

    public get defaultFieldType(): FieldType {
        return this.fieldTypes.find(ft => ft.key === 'string')!;
    }

    private destroy$ = new Subject<void>();
    private schemaLoad$ = new Subject<string>();
    private schemasFetched: boolean = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private schemaService: SchemaService,
        private dialogService: DialogService,
        private _elRef: ElementRef,
        private _zone: NgZone,
        private _cdr: ChangeDetectorRef,
    ) {}

    public ngOnInit(): void {
        // Use the same endpoint as the old editor: schema-with-sub-schemas returns
        // both the target schema and all related topic schemas in a single call.
        // This eliminates the race condition between getSchemaById and loadSchemas
        // where loadSchemas completing last would overwrite this.schemas with new
        // objects, breaking the reference link to this.selectedSchema and causing
        // saveAll() to pick a stale sidebar copy instead of the edited schema.
        this.schemaLoad$.pipe(
            switchMap(id => {
                this.schemaLoading = true;
                const category = this.getCategory();
                const topicId = this.topic;
                return this.schemaService.getSchemaWithSubSchemas(category, id, topicId).pipe(
                    map((data: any) => {
                        // Build $defs from all sub-schemas so parseFields can resolve
                        // $ref pointers. Use throw-away spread copies — never mutate
                        // the original document objects so this.schemas[i].document
                        // stays clean for updateRefs() during save.
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
                        };
                    }),
                    catchError(() => {
                        this.schemaLoading = false;
                        return EMPTY;
                    })
                );
            }),
            takeUntil(this.destroy$)
        ).subscribe(({ schema, subSchemas }) => {
            if (!schema) {
                this.schemaLoading = false;
                if (!this.schemasFetched && subSchemas.length > 0) {
                    this.schemas = subSchemas;
                    this.schemasFetched = true;
                }
                return;
            }
            this.selectedSchema = schema;
            this.schemaLoading = false;
            const schemaId = schema.id || (schema as any)._id;
            if (schemaId) { this.dirtySchemaIds.delete(schemaId); }
            // Derive topic from the loaded schema if the URL param was absent.
            // Without this, getSchemaWithSubSchemas is called without topicId,
            // GET_SUB_SCHEMAS returns 0 schemas, and the sidebar shows only current schema.
            if (!this.topic && schema.topicId) {
                this.topic = schema.topicId;
            }
            // GET_SUB_SCHEMAS returns all topic schemas with full documents, making it the
            // best source for the sidebar (V2 endpoint strips document, breaking circular dep check).
            if (!this.schemasFetched && !this.schemasLoading) {
                if (subSchemas.length > 0) {
                    // subSchemas populated — topicId was present in the request.
                    this.schemas = subSchemas;
                    this.schemasFetched = true;
                } else if (this.topic) {
                    // subSchemas empty because topicId was absent from the original request
                    // but we've now derived it from the schema. Fall back to the V2 endpoint.
                    this.loadSchemas(this.topic);
                }
            }
            this.upsertInSidebar(schema);
        });

        this.route.queryParamMap.pipe(
            takeUntil(this.destroy$)
        ).subscribe(params => {
            this.type = params.get('type') || '';
            this.topic = params.get('topic') || '';
            const schemaId = params.get('schemaId') || '';
            const mode = params.get('mode') || '';
            if (schemaId) {
                // getSchemaWithSubSchemas provides all topic schemas with full documents.
                // The subscribe handler uses subSchemas to populate this.schemas so that
                // $defs-based circular dependency detection works. No separate loadSchemas needed.
                this.schemaLoad$.next(schemaId);
            } else {
                if (this.topic && !this.schemasFetched) {
                    this.schemaLoad$.next('');
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
    }

    public get filteredSchemas(): Schema[] {
        if (!this.schemaSearch.trim()) { return this.schemas; }
        const q = this.schemaSearch.toLowerCase();
        return this.schemas.filter(s => s.name?.toLowerCase().includes(q));
    }

    public isDraft(schema: Schema): boolean {
        return schema.status === SchemaStatus.DRAFT || schema.status === SchemaStatus.ERROR;
    }

    // ── Validation ─────────────────────────────────────────────────────────────

    // Reserved names: always-blocked JSON-LD keys + system fields from DefaultFieldDictionary
    private static readonly SYSTEM_KEYS = new Set([
        '@context', 'type', 'policyId', 'ref', 'guardianVersion',
    ]);

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

        return errors;
    }

    public fieldHasErrors(field: SchemaField): boolean {
        // Use drillCurrentFields for uniqueness checks when this field is in drill context.
        const allFields = this.isDrilling && this.drillCurrentFields.includes(field)
            ? this.drillCurrentFields
            : (this.selectedSchema?.fields ?? []);
        return this.getFieldErrors(field, allFields).length > 0;
    }

    public get selectedFieldErrors(): string[] {
        if (!this.selectedField) { return []; }
        // Validate against the correct sibling list so uniqueness errors are accurate.
        const allFields = this.isDrilling ? this.drillCurrentFields : (this.selectedSchema?.fields ?? []);
        return this.getFieldErrors(this.selectedField, allFields);
    }

    public get currentSchemaErrorCount(): number {
        // Sum errors across ALL dirty schemas so the counter reflects every pending
        // validation issue, even those in sub-schemas the user already drilled out of.
        const selId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        let count = 0;
        for (const dirtyId of this.dirtySchemaIds) {
            const schema = (selId && dirtyId === selId && this.selectedSchema)
                ? this.selectedSchema
                : this.schemas.find(s => (s.id || (s as any)._id) === dirtyId) ?? null;
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
        for (const dirtyId of this.dirtySchemaIds) {
            const schema = (selId && dirtyId === selId && this.selectedSchema)
                ? this.selectedSchema
                : this.schemas.find(s => (s.id || (s as any)._id) === dirtyId) ?? null;
            if (schema && !this.schemaIsValid(schema)) { return false; }
        }
        return true;
    }

    // ────────────────────────────────────────────────────────────────────────────

    public switchSchema(schema: Schema): void {
        const id = schema.id || (schema as any)._id;
        if (!id) {
            // New in-memory schema with no server ID yet — select directly.
            if (this.newSchemaKeys.has(`new:${(schema as any).uuid}`)) {
                this.selectedField = null;
                this.selectedSchema = schema;
                this.drillStack = [];
            }
            return;
        }
        this.selectedField = null;
        // Optimistic update: show schema header immediately while fields load.
        this.selectedSchema = schema;
        this.router.navigate(['/schema-configuration'], {
            queryParams: {
                schemaId: id,
                type: this.type || undefined,
                topic: this.topic || undefined,
            },
            replaceUrl: false
        });
        // Navigation triggers queryParamMap → schemaLoad$.next(id).
    }

    public goBack(): void {
        // B1: only include params that are set; Angular drops undefined values.
        const queryParams: Record<string, string> = {};
        if (this.type) { queryParams['type'] = this.type; }
        if (this.topic) { queryParams['topic'] = this.topic; }
        this.router.navigate(['/schemas'], { queryParams });
    }

    public markDirty(): void {
        // When drilling, the edit belongs to the drilled sub-schema, not the root.
        // Mark both: the sub-schema (because its fields changed) and the root schema
        // (because its $defs will need to be rebuilt to embed the updated sub-document).
        if (this.isDrilling) {
            const contextIri = this.currentDrilledSchemaIri;
            const subSchema = contextIri ? this.schemas.find(s => s.iri === contextIri) : null;
            const subId = subSchema?.id || (subSchema as any)?._id;
            if (subId) { this.dirtySchemaIds.add(subId); }
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
        // Build the save list by iterating dirty IDs so we always prefer
        // this.selectedSchema over any sidebar copy. loadSchemas() and
        // getSchemaById() race: if loadSchemas wins, this.schemas gets new
        // objects that don't share a reference with this.selectedSchema, so
        // a plain this.schemas.filter() would pick the stale sidebar copy
        // (same ID, no user edits) and save the old document.
        const selId = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        const toSave: Schema[] = [];
        const toCreate: Schema[] = [];
        for (const dirtyId of this.dirtySchemaIds) {
            if (this.newSchemaKeys.has(dirtyId)) {
                const uuid = dirtyId.slice(4); // strip 'new:'
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
        const allSchemas = [...toCreate, ...toSave];
        // Phase 1 — rebuild documents from current fields (system fields appended temporarily).
        allSchemas.forEach(s => {
            const userFields = s.fields;
            const defaultFields = DefaultFieldDictionary.getDefaultFields(s.entity as SchemaEntity);
            s.update([...userFields, ...defaultFields], s.conditions);
            s.fields = userFields;
        });
        // Phase 2 — rebuild $defs via BFS over actual field refs (avoids withDefs() self-reference).
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
                            this.router.navigate([], {
                                relativeTo: this.route,
                                queryParams: { schemaId: savedId, type: this.type || undefined, topic: this.topic || undefined },
                                replaceUrl: true,
                            });
                        }
                    }
                })
            )
        );
        const updateObs = toSave.map(s => this.schemaService.update(s as unknown as ISchema));
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

    public addField(ft: FieldType): void {
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

    public deleteField(field: SchemaField, event: Event): void {
        event.stopPropagation();
        if (!this.selectedSchema?.fields) { return; }
        const idx = this.selectedSchema.fields.indexOf(field);
        if (idx !== -1) {
            this.selectedSchema.fields.splice(idx, 1);
            if (this.selectedField === field) {
                this.selectedField = null;
            }
            this.markDirty();
        }
    }

    public selectField(field: SchemaField): void {
        this.selectedField = this.selectedField === field ? null : field;
    }

    public toggleBehaviour(key: 'required' | 'isArray' | 'isUpdatable' | 'readOnly'): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any)[key] = !(this.selectedField as any)[key];
        this.markDirty();
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

    // Types that cannot be updatable (same rule as old editor: only simple types can be)
    private static readonly NON_UPDATABLE_TYPES = new Set(['prefix', 'postfix', 'hederaAccount', 'geo', 'sentinel', 'sub-schema']);

    public get selectedFieldCanBeUpdatable(): boolean {
        if (!this.selectedField) { return false; }
        return !SchemasConfigurationComponent.NON_UPDATABLE_TYPES.has(this.getFieldCurrentType(this.selectedField));
    }

    public readonly geoJsonOptions = ['Point', 'Polygon', 'LineString', 'MultiPoint', 'MultiPolygon', 'MultiLineString'];

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
        f.textSize = '18';
        f.textBold = false;
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

    public changeFieldType(ft: FieldType): void {
        if (!this.selectedField) { return; }
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
        this.markDirty();
    }


    public enterSubSchema(field: SchemaField, event: Event): void {
        event.stopPropagation();
        this.selectedField = null;
        // Use the actual Schema.fields from this.schemas so that edits are tracked
        // on the sub-schema entity itself and get saved separately.
        // Fallback to field.fields (the cloned copy from parseFields) when the schema
        // isn't in the sidebar list (e.g. GeoJSON / Sentinel built-in refs).
        const subSchema = this.schemas.find(s => s.iri === field.type);
        const fields = subSchema?.fields ?? field.fields ?? [];
        this.drillStack = [
            ...this.drillStack,
            { fieldLabel: field.title || field.name, fields, schemaIri: field.type || '' }
        ];
    }

    public drillTo(index: number): void {
        this.drillStack = this.drillStack.slice(0, index + 1);
        this.selectedField = null;
    }

    public drillBack(): void {
        this.drillStack = this.drillStack.slice(0, -1);
        this.selectedField = null;
    }

    public drillClose(): void {
        this.drillStack = [];
        this.selectedField = null;
    }

    public addDrillField(ft: FieldType): void {
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
            this.drillCurrentFields.splice(idx, 1);
            if (this.selectedField === field) { this.selectedField = null; }
            this.markDirty();
        }
    }

    // ── Drag-and-drop ──────────────────────────────────────────────────────────

    public onFieldTypeDragStart(event: DragEvent, ft: FieldType): void {
        this._dragFieldType = ft;
        this._dragSchema = null;
        event.dataTransfer!.effectAllowed = 'copy';
        event.dataTransfer!.setData('text/plain', 'ft:' + ft.key);
        this.setDragGhost(event);
    }

    public isCircularDependency(schema: Schema): boolean {
        // Build IRI → Schema lookup from live fields (never document.$defs, which is
        // bloated by withDefs() and causes false positives).
        const schemaMap = new Map<string, Schema>();
        for (const s of this.schemas) {
            if (s.iri) { schemaMap.set(s.iri, s); }
        }

        // Every schema in the ancestry chain is an off-limits target.
        const ancestors = new Set<string>();
        if (this.selectedSchema?.iri) { ancestors.add(this.selectedSchema.iri); }
        for (const entry of this.drillStack) {
            if (entry.schemaIri) { ancestors.add(entry.schemaIri); }
        }
        if (!ancestors.size) { return false; }

        // DFS through field-level $ref links only.
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
        // Disable the schema we've drilled into — can't add it to its own fields
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

    // ── Field card reorder (mouse-based — no HTML5 DnD ghost) ─────────────────

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
                    // Drop on empty canvas = move to last position
                    if (srcIdx !== fields.length - 1) {
                        const [f] = fields.splice(srcIdx, 1);
                        fields.push(f);
                        this.markDirty();
                    }
                } else if (this.reorderOverIndex !== -1 && this.reorderOverIndex !== srcIdx) {
                    // Hover over another card: remove source then insert at that index.
                    // No adjustment needed — splice target index stays valid in both
                    // directions (srcIdx<target: target shifts down and we land after it;
                    // srcIdx>target: target unchanged and we land before it).
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

        // No card hit — set reorderAtEnd only if below the last visible card.
        // Checking the full canvas rect would incorrectly fire over the system-fields section.
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

    // ────────────────────────────────────────────────────────────────────────────

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
        // Use card midpoints as boundaries so any Y — including the gap between
        // cards — maps unambiguously to an insertion slot, no dead zones.
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
        // Below all midpoints → append after last card
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
            property: '',
            customType: '',
            isUpdatable: false,
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
            property: '',
            customType: '',
            isUpdatable: false,
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

    // ────────────────────────────────────────────────────────────────────────────

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
        // Clear any stale schemaId from URL so a reload doesn't try to load the old schema.
        // The queryParamMap else-branch skips the selectedSchema reset when the selected
        // schema is a new in-memory entry (present in newSchemaKeys).
        this.router.navigate([], {
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
        return this.schemas.find(s => s.iri === field.type)?.name || '';
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

    private loadSchemas(topicId: string): void {
        this.schemasLoading = true;
        this.schemaService.getSchemasByPage({
            category: this.getCategory(),
            topicId,
            pageIndex: 0,
            pageSize: 1000,
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: HttpResponse<ISchema[]>) => {
                    // V2 endpoint returns only metadata fields (no document), so Schema
                    // instances have empty fields but correct name/status/iri for display.
                    this.schemas = (response.body || [])
                        .map(s => { try { return new Schema(s); } catch { return null; } })
                        .filter((s): s is Schema => s !== null);
                    this.schemasLoading = false;
                    this.schemasFetched = true;
                    // If a schema was already selected, preserve its reference in the list
                    // so saveAll() picks the edited copy rather than the freshly loaded one.
                    if (this.selectedSchema) { this.upsertInSidebar(this.selectedSchema); }
                },
                error: () => {
                    this.schemas = [];
                    this.schemasLoading = false;
                    // Don't set schemasFetched on error so the next navigation can retry.
                }
            });
    }

    private buildNewField(ft: FieldType, contextFields?: SchemaField[]): SchemaField {
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
            property: '',
            customType: ft.customType || '',
            isUpdatable: false,
        };
        if (ft.key === 'enum') {
            field.enum = [];
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
                this.router.navigate([], {
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
                        // Compute return URL before navigating away so the task page
                        // can come back to the right schema after delete completes.
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
                                this.router.navigate(['task', result.taskId], {
                                    queryParams: { last: btoa(returnUrl) },
                                });
                            });
                    }
                });
            });
    }

    private _buildRefs(schema: Schema): Record<string, any> {
        const result: Record<string, any> = {};
        const schemaByIri = new Map(this.schemas.map(s => [s.iri, s]));
        const queue = [...(schema.fields || [])];
        const visited = new Set<string>();
        while (queue.length) {
            const field = queue.shift()!;
            if (field.isRef && field.type && !visited.has(field.type)) {
                visited.add(field.type);
                const ref = schemaByIri.get(field.type);
                if (ref) {
                    const doc = { ...ref.document };
                    delete doc.$defs;
                    result[field.type] = doc;
                    queue.push(...(ref.fields || []));
                }
            }
        }
        return result;
    }

    public ngOnDestroy(): void {
        this.clearReorder();
        this.destroy$.next();
        this.destroy$.complete();
    }
}

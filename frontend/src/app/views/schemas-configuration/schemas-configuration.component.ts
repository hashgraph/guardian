import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { EMPTY, Subject, forkJoin } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { DefaultFieldDictionary, ISchema, Schema, SchemaCategory, SchemaEntity, SchemaField, SchemaHelper, SchemaStatus } from '@guardian/interfaces';
import { SchemaService } from 'src/app/services/schema.service';

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

    public get hasUnsavedChanges(): boolean {
        return this.dirtySchemaIds.size > 0;
    }

    public showNewSchemaDialog: boolean = false;
    public newSchemaName: string = '';
    public newSchemaSaving: boolean = false;
    public systemFieldsCollapsed: boolean = true;
    public schemaPropsCollapsed: boolean = false;

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
            if (!schema) { this.schemaLoading = false; return; }
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
                // No schema to edit — load sidebar list directly since there's no
                // getSchemaWithSubSchemas call to supply subSchemas.
                if (this.topic && !this.schemasFetched && !this.schemasLoading) {
                    this.loadSchemas(this.topic);
                }
                if (mode === 'new') {
                    this.showNewSchemaDialog = true;
                } else {
                    this.selectedSchema = null;
                    this.schemaLoading = false;
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
        // A3: guard against schemas with no usable ID (both id and _id absent).
        if (!id) { return; }
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
        // No direct schemaLoad$ call needed here.
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
        if (rootId) { this.dirtySchemaIds.add(rootId); }
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
        for (const dirtyId of this.dirtySchemaIds) {
            if (selId && dirtyId === selId && this.selectedSchema) {
                toSave.push(this.selectedSchema);
            } else {
                const s = this.schemas.find(s => (s.id || (s as any)._id) === dirtyId);
                if (s) { toSave.push(s); }
            }
        }
        if (!toSave.length) { return; }
        this.isSaving = true;
        // Phase 1 — rebuild every schema's JSON document from current fields.
        // Sub-schemas must be rebuilt first so their documents are current when
        // the parent schema's updateRefs() reads them from this.schemas in phase 2.
        // We achieve correct ordering by running update() for ALL schemas before
        // calling updateRefs() for any of them.
        // Mirror the old editor: append system fields (policyId, ref, guardianVersion)
        // so buildDocument writes them to document.properties. Save and restore
        // s.fields so the UI field list is unaffected.
        toSave.forEach(s => {
            const userFields = s.fields;
            const defaultFields = DefaultFieldDictionary.getDefaultFields(s.entity as SchemaEntity);
            s.update([...userFields, ...defaultFields], s.conditions);
            s.fields = userFields;
        });
        // Phase 2 — now that all documents are current, rebuild every schema's $defs.
        // This ensures parent schemas embed the already-updated sub-schema documents.
        toSave.forEach(s => {
            s.updateRefs(this.schemas);
        });
        forkJoin(toSave.map(s => this.schemaService.update(s as unknown as ISchema)))
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.isSaving = false;
                    this.dirtySchemaIds.clear();
                },
                error: () => { this.isSaving = false; }
            });
    }

    public addField(ft: FieldType): void {
        if (!this.selectedSchema) { return; }
        const newField = this.buildNewField(ft);
        this.selectedSchema.fields.push(newField);
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
        const newField = this.buildNewField(ft);
        this.drillCurrentFields.push(newField);
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
        // Use findRefs (field-based) instead of document.$defs, because loadSchemas
        // injects ALL topic schemas into every schema's $defs for parseFields to resolve
        // $refs — that bloated $defs would make every schema look like it references root.
        const refs = SchemaHelper.findRefs(schema, this.schemas);
        const topId = (this.selectedSchema as any)?.document?.$id;
        if (topId && refs[topId]) { return true; }
        const contextIri = this.currentDrilledSchemaIri;
        if (contextIri && refs[contextIri]) { return true; }
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
        if (selId && selId === schId) { return 'Cannot use the current schema as a sub-schema'; }
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
    }

    public onCanvasDragLeave(event: DragEvent): void {
        this._dragEnterCount--;
        if (this._dragEnterCount <= 0) {
            this._dragEnterCount = 0;
            this.isDragOverCanvas = false;
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
    }

    private addDrillSchemaField(schema: Schema): void {
        const idx = (this.drillCurrentFields?.length ?? 0) + 1;
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
        this.drillCurrentFields.push(field);
        this.selectedField = field;
        this.markDirty();
    }

    private addSchemaField(schema: Schema): void {
        if (!this.selectedSchema) { return; }
        const idx = (this.selectedSchema.fields?.length ?? 0) + 1;
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
        this.selectedSchema.fields.push(field);
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
        this.newSchemaSaving = true;
        const schema = {
            name,
            description: '',
            fields: [],
            category: this.getCategory(),
            topicId: this.topic || '',
            status: SchemaStatus.DRAFT,
        } as unknown as ISchema;
        this.schemaService.create(this.getCategory(), schema, this.topic)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (schemas: ISchema[]) => {
                    this.newSchemaSaving = false;
                    this.showNewSchemaDialog = false;
                    // A1: prefer matching by name + DRAFT over relying on array order.
                    const created = schemas.find(s => s.name === name && s.status === SchemaStatus.DRAFT)
                        ?? schemas[schemas.length - 1];
                    const id = created?.id || (created as any)?._id;
                    if (id) {
                        // A4/A5: refresh sidebar so new schema appears in the list.
                        if (this.topic) {
                            this.schemasFetched = false;
                            this.loadSchemas(this.topic);
                        }
                        this.router.navigate(['/schema-configuration'], {
                            queryParams: {
                                schemaId: id,
                                type: this.type || undefined,
                                topic: this.topic || undefined,
                            },
                            replaceUrl: true
                        });
                        // Navigation triggers queryParamMap → schemaLoad$.next(id).
                    }
                },
                error: () => { this.newSchemaSaving = false; }
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
        if (!schemaId) { return; }
        const idx = this.schemas.findIndex(s => {
            const sId = s.id || (s as any)._id;
            return sId === schemaId;
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
                    this.schemasFetched = true;
                }
            });
    }

    private buildNewField(ft: FieldType): SchemaField {
        const idx = (this.selectedSchema?.fields?.length ?? 0) + 1;
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

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { EMPTY, Subject, forkJoin } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { DefaultFieldDictionary, ISchema, Schema, SchemaCategory, SchemaEntity, SchemaField, SchemaStatus } from '@guardian/interfaces';
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

    private dirtySchemaIds = new Set<string>();
    public isSaving: boolean = false;

    public get hasUnsavedChanges(): boolean {
        return this.dirtySchemaIds.size > 0;
    }

    public showNewSchemaDialog: boolean = false;
    public newSchemaName: string = '';
    public newSchemaSaving: boolean = false;
    public systemFieldsCollapsed: boolean = true;

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
            // Populate sidebar from sub-schemas so this.schemas and this.selectedSchema
            // share references from the same API call — no separate loadSchemas race.
            if (!this.schemasFetched) {
                this.schemas = subSchemas;
                this.schemasFetched = true;
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
                // getSchemaWithSubSchemas handles both selectedSchema and schemas list.
                this.schemaLoad$.next(schemaId);
            } else {
                // No schemaId — load the sidebar list separately.
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
        const id = this.selectedSchema?.id || (this.selectedSchema as any)?._id;
        if (id) { this.dirtySchemaIds.add(id); }
    }

    public saveAll(): void {
        if (!this.hasUnsavedChanges || this.isSaving) { return; }
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
        // Rebuild each schema's JSON document from its current fields before saving.
        // Without this, schema.document still holds the original server payload and
        // field changes are silently ignored by the API.
        // updateRefs must follow update() to re-populate $defs with sub-schema
        // definitions — buildDocument creates a bare document with no $defs, and
        // omitting this step strips all sub-schema references from the saved payload.
        toSave.forEach(s => {
            // Mirror the old editor: append system fields (policyId, ref,
            // guardianVersion) so buildDocument writes them to document.properties.
            // Save and restore s.fields so the UI field list is unaffected.
            const userFields = s.fields;
            const defaultFields = DefaultFieldDictionary.getDefaultFields(s.entity as SchemaEntity);
            s.update([...userFields, ...defaultFields], s.conditions);
            s.fields = userFields;
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
        this.drillStack = [
            ...this.drillStack,
            { fieldLabel: field.title || field.name, fields: field.fields ?? [] }
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
                    try {
                        this.schemas = (response.body || []).map(s => new Schema(s));
                    } catch {
                        this.schemas = [];
                    }
                    this.schemasLoading = false;
                    this.schemasFetched = true;
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

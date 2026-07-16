import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { EMPTY, Subject, forkJoin } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { DefaultFieldDictionary, ISchema, Schema, SchemaCategory, SchemaEntity, SchemaField, SchemaStatus } from '@guardian/interfaces';
import { SchemaService } from 'src/app/services/schema.service';

export interface FieldType {
    type: string;
    label: string;
    icon: string;
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
        { type: 'text',        label: 'Text (single line)',  icon: 'pi-pencil' },
        { type: 'longtext',    label: 'Text (long form)',    icon: 'pi-align-left' },
        { type: 'number',      label: 'Numeric',             icon: 'pi-hashtag' },
        { type: 'date',        label: 'Date',                icon: 'pi-calendar' },
        { type: 'enum',        label: 'Dropdown',            icon: 'pi-chevron-circle-down' },
        { type: 'yesno',       label: 'Yes / No',            icon: 'pi-check-circle' },
        { type: 'multiselect', label: 'Multi-select',        icon: 'pi-list-check' },
        { type: 'table',       label: 'Array / table',       icon: 'pi-table' },
        { type: 'schema',      label: 'Sub-schema',          icon: 'pi-sitemap',   accent: true },
        { type: 'group',       label: 'Group / parameter',   icon: 'pi-th-large' },
        { type: 'file',        label: 'File upload',         icon: 'pi-upload' },
        { type: 'coords',      label: 'Coordinates',         icon: 'pi-map-marker' },
    ];

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

    public toggleBehaviour(key: 'required' | 'isArray' | 'readOnly'): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any)[key] = !(this.selectedField as any)[key];
        this.markDirty();
    }

    public get selectedFieldIsEnum(): boolean {
        return Array.isArray(this.selectedField?.enum);
    }

    public get selectedFieldIsNumber(): boolean {
        return this.selectedField?.type === 'number' || this.selectedField?.type === 'integer';
    }

    public getFieldCurrentType(field: SchemaField): string {
        if (field.isRef) { return 'schema'; }
        if (Array.isArray((field as any).enum)) {
            return field.isArray ? 'multiselect' : 'enum';
        }
        switch (field.type) {
            case 'number':
            case 'integer': return 'number';
            case 'boolean': return 'yesno';
            case 'object':  return field.isArray ? 'table' : 'group';
            default:
                if (field.format === 'date' || field.format === 'date-time') { return 'date'; }
                if (field.format === 'uri') { return 'file'; }
                return 'text';
        }
    }

    public changeFieldType(ft: FieldType): void {
        if (!this.selectedField) { return; }
        const f = this.selectedField as any;
        // Reset type-specific properties
        f.type = 'string';
        f.format = '';
        f.isRef = false;
        f.isArray = false;
        delete f.enum;

        switch (ft.type) {
            case 'number':
                f.type = 'number'; break;
            case 'date':
                f.format = 'date'; break;
            case 'enum':
                f.enum = []; break;
            case 'yesno':
                f.type = 'boolean'; break;
            case 'multiselect':
                f.enum = [];
                f.isArray = true; break;
            case 'table':
                f.type = 'object';
                f.isArray = true;
                if (!f.fields) { f.fields = []; }
                break;
            case 'schema':
                f.isRef = true; break;
            case 'group':
                f.type = 'object';
                if (!f.fields) { f.fields = []; }
                break;
            case 'file':
                f.format = 'uri'; break;
            // 'text', 'longtext', 'coords' → string, no format change needed
        }
        this.markDirty();
    }

    public addEnumOption(): void {
        if (!this.selectedField) { return; }
        if (!Array.isArray(this.selectedField.enum)) { (this.selectedField as any).enum = []; }
        (this.selectedField.enum as string[]).push('');
        this.markDirty();
    }

    public removeEnumOption(index: number): void {
        if (!Array.isArray(this.selectedField?.enum)) { return; }
        (this.selectedField!.enum as string[]).splice(index, 1);
        this.markDirty();
    }

    public updateEnumOption(index: number, value: string): void {
        if (!Array.isArray(this.selectedField?.enum)) { return; }
        (this.selectedField!.enum as string[])[index] = value;
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
        if (field.isRef) { return 'pi-sitemap'; }
        if (field.enum?.length) { return 'pi-chevron-circle-down'; }
        switch (field.type) {
            case 'number':
            case 'integer': return 'pi-hashtag';
            case 'boolean': return 'pi-check-circle';
            case 'object':  return 'pi-th-large';
            default:
                if (field.format === 'date' || field.format === 'date-time') { return 'pi-calendar'; }
                if (field.format === 'uri') { return 'pi-upload'; }
                return 'pi-pencil';
        }
    }

    public getFieldTypeBadge(field: SchemaField): string {
        if (field.isRef) { return 'sub-schema'; }
        if (field.enum?.length) { return 'dropdown'; }
        switch (field.type) {
            case 'number':  return 'number';
            case 'integer': return 'integer';
            case 'boolean': return 'yes/no';
            case 'object':  return 'group';
            default:
                if (field.format === 'date') { return 'date'; }
                if (field.format === 'date-time') { return 'datetime'; }
                if (field.format === 'uri') { return 'file'; }
                return 'text';
        }
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
        const base: Partial<SchemaField> = {
            name: `field_${idx}`,
            title: ft.label,
            description: '',
            required: false,
            isArray: false,
            isRef: false,
            readOnly: false,
            type: 'string',
            format: '',
            pattern: '',
            unit: '',
            unitSystem: '',
            property: '',
            customType: '',
            isUpdatable: false,
        };

        switch (ft.type) {
            case 'number':
                return { ...base, type: 'number' } as SchemaField;
            case 'longtext':
                return { ...base, type: 'string' } as SchemaField;
            case 'date':
                return { ...base, type: 'string', format: 'date' } as SchemaField;
            case 'enum':
                return { ...base, type: 'string', enum: [] } as SchemaField;
            case 'yesno':
                return { ...base, type: 'boolean' } as SchemaField;
            case 'multiselect':
                return { ...base, type: 'string', enum: [], isArray: true } as SchemaField;
            case 'table':
                return { ...base, type: 'object', isArray: true, fields: [] } as SchemaField;
            case 'schema':
                return { ...base, isRef: true } as SchemaField;
            case 'group':
                return { ...base, type: 'object', fields: [] } as SchemaField;
            case 'file':
                return { ...base, type: 'string', format: 'uri' } as SchemaField;
            case 'coords':
                return { ...base, type: 'string' } as SchemaField;
            default:
                return { ...base } as SchemaField;
        }
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

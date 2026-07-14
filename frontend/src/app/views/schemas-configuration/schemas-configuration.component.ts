import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { ISchema, Schema, SchemaCategory, SchemaField, SchemaStatus } from '@guardian/interfaces';
import { SchemaService } from 'src/app/services/schema.service';

export interface FieldType {
    type: string;
    label: string;
    icon: string;
    accent?: boolean;
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

    public showNewSchemaDialog: boolean = false;
    public newSchemaName: string = '';
    public newSchemaSaving: boolean = false;

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
        // switchMap cancels any in-flight request when a new schema ID arrives,
        // preventing the race where a slower response overwrites a faster one.
        this.schemaLoad$.pipe(
            switchMap(id => {
                this.schemaLoading = true;
                return this.schemaService.getSchemaById(id).pipe(
                    catchError(() => {
                        this.schemaLoading = false;
                        return EMPTY;
                    })
                );
            }),
            takeUntil(this.destroy$)
        ).subscribe((raw: ISchema) => {
            const schema = new Schema(raw);
            this.selectedSchema = schema;
            this.schemaLoading = false;
            this.upsertInSidebar(schema);
            const topicId = schema.topicId || this.topic;
            if (topicId && !this.schemasFetched && !this.schemasLoading) {
                this.loadSchemas(topicId);
            }
        });

        // queryParamMap is a BehaviorSubject — emits immediately on subscribe and again
        // on every navigation that keeps the component alive (Back/Forward, switchSchema).
        // This fixes the snapshot bug where ngOnInit only ran once and ignored URL changes.
        this.route.queryParamMap.pipe(
            takeUntil(this.destroy$)
        ).subscribe(params => {
            this.type = params.get('type') || '';
            this.topic = params.get('topic') || '';
            const schemaId = params.get('schemaId') || '';
            const mode = params.get('mode') || '';

            // Load sidebar schemas once per topic (schemasFetched guards against re-runs).
            if (this.topic && !this.schemasFetched && !this.schemasLoading) {
                this.loadSchemas(this.topic);
            }

            if (schemaId) {
                this.schemaLoad$.next(schemaId);
            } else if (mode === 'new') {
                this.showNewSchemaDialog = true;
            } else {
                this.selectedSchema = null;
                this.schemaLoading = false;
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

    public addField(ft: FieldType): void {
        if (!this.selectedSchema) { return; }
        const newField = this.buildNewField(ft);
        this.selectedSchema.fields.push(newField);
        this.selectedField = newField;
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
        }
    }

    public selectField(field: SchemaField): void {
        this.selectedField = this.selectedField === field ? null : field;
    }

    public toggleBehaviour(key: 'required' | 'isArray' | 'readOnly'): void {
        if (!this.selectedField) { return; }
        (this.selectedField as any)[key] = !(this.selectedField as any)[key];
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
                    this.schemas = (response.body || []).map(s => new Schema(s));
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

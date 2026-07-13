import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ISchema, SchemaCategory, SchemaHelper, SchemaStatus } from '@guardian/interfaces';
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
    public type: string;
    public topic: string;
    public loading: boolean = true;

    public activeTab: 'builder' | 'preview' = 'builder';
    public activeSideTab: 'fields' | 'schemas' = 'fields';

    public schemaSearch: string = '';
    public schemasLoading: boolean = false;
    public schemas: ISchema[] = [];

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

    constructor(
        private route: ActivatedRoute,
        private schemaService: SchemaService,
    ) {}

    public ngOnInit(): void {
        this.type = this.route.snapshot.queryParams['type'];
        this.topic = this.route.snapshot.queryParams['topic'];
        this.loading = false;
        this.loadSchemas();
    }

    public get filteredSchemas(): ISchema[] {
        if (!this.schemaSearch.trim()) {
            return this.schemas;
        }
        const q = this.schemaSearch.toLowerCase();
        return this.schemas.filter(s => s.name?.toLowerCase().includes(q));
    }

    public schemaVersion(schema: ISchema): string {
        return SchemaHelper.getSchemaName(schema.name, schema.version, schema.status);
    }

    public isDraft(schema: ISchema): boolean {
        return schema.status === SchemaStatus.DRAFT || schema.status === SchemaStatus.ERROR;
    }

    public onNewSchema(): void {
        // TODO: open new schema dialog
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

    private loadSchemas(): void {
        this.schemasLoading = true;
        this.schemaService.getSchemasByPage({
            category: this.getCategory(),
            topicId: this.topic || '',
            pageIndex: 0,
            pageSize: 1000,
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: HttpResponse<ISchema[]>) => {
                    this.schemas = response.body || [];
                    this.schemasLoading = false;
                },
                error: () => {
                    this.schemas = [];
                    this.schemasLoading = false;
                }
            });
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

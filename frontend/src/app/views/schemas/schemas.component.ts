import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
    ISchema,
    IUser,
    Schema,
    SchemaCategory,
    SchemaHelper,
    TagType,
} from '@guardian/interfaces';
import { forkJoin, Observable } from 'rxjs';
//services
import { ProfileService } from '../../services/profile.service';
import { SchemaService } from '../../services/schema.service';
import { PolicyEngineService } from '../../services/policy-engine.service';
import { TagsService } from '../../services/tag.service';
//modules
import { ConfirmationDialogComponent } from '../../modules/common/confirmation-dialog/confirmation-dialog.component';
import { SchemaDialog } from '../../modules/schema-engine/schema-dialog/schema-dialog.component';
import { ImportSchemaDialog } from '../../modules/schema-engine/import-schema/import-schema-dialog.component';
import { SetVersionDialog } from '../../modules/schema-engine/set-version-dialog/set-version-dialog.component';
import { VCViewerDialog } from '../../modules/schema-engine/vc-dialog/vc-dialog.component';
import { SchemaViewDialog } from '../../modules/schema-engine/schema-view-dialog/schema-view-dialog.component';
import { ExportSchemaDialog } from '../../modules/schema-engine/export-schema-dialog/export-schema-dialog.component';
import { CompareSchemaDialog } from '../../modules/schema-engine/compare-schema-dialog/compare-schema-dialog.component';
import { ModulesService } from '../../services/modules.service';
import { ToolsService } from 'src/app/services/tools.service';
import {
    AlertComponent,
    AlertType,
} from 'src/app/modules/common/alert/alert.component';
import { DialogService } from 'primeng/dynamicdialog';
import { DeleteSchemaDialogComponent } from '../../modules/schema-engine/delete-schema-dialog/delete-schema-dialog.component';

enum SchemaType {
    System = 'system',
    Policy = 'policy',
    Tag = 'tag',
    Module = 'module',
    Tool = 'tool',
}

const policySchemaColumns: string[] = [
    'policy',
    'type',
    'topic',
    'version',
    'entity',
    'tags',
    'status',
    'operation',
    'export',
    'edit',
    'delete',
    'document',
];

const moduleSchemaColumns: string[] = [
    'type',
    'status',
    'operation',
    'export',
    'edit',
    'delete',
    'document',
];

const systemSchemaColumns: string[] = [
    'type',
    'owner',
    'entity',
    'active',
    'activeOperation',
    'editSystem',
    'deleteSystem',
    'document',
];

const tagSchemaColumns: string[] = [
    'type',
    'owner',
    'status',
    'tagOperation',
    'editTag',
    'deleteTag',
    'document',
];

/**
 * Page for creating, editing, importing and exporting schemas.
 */
@Component({
    selector: 'app-schema-config',
    templateUrl: './schemas.component.html',
    styleUrls: ['./schemas.component.scss'],
})
export class SchemaConfigComponent implements OnInit {
    public loading: boolean = true;
    public type: SchemaType = SchemaType.System;
    public isConfirmed: boolean = false;
    public currentTopic: string = '';
    public schemas: Schema[] = [];
    public selectedAll: boolean = false;
    public pageIndex: number;
    public pageSize: number;
    public count: number;
    public owner: string = '';
    public policyNameByTopic: { [x: string]: string } = {};
    public moduleNameByTopic: { [x: string]: string } = {};
    public toolNameByTopic: { [x: string]: string } = {};
    public toolIdByTopic: { [x: string]: string } = {};
    public readonlyByTopic: { [x: string]: boolean } = {};
    public tagSchemas: Schema[] = [];
    public tagEntity = TagType.Schema;
    public policies: any[] = [];
    public modules: any[] = [];
    public tools: any[] = [];
    public draftTools: any[] = [];
    public properties: any[] = [];
    public allSchemas: any[] = [];
    public columns: string[] = [];
    private schemasMap: { [x: string]: ISchema[] } = {};
    private allSchemasMap: { [x: string]: ISchema[] } = {};

    schemaNameByTopicId: any;

    schemasTypes: { label: string; value: SchemaType }[] = [
        {label: 'Policy Schemas', value: SchemaType.Policy},
        {label: 'Module Schemas', value: SchemaType.Module},
        {label: 'Tag Schemas', value: SchemaType.Tag},
        {label: 'System Schemas', value: SchemaType.System},
        {label: 'Tool Schemas', value: SchemaType.Tool},
    ];

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyEngineService: PolicyEngineService,
        private moduleService: ModulesService,
        private toolService: ToolsService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private dialogService: DialogService
    ) {
        this.pageSize = 10;
        this.pageIndex = 0;
        this.readonlyByTopic = {};
    }

    public get isSystem(): boolean {
        return this.type === SchemaType.System;
    }

    public get isPolicy(): boolean {
        return this.type === SchemaType.Policy && this.isConfirmed;
    }

    public get isTag(): boolean {
        return this.type === SchemaType.Tag && this.isConfirmed;
    }

    public get isModule(): boolean {
        return this.type === SchemaType.Module && this.isConfirmed;
    }

    public get isTool(): boolean {
        return this.type === SchemaType.Tool && this.isConfirmed;
    }

    public get isAny(): boolean {
        return (
            this.isSystem ||
            this.isPolicy ||
            this.isTag ||
            this.isModule ||
            this.isTool
        );
    }

    public get canCreate(): boolean {
        return this.isAny;
    }

    public get canImport(): boolean {
        return this.isPolicy || this.isModule || this.isTool;
    }

    public get readonly(): boolean {
        return this.readonlyByTopic[this.currentTopic];
    }

    ngOnInit() {
        const type = this.route.snapshot.queryParams['type'];
        const topic = this.route.snapshot.queryParams['topic'];
        this.type = this.getType(type);
        this.currentTopic = topic && topic !== 'all' ? topic : '';
        this.loadProfile();
    }

    private getType(type: string): SchemaType {
        switch (type) {
            case 'tag':
                return SchemaType.Tag;
            case 'policy':
                return SchemaType.Policy;
            case 'module':
                return SchemaType.Module;
            case 'tool':
                return SchemaType.Tool;
            case 'system':
                return SchemaType.System;
            default:
                return SchemaType.Policy;
        }
    }

    private getColumns(): string[] {
        switch (this.type) {
            case SchemaType.Tag:
                return tagSchemaColumns;
            case SchemaType.Policy:
                return policySchemaColumns;
            case SchemaType.Module:
                return moduleSchemaColumns;
            case SchemaType.Tool:
                return moduleSchemaColumns;
            case SchemaType.System:
                return systemSchemaColumns;
            default:
                return policySchemaColumns;
        }
    }

    private getCategory(): SchemaCategory {
        switch (this.type) {
            case SchemaType.Tag:
                return SchemaCategory.TAG;
            case SchemaType.Policy:
                return SchemaCategory.POLICY;
            case SchemaType.Module:
                return SchemaCategory.MODULE;
            case SchemaType.Tool:
                return SchemaCategory.TOOL;
            case SchemaType.System:
                return SchemaCategory.SYSTEM;
            default:
                return SchemaCategory.POLICY;
        }
    }

    private getTopicId(): string {
        switch (this.type) {
            case SchemaType.Tag:
                return '';
            case SchemaType.Policy:
                if (!this.policyNameByTopic[this.currentTopic]) {
                    return '';
                } else {
                    return this.currentTopic;
                }
            case SchemaType.Module:
                if (!this.moduleNameByTopic[this.currentTopic]) {
                    return '';
                } else {
                    return this.currentTopic;
                }
            case SchemaType.Tool:
                if (!this.toolNameByTopic[this.currentTopic]) {
                    return '';
                } else {
                    return this.currentTopic;
                }
            case SchemaType.System:
                return '';
            default:
                if (!this.policyNameByTopic[this.currentTopic]) {
                    return '';
                } else {
                    return this.currentTopic;
                }
        }
    }

    private loadError(error: any): void {
        this.schemas = [];
        this.count = 0;
        this.loading = false;
        console.error(error);
    }

    private loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas(),
            //Filters
            this.policyEngineService.all(),
            this.moduleService.page(),
            this.toolService.page(),
            //Compare
            this.schemaService.list(),
            //Properties
            this.schemaService.properties()
        ]).subscribe(
            (value: any) => {
                try {
                    //Profile
                    const profile: IUser | null = value[0];
                    this.isConfirmed = !!(profile && profile.confirmed);
                    this.owner = profile?.did || '';
                    if (!this.isConfirmed) {
                        this.type = SchemaType.System;
                    }

                    //Tags
                    const tagSchemas: ISchema[] = value[1] || [];
                    this.tagSchemas = SchemaHelper.map(tagSchemas);

                    //Filters
                    this.readonlyByTopic = {};

                    const policies: any[] = value[2] || [];
                    this.policyNameByTopic = {};
                    this.policies = [];
                    for (const policy of policies) {
                        if (policy.topicId) {
                            this.policyNameByTopic[policy.topicId] =
                                policy.name;
                            this.policies.push(policy);
                            this.readonlyByTopic[policy.topicId] =
                                policy.creator !== this.owner;
                        }
                    }

                    const modules: any[] = value[3]?.body || [];
                    this.moduleNameByTopic = {};
                    this.modules = [];
                    for (const module of modules) {
                        if (module.topicId) {
                            this.moduleNameByTopic[module.topicId] =
                                module.name;
                            this.modules.push(module);
                            this.readonlyByTopic[module.topicId] =
                                module.creator !== this.owner;
                        }
                    }

                    const tools: any[] = value[4]?.body || [];
                    this.toolNameByTopic = {};
                    this.tools = [];
                    this.draftTools = [];
                    for (const tool of tools) {
                        if (tool.topicId) {
                            this.toolNameByTopic[tool.topicId] = tool.name;
                            this.toolIdByTopic[tool.topicId] = tool.id;
                            this.tools.push(tool);
                            this.readonlyByTopic[tool.topicId] =
                                tool.creator !== this.owner;
                            if (tool.status !== 'PUBLISHED') {
                                this.draftTools.push(tool);
                            }
                        }
                    }

                    //Compare
                    const list: any[] = value[5] || [];
                    for (const schema of list) {
                        schema.policy = this.policyNameByTopic[schema.topicId];
                        schema.module = this.moduleNameByTopic[schema.topicId];
                        schema.tool = this.toolNameByTopic[schema.topicId];
                        const name = SchemaHelper.getSchemaName(
                            schema.name,
                            schema.version || schema.sourceVersion,
                            schema.status
                        );
                        if (schema.policy) {
                            schema.fullName = `${name} (${schema.policy})`;
                        } else if (schema.module) {
                            schema.fullName = `${name} (${schema.module})`;
                        } else if (schema.tool) {
                            schema.fullName = `${name} (${schema.tool})`;
                        } else {
                            schema.fullName = name;
                        }
                    }
                    this.allSchemas = list;

                    //Properties
                    this.properties = value[6] || [];

                    //LoadData
                    this.loadSchemas();
                } catch (error) {
                    this.loadError(error);
                }
            },
            ({message}) => {
                this.loadError(message);
            }
        );
    }

    private loadSchemas() {
        this.loading = true;
        this.schemas = [];
        this.columns = this.getColumns();
        this.currentTopic = this.getTopicId();
        let loader: Observable<HttpResponse<ISchema[]>>;
        switch (this.type) {
            case SchemaType.System: {
                loader = this.schemaService.getSystemSchemas(
                    this.pageIndex,
                    this.pageSize
                );
                break;
            }
            case SchemaType.Tag: {
                loader = this.tagsService.getSchemas(
                    this.pageIndex,
                    this.pageSize
                );
                break;
            }
            case SchemaType.Policy:
            case SchemaType.Module:
            case SchemaType.Tool:
            default: {
                const category = this.getCategory();
                loader = this.schemaService.getSchemasByPage(
                    category,
                    this.currentTopic,
                    this.pageIndex,
                    this.pageSize
                );
                break;
            }
        }
        loader.subscribe(
            (schemasResponse: HttpResponse<ISchema[]>) => {
                this.finishLoadSchemas(schemasResponse);
                this.loadTagsData();
            },
            (e) => {
                this.loadError(e);
            }
        );
    }

    private finishLoadSchemas(schemasResponse: HttpResponse<ISchema[]>) {
        this.schemas = SchemaHelper.map(schemasResponse.body || []);
        this.count = (schemasResponse.headers.get('X-Total-Count') ||
            this.schemas.length) as number;
        this.schemaMapping(this.schemas);
        this.schemaAllMapping();
    }

    private schemaMapping(schemas: ISchema[]) {
        this.schemasMap = {};
        for (let i = 0; i < schemas.length; i++) {
            const schema: any = schemas[i];
            schema.readonly =
                schema.readonly || this.readonlyByTopic[schema.topicId];
            if (this.schemasMap[schema.topicId]) {
                this.schemasMap[schema.topicId].push(schema);
            } else {
                this.schemasMap[schema.topicId] = [schema];
            }
        }
    }

    private schemaAllMapping() {
        this.schemaService.getSchemas(this.currentTopic).subscribe((schemas => {
            this.allSchemasMap = {};
            for (let i = 0; i < schemas.length; i++) {
                const schema: any = schemas[i];
                schema.readonly =
                    schema.readonly || this.readonlyByTopic[schema.topicId];
                if (this.allSchemasMap[schema.topicId]) {
                    this.allSchemasMap[schema.topicId].push(schema);
                } else {
                    this.allSchemasMap[schema.topicId] = [schema];
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }));
    }

    private loadTagsData() {
        if (this.type === SchemaType.Policy) {
            const ids = this.schemas.map((e) => e.id);
            this.tagsService.search(this.tagEntity, ids).subscribe(
                (data) => {
                    for (const schema of this.schemas) {
                        (schema as any)._tags = data[schema.id];
                    }
                },
                (e) => {
                    this.loadError(e);
                }
            );
        } else {
        }
    }

    public onFilter(event: any) {
        if (event.value === null) {
            this.currentTopic = '';
        }
        this.pageIndex = 0;
        this.router.navigate(['/schemas'], {
            queryParams: {
                type: this.type,
                topic: this.currentTopic || 'all',
            },
        });
        this.loadSchemas();
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadSchemas();
    }

    public onChangeType(tabType: SchemaType) {
        this.type = tabType; // type error (template)
        this.pageIndex = 0;
        this.pageSize = 10;
        this.currentTopic = '';
        this.router.navigate(['/schemas'], {
            queryParams: {type: this.type},
        });
        this.loadSchemas();
    }

    public selectAll(selectedAll: boolean): void {
        this.selectedAll = selectedAll;
        for (let i = 0; i < this.schemas.length; i++) {
            const element: any = this.schemas[i];
            if (element.messageId) {
                element._selected = selectedAll;
            }
        }
        this.schemas = this.schemas.slice();
    }

    public selectItem(): void {
        this.selectedAll = true;
        for (let i = 0; i < this.schemas.length; i++) {
            const element: any = this.schemas[i];
            if (!element._selected) {
                this.selectedAll = false;
                break;
            }
        }
        this.schemas = this.schemas.slice();
    }

    private createSchema(schema: Schema | null): void {
        if (!schema) {
            return;
        }

        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                this.schemaService.createSystemSchemas(schema).subscribe(
                    (data) => {
                        localStorage.removeItem('restoreSchemaData');
                        this.loadSchemas();
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
            case SchemaType.Tag: {
                this.tagsService.createSchema(schema).subscribe(
                    (data) => {
                        localStorage.removeItem('restoreSchemaData');
                        this.loadSchemas();
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                const category = this.getCategory();
                this.schemaService
                    .pushCreate(category, schema, schema.topicId)
                    .subscribe(
                        (result) => {
                            const {taskId} = result;
                            this.router.navigate(['task', taskId], {
                                queryParams: {
                                    last: btoa(location.href),
                                },
                            });
                        },
                        (e) => {
                            this.loadError(e);
                        }
                    );
                break;
            }
        }
    }

    private updateSchema(id: string, schema: Schema | null): void {
        if (!schema) {
            return;
        }

        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                this.schemaService.updateSystemSchema(schema, id).subscribe(
                    (data) => {
                        localStorage.removeItem('restoreSchemaData');
                        this.loadSchemas();
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
            case SchemaType.Tag: {
                this.tagsService.updateSchema(schema, id).subscribe(
                    (data) => {
                        localStorage.removeItem('restoreSchemaData');
                        this.loadSchemas();
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                this.schemaService.update(schema, id).subscribe(
                    (data) => {
                        localStorage.removeItem('restoreSchemaData');
                        this.loadSchemas();
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
        }
    }

    private newVersionSchema(id: string, schema: Schema | null): void {
        if (!schema) {
            return;
        }

        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                return;
            }
            case SchemaType.Tag: {
                return;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                const category = this.getCategory();
                this.schemaService.newVersion(category, schema, id).subscribe(
                    (result) => {
                        const {taskId} = result;
                        this.router.navigate(['task', taskId], {
                            queryParams: {
                                last: btoa(location.href),
                            },
                        });
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
        }
    }

    deleteSchema(schema: any): void {
        const id = schema.id;
        if (!id) {
            return;
        }

        const dialogRef = this.dialogService.open(DeleteSchemaDialogComponent, {
            header: 'Delete Schema',
            width: '720px',
            styleClass: 'custom-dialog',
        });
        dialogRef.onClose.subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;
            switch (this.type) {
                case SchemaType.System: {
                    this.schemaService.deleteSystemSchema(id).subscribe(
                        (data: any) => {
                            this.loadSchemas();
                        },
                        (e) => {
                            this.loadError(e);
                        }
                    );
                    break;
                }
                case SchemaType.Tag: {
                    this.tagsService.deleteSchema(id).subscribe(
                        (data: any) => {
                            this.loadSchemas();
                        },
                        (e) => {
                            this.loadError(e);
                        }
                    );
                    break;
                }
                case SchemaType.Module:
                case SchemaType.Tool:
                case SchemaType.Policy:
                default: {
                    this.schemaService.delete(id).subscribe(
                        (data: any) => {
                            this.loadSchemas();
                        },
                        (e) => {
                            this.loadError(e);
                        }
                    );
                    break;
                }
            }
        });
    }

    private publishSchema(id: string, version: string): void {
        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                return;
            }
            case SchemaType.Tag: {
                this.tagsService.publishSchema(id).subscribe(
                    (res) => {
                        this.loading = false;
                        this.loadSchemas();
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                this.schemaService.pushPublish(id, version).subscribe(
                    (result) => {
                        const {taskId} = result;
                        this.router.navigate(['task', taskId], {
                            queryParams: {
                                last: btoa(location.href),
                            },
                        });
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
        }
    }

    private unpublished(element: Schema): void {
        this.loading = true;
        this.schemaService.unpublished(element.id).subscribe(
            (data: any) => {
                const schemas = SchemaHelper.map(data);
                this.schemaMapping(schemas);
                this.loadSchemas();
            },
            (e) => {
                this.loadError(e);
            }
        );
    }

    private importByMessage(data: any, topicId: string): void {
        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                return;
            }
            case SchemaType.Tag: {
                return;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                const category = this.getCategory();
                this.schemaService.pushImportByMessage(data, topicId).subscribe(
                    (result) => {
                        const {taskId} = result;
                        this.router.navigate(['task', taskId], {
                            queryParams: {
                                last: btoa(location.href),
                            },
                        });
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
        }
    }

    private importByFile(data: any, topicId: string): void {
        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                return;
            }
            case SchemaType.Tag: {
                return;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                const category = this.getCategory();
                this.schemaService.pushImportByFile(data, topicId).subscribe(
                    (result) => {
                        const {taskId} = result;
                        this.router.navigate(['task', taskId], {
                            queryParams: {
                                last: btoa(location.href),
                            },
                        });
                    },
                    (e) => {
                        this.loadError(e);
                    }
                );
                break;
            }
        }
    }

    public onCreateSchemas(): void {
        if (this.readonly) {
            return;
        }
        const dialogRef = this.dialogService.open(SchemaDialog, {
            header: 'New Schema',
            width: '950px',
            styleClass: 'custom-dialog',
            data: {
                type: 'new',
                schemaType: this.type,
                schemasMap: this.allSchemasMap,
                topicId: this.currentTopic,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools,
                properties: this.properties,
            },
        });
        dialogRef.onClose.subscribe(async (schema: Schema | null) => {
            this.createSchema(schema);
        });
    }

    public onOpenDocument(element: Schema): void {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            header: 'Schema',
            width: '850px',
            styleClass: 'custom-dialog',
            data: {
                document: element.document,
                title: 'Schema',
                type: 'JSON',
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    public onEditDocument(element: Schema): void {
        const dialogRef = this.dialogService.open(SchemaDialog, {
            header: 'Edit Schema',
            width: '950px',
            styleClass: 'custom-dialog',
            data: {
                type: 'edit',
                schemaType: this.type,
                schemasMap: this.allSchemasMap,
                topicId: this.currentTopic,
                policies: this.policies,
                scheme: element,
                tools: this.draftTools,
                properties: this.properties,
            },
        });
        dialogRef.onClose.subscribe(async (schema: Schema | null) => {
            this.updateSchema(element.id, schema);
        });
    }

    public onCheckDeleteSchema(element: Schema): void {
        if (this.type === SchemaType.System) {
            this.onDeleteSchema(element);
        } else {
            this.loading = true;
            this.schemaService.getSchemaParents(element.id).subscribe(
                (parents) => {
                    this.onDeleteSchema(element, parents);
                },
                (e) => {
                    this.loadError(e);
                },
                () => {
                    this.loading = false;
                }
            );
        }
    }

    private onDeleteSchema(element: Schema, parents?: ISchema[]): void {
        if (!Array.isArray(parents) || !parents.length) {
            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                data: {
                    dialogTitle: 'Delete schema',
                    dialogText: 'Are you sure to delete schema?',
                },
                disableClose: true,
                autoFocus: false,
            });
            dialogRef.afterClosed().subscribe((result) => {
                if (!result) {
                    return;
                }
                this.deleteSchema(element.id);
            });
        } else {
            this.dialog.open(AlertComponent, {
                data: {
                    type: AlertType.WARN,
                    text: `There are some schemas that depend on this schema:\r\n${parents
                        .map((parent) =>
                            SchemaHelper.getSchemaName(
                                parent.name,
                                parent.version || parent.sourceVersion,
                                parent.status
                            )
                        )
                        .join('\r\n')}`,
                },
            });
        }
    }

    public onNewVersion(element: Schema): void {
        const dialogRef = this.dialogService.open(SchemaDialog, {
            header: 'New Version',
            width: '950px',
            styleClass: 'custom-dialog',
            data: {
                schemaType: this.type,
                type: 'version',
                schemasMap: this.allSchemasMap,
                topicId: this.currentTopic,
                policies: this.policies,
                scheme: element,
                tools: this.draftTools,
                properties: this.properties,
            },
        });
        dialogRef.onClose.subscribe(async (schema: Schema | null) => {
            this.newVersionSchema(element.id, schema);
        });
    }

    public onCloneSchema(element: Schema): void {
        const newDocument: any = { ...element };
        delete newDocument._id;
        delete newDocument.id;
        delete newDocument.uuid;
        delete newDocument.creator;
        delete newDocument.owner;
        delete newDocument.version;
        delete newDocument.previousVersion;
        const dialogRef = this.dialogService.open(SchemaDialog, {
            header: 'New Version',
            width: '950px',
            styleClass: 'custom-dialog',
            data: {
                type: 'version',
                schemasMap: this.allSchemasMap,
                topicId: this.currentTopic,
                policies: this.policies,
                scheme: newDocument,
                tools: this.draftTools,
                properties: this.properties,
            },
        });
        dialogRef.onClose.subscribe(async (schema: Schema | null) => {
            this.createSchema(schema);
        });
    }

    public onPublish(element: Schema): void {
        const dialogRef = this.dialog.open(SetVersionDialog, {
            width: '350px',
            disableClose: false,
            data: {
                schemas: this.schemas,
            },
        });
        dialogRef.afterClosed().subscribe(async (version) => {
            if (version) {
                this.publishSchema(element.id, version);
            }
        });
    }

    public onPublishTagSchema(element: Schema): void {
        this.publishSchema(element.id, '');
    }

    public onImportSchemas(messageId?: string): void {
        if (this.readonly) {
            return;
        }
        const dialogRef = this.dialogService.open(ImportSchemaDialog, {
            header: 'Select action',
            width: '720px',
            styleClass: 'custom-dialog',
            data: {timeStamp: messageId},
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.importSchemasDetails(result);
            }
        });
    }

    private importSchemasDetails(result: any) {
        const { type, data, schemas } = result;
        const dialogRef = this.dialog.open(SchemaViewDialog, {
            width: '720px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                schemas: schemas,
                topicId: this.currentTopic,
                policies: this.policies,
            },
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && result.messageId) {
                this.onImportSchemas(result.messageId);
                return;
            }

            if (result && result.topicId) {
                this.loading = true;
                if (type == 'message') {
                    this.importByMessage(data, result.topicId);
                } else if (type == 'file') {
                    this.importByFile(data, result.topicId);
                }
            }
        });
    }

    public onExport(element: Schema): void {
        this.schemaService.exportInMessage(element.id).subscribe((schema) =>
            this.dialogService.open(ExportSchemaDialog, {
                header: 'Export Schema',
                width: '720px',
                styleClass: 'custom-dialog',
                data: {
                    schema: schema,
                },
            })
        );
    }

    public onActive(element: Schema): void {
        this.loading = true;
        this.schemaService.activeSystemSchema(element.id).subscribe(
            (res) => {
                this.loading = false;
                this.loadSchemas();
            },
            (e) => {
                this.loadError(e);
            }
        );
    }

    public onCompare(element?: Schema) {
        const dialogRef = this.dialogService.open(CompareSchemaDialog, {
            header: 'Compare Schemas',
            width: '650px',
            styleClass: 'custom-dialog',
            data: {
                schema: element,
                policies: this.policies,
                schemas: this.allSchemas,
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'schema',
                        schemaId1: result.schemaId1,
                        schemaId2: result.schemaId2,
                    },
                });
            }
        });
    }

    private _deleteSystem(id: string): Observable<ISchema[]> {
        switch (this.type) {
            case 'system':
                return this.schemaService.deleteSystemSchema(id);
            case 'tag':
                return this.tagsService.deleteSchema(id);
            default:
                return this.schemaService.delete(id);
        }
    }

    private _updateSystem(schema: Schema, id: string): Observable<ISchema[]> {
        switch (this.type) {
            case 'system':
                return this.schemaService.updateSystemSchema(schema, id);
            case 'tag':
                return this.tagsService.updateSchema(schema, id);
            default:
                return this.schemaService.update(schema, id);
        }
    }

    newOnPage() {
        this.pageIndex = 0;
        this.loadSchemas();
    }

    movePageIndex(inc: number) {
        if (inc > 0 && this.pageIndex < this.count / this.pageSize - 1) {
            this.pageIndex += 1;
            this.loadSchemas();
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.loadSchemas();
        }
    }
}

import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ISchema, IUser, Schema, SchemaCategory, SchemaHelper, TagType, UserPermissions } from '@guardian/interfaces';
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
import { ExportSchemaDialog } from '../../modules/schema-engine/export-schema-dialog/export-schema-dialog.component';
import { CompareSchemaDialog } from '../../modules/schema-engine/compare-schema-dialog/compare-schema-dialog.component';
import { SchemaFormDialog } from '../../modules/schema-engine/schema-form-dialog/schema-form-dialog.component';
import { SetVersionDialog } from '../../modules/schema-engine/set-version-dialog/set-version-dialog.component';
import { VCViewerDialog } from '../../modules/schema-engine/vc-dialog/vc-dialog.component';
import { SchemaViewDialog } from '../../modules/schema-engine/schema-view-dialog/schema-view-dialog.component';
import { ModulesService } from '../../services/modules.service';
import { ToolsService } from 'src/app/services/tools.service';
import { AlertComponent, AlertType } from 'src/app/modules/common/alert/alert.component';
import { CopySchemaDialog } from '../../modules/schema-engine/copy-schema-dialog/copy-schema-dialog';
import { SchemaTreeComponent } from 'src/app/modules/schema-engine/schema-tree/schema-tree.component';
import { DialogService } from 'primeng/dynamicdialog';
import { ProjectComparisonService } from 'src/app/services/project-comparison.service';

enum SchemaType {
    System = 'system',
    Policy = 'policy',
    Tag = 'tag',
    Module = 'module',
    Tool = 'tool'
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
    'menu',
];

const moduleSchemaColumns: string[] = [
    'type',
    'status',
    'operation',
    'menu',
];

const toolSchemaColumns: string[] = [
    'tool',
    'type',
    'status',
    'operation',
    'menu',
];

const systemSchemaColumns: string[] = [
    'type',
    'owner',
    'entity',
    'active',
    'activeOperation',
    'menu',
];

const tagSchemaColumns: string[] = [
    'type',
    'owner',
    'status',
    'tagOperation',
    'menu',
];

/**
 * Page for creating, editing, importing and exporting schemas.
 */
@Component({
    selector: 'app-schema-config',
    templateUrl: './schemas.component.html',
    styleUrls: ['./schemas.component.scss']
})
export class SchemaConfigComponent implements OnInit {
    public loading: boolean = true;
    public user: UserPermissions = new UserPermissions();
    public type: SchemaType = SchemaType.System;
    public isConfirmed: boolean = false;
    public currentTopic: string = '';
    public page: ISchema[] = [];
    public pageIndex: number = 0;
    public pageSize: number = 25;
    public count: number = 0;
    public selectedAll: boolean = false;
    public owner: string = '';
    public policyNameByTopic: { [x: string]: string } = {};
    public moduleNameByTopic: { [x: string]: string } = {};
    public toolNameByTopic: { [x: string]: string } = {};
    public readonlyByTopic: { [x: string]: boolean } = {};
    public policyIdByTopic: { [x: string]: string } = {};
    public toolIdByTopic: { [x: string]: string } = {};
    public tagSchemas: Schema[] = [];
    public tagEntity = TagType.Schema;
    public policies: any[] = [];
    public modules: any[] = [];
    public tools: any[] = [];
    public draftTools: any[] = [];
    public columns: string[] = [];
    public compareList: any[] = [];
    public properties: any[] = [];
    public schemasTypes: { label: string; value: SchemaType }[] = [
        { label: 'Policy Schemas', value: SchemaType.Policy },
        { label: 'Module Schemas', value: SchemaType.Module },
        { label: 'Tag Schemas', value: SchemaType.Tag },
        { label: 'System Schemas', value: SchemaType.System },
        { label: 'Tool Schemas', value: SchemaType.Tool },
    ];

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyEngineService: PolicyEngineService,
        private moduleService: ModulesService,
        private toolService: ToolsService,
        private projectComparisonService: ProjectComparisonService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private dialogService: DialogService
    ) {
        this.readonlyByTopic = {};
    }

    public get readonly(): boolean {
        return this.readonlyByTopic[this.currentTopic];
    }

    public get isPolicy(): boolean {
        return (
            this.isConfirmed &&
            this.user.SCHEMAS_SCHEMA_READ &&
            this.type === SchemaType.Policy
        )
    }

    public get isTool(): boolean {
        return (
            this.isConfirmed &&
            this.user.SCHEMAS_SCHEMA_READ &&
            this.type === SchemaType.Tool
        )
    }

    public get isModule(): boolean {
        return (
            this.isConfirmed &&
            this.user.SCHEMAS_SCHEMA_READ &&
            this.type === SchemaType.Module
        )
    }

    public get isTag(): boolean {
        return (
            this.isConfirmed &&
            this.user.SCHEMAS_SCHEMA_READ &&
            this.type === SchemaType.Tag
        )
    }

    public get isSystem(): boolean {
        return (
            this.user.SCHEMAS_SYSTEM_SCHEMA_READ &&
            this.type === SchemaType.System
        )
    }

    public get isAny(): boolean {
        return (
            (
                this.user.SCHEMAS_SCHEMA_READ ||
                this.user.SCHEMAS_SYSTEM_SCHEMA_READ
            ) &&
            (
                this.type === SchemaType.System ||
                this.type === SchemaType.Policy ||
                this.type === SchemaType.Tag ||
                this.type === SchemaType.Module ||
                this.type === SchemaType.Tool
            )
        )
    }

    public get canCreate(): boolean {
        return (
            this.isConfirmed &&
            (
                this.user.SCHEMAS_SCHEMA_CREATE ||
                this.user.SCHEMAS_SYSTEM_SCHEMA_CREATE
            ) &&
            (
                this.type === SchemaType.System ||
                this.type === SchemaType.Policy ||
                this.type === SchemaType.Tag ||
                this.type === SchemaType.Module ||
                this.type === SchemaType.Tool
            )
        )
    }

    public get canImport(): boolean {
        return (
            this.isConfirmed &&
            (
                this.user.SCHEMAS_SCHEMA_CREATE
            ) &&
            (
                this.type === SchemaType.Policy ||
                this.type === SchemaType.Tool
            )
        )
    }

    public ifCanEdit(element: Schema): boolean {
        if (this.type === SchemaType.System) {
            return (
                this.isConfirmed &&
                this.user.SCHEMAS_SYSTEM_SCHEMA_UPDATE &&
                !element.readonly &&
                !element.active
            );
        } else if (this.type === SchemaType.Tag) {
            return (
                this.isConfirmed &&
                this.user.SCHEMAS_SCHEMA_UPDATE &&
                this.ifDraft(element)
            );
        } else {
            return (
                this.isConfirmed &&
                this.user.SCHEMAS_SCHEMA_UPDATE &&
                (
                    this.ifDraft(element) ||
                    !this.readonly
                )
            );
        }
    }

    public ifCanDelete(element: Schema): boolean {
        if (this.type === SchemaType.System) {
            return (
                this.isConfirmed &&
                this.user.SCHEMAS_SYSTEM_SCHEMA_DELETE &&
                !element.readonly &&
                !element.active
            );
        } else {
            return (
                this.isConfirmed &&
                this.user.SCHEMAS_SCHEMA_DELETE &&
                this.ifDraft(element)
            );
        }
    }

    public ifCanCopy(element: Schema): boolean {
        return (
            this.isConfirmed &&
            this.user.SCHEMAS_SCHEMA_CREATE &&
            this.type === SchemaType.Policy
        );
    }

    public ifCanImport(element: Schema): boolean {
        return (
            this.isConfirmed &&
            this.user.SCHEMAS_SCHEMA_CREATE &&
            (
                this.type === SchemaType.Policy ||
                this.type === SchemaType.Module ||
                this.type === SchemaType.Tool
            )
        );
    }

    public ifCanExport(element: Schema): boolean {
        return (
            this.user.SCHEMAS_SCHEMA_READ &&
            (
                this.type === SchemaType.Policy ||
                this.type === SchemaType.Module ||
                this.type === SchemaType.Tool
            )
        );
    }

    public ifDraft(element: Schema): boolean {
        return (element.status === 'DRAFT' || element.status === 'ERROR');
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
                return toolSchemaColumns;
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
        this.page = [];
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
            this.projectComparisonService.getProperties()
        ]).subscribe((value: any[]) => {
            try {
                //Profile
                const profile: IUser | null = value[0];
                this.isConfirmed = !!(profile && profile.confirmed);
                this.owner = profile?.did || '';
                this.user = new UserPermissions(profile);
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
                this.policyIdByTopic = {};
                this.policies = [{
                    name: 'No binding',
                    topicId: null
                }];
                for (const policy of policies) {
                    if (policy.topicId) {
                        this.policyIdByTopic[policy.topicId] = policy.id;
                        this.policyNameByTopic[policy.topicId] = policy.name;
                        this.policies.push(policy);
                        this.readonlyByTopic[policy.topicId] = policy.creator !== this.owner;
                    }
                }

                const modules: any[] = value[3]?.body || [];
                this.moduleNameByTopic = {};
                this.modules = [];
                for (const module of modules) {
                    if (module.topicId) {
                        this.moduleNameByTopic[module.topicId] = module.name;
                        this.modules.push(module);
                        this.readonlyByTopic[module.topicId] = module.creator !== this.owner;
                    }
                }

                const tools: any[] = value[4]?.body || [];
                this.toolNameByTopic = {};
                this.toolIdByTopic = {};
                this.tools = [];
                this.draftTools = [];
                for (const tool of tools) {
                    if (tool.topicId) {
                        this.toolIdByTopic[tool.topicId] = tool.id;
                        this.toolNameByTopic[tool.topicId] = tool.name;
                        this.tools.push(tool);
                        if (
                            tool.creator === this.owner &&
                            tool.status !== 'PUBLISHED'
                        ) {
                            this.readonlyByTopic[tool.topicId] = false;
                            this.draftTools.push(tool);
                        } else {
                            this.readonlyByTopic[tool.topicId] = true;
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
                this.compareList = list;

                //Properties
                const properties: any[] = value[6] || [];
                this.properties = properties;

                //LoadData
                this.loadSchemas();
            } catch (error) {
                this.loadError(error);
            }
        }, ({ message }) => {
            this.loadError(message);
        });
    }

    private loadSchemas() {
        this.loading = true;
        this.page = [];
        this.columns = this.getColumns();
        this.currentTopic = this.getTopicId();
        let loader: Observable<HttpResponse<ISchema[]>>;
        switch (this.type) {
            case SchemaType.System: {
                loader = this.schemaService.getSystemSchemas(this.pageIndex, this.pageSize);
                break;
            }
            case SchemaType.Tag: {
                loader = this.tagsService.getSchemas(this.pageIndex, this.pageSize);
                break;
            }
            case SchemaType.Policy:
            case SchemaType.Module:
            case SchemaType.Tool:
            default: {
                const category = this.getCategory();
                loader = this.schemaService.getSchemasByPage(category, this.currentTopic, this.pageIndex, this.pageSize);
                break;
            }
        }
        loader.subscribe((schemasResponse: HttpResponse<ISchema[]>) => {
            this.page = SchemaHelper.map(schemasResponse.body || []);
            for (const element of this.page as any[]) {
                element.__policyId = this.policyIdByTopic[element.topicId];
                element.__policyName = this.policyNameByTopic[element.topicId] || ' - ';
                element.__toolId = this.toolIdByTopic[element.topicId];
                element.__toolName = this.toolNameByTopic[element.topicId] || ' - ';
            }
            this.count = (schemasResponse.headers.get('X-Total-Count') || this.page.length) as number;
            this.loadTagsData();
        }, (e) => {
            this.loadError(e);
        });
    }

    private loadTagsData() {
        if (this.type === SchemaType.Policy && this.user.TAGS_TAG_READ) {
            const ids = this.page.map(e => String(e.id));
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                for (const schema of this.page) {
                    (schema as any)._tags = data[String(schema.id)];
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loadError(e);
            });
        } else {
            setTimeout(() => {
                this.loading = false;
            }, 500);
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

    public onChangeType(type: SchemaType): void {
        this.type = type;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.currentTopic = '';
        this.router.navigate(['/schemas'], {
            queryParams: { type }
        });
        this.loadSchemas();
    }

    public selectAll(selectedAll: boolean): void {
        this.selectedAll = selectedAll;
        for (let i = 0; i < this.page.length; i++) {
            const element: any = this.page[i];
            if (element.messageId) {
                element._selected = selectedAll;
            }
        }
        this.page = this.page.slice();
    }

    public selectItem(): void {
        this.selectedAll = true;
        for (let i = 0; i < this.page.length; i++) {
            const element: any = this.page[i];
            if (!element._selected) {
                this.selectedAll = false;
                break;
            }
        }
        this.page = this.page.slice();
    }

    private createSchema(schema: Schema | null): void {
        if (!schema) {
            return;
        }

        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                this.schemaService.createSystemSchemas(schema).subscribe((data) => {
                    localStorage.removeItem('restoreSchemaData');
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
            case SchemaType.Tag: {
                this.tagsService.createSchema(schema).subscribe((data) => {
                    localStorage.removeItem('restoreSchemaData');
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                const category = this.getCategory();
                this.schemaService.pushCreate(category, schema, schema.topicId).subscribe((result) => {
                    const { taskId } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    this.loadError(e);
                });
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
                this.schemaService.updateSystemSchema(schema, id).subscribe((data) => {
                    localStorage.removeItem('restoreSchemaData');
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
            case SchemaType.Tag: {
                this.tagsService.updateSchema(schema, id).subscribe((data) => {
                    localStorage.removeItem('restoreSchemaData');
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                this.schemaService.update(schema, id).subscribe((data) => {
                    localStorage.removeItem('restoreSchemaData');
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
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
                this.schemaService.newVersion(category, schema, id).subscribe((result) => {
                    const { taskId } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
        }
    }

    private deleteSchema(id: string): void {
        if (!id) {
            return;
        }

        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                this.schemaService.deleteSystemSchema(id).subscribe((data: any) => {
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
            case SchemaType.Tag: {
                this.tagsService.deleteSchema(id).subscribe((data: any) => {
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                this.schemaService.delete(id).subscribe((data: any) => {
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
        }
    }

    private publishSchema(id: string, version: string): void {
        this.loading = true;
        switch (this.type) {
            case SchemaType.System: {
                return;
            }
            case SchemaType.Tag: {
                this.tagsService.publishSchema(id).subscribe((res) => {
                    this.loading = false;
                    this.loadSchemas();
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
            case SchemaType.Module:
            case SchemaType.Tool:
            case SchemaType.Policy:
            default: {
                this.schemaService.pushPublish(id, version).subscribe((result) => {
                    const { taskId } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
        }
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
                this.schemaService.pushImportByMessage(data, topicId).subscribe((result) => {
                    const { taskId } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    this.loadError(e);
                });
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
                this.schemaService.pushImportByFile(data, topicId).subscribe((result) => {
                    const { taskId } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    this.loadError(e);
                });
                break;
            }
        }
    }

    private importByExcel(data: any, topicId: string): void {
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
                this.schemaService.pushImportByXlsx(data, topicId).subscribe((result) => {
                    const { taskId } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    this.loadError(e);
                });
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
                topicId: this.currentTopic,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools,
                properties: this.properties,
                category: this.getCategory()
            }
        });
        dialogRef.onClose.subscribe(async (schema: Schema | null) => {
            this.createSchema(schema);
        });
    }

    public onOpenConfig(element: Schema): void {
        return this.onEditDocument(element);
    }

    public onOpenForm(schema: Schema, example: boolean): void {
        const dialogRef = this.dialog.open(SchemaFormDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: { schema, example, category: this.getCategory() },
        });
        dialogRef.afterClosed().subscribe(async (exampleDate: any) => {
            if (exampleDate) {
                schema.setExample(exampleDate);
                this.updateSchema(schema.id, schema);
            }
        });
    }

    public onOpenDocument(element: Schema): void {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            header: 'Schema',
            width: '850px',
            styleClass: 'custom-dialog',
            data: {
                document: element?.document,
                title: 'Schema',
                type: 'JSON',
                topicId: element.topicId,
                schemaId: element.id,
                category: this.getCategory()
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onEditSchema(element: Schema): void {
        if (this.type === SchemaType.System && !element.readonly && !element.active) {
            return this.onEditDocument(element);
        }
        if (this.type === SchemaType.Tag && this.ifDraft(element)) {
            return this.onEditDocument(element);
        }
        if (this.ifDraft(element)) {
            return this.onEditDocument(element);
        }
        if (element.isCreator && !this.readonly) {
            return this.onNewVersion(element);
        }
        if (!element.isCreator && !this.readonly) {
            return this.onCloneSchema(element);
        }
    }

    private onEditDocument(element: ISchema): void {
        const dialogRef = this.dialogService.open(SchemaDialog, {
            header: 'Edit Schema',
            width: '950px',
            styleClass: 'custom-dialog',
            data: {
                type: 'edit',
                schemaType: this.type,
                topicId: this.currentTopic,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools,
                properties: this.properties,
                scheme: element,
                category: this.getCategory()
            }
        });
        dialogRef.onClose.subscribe(async (schema: Schema | null) => {
            this.updateSchema(String(element.id), schema);
        });
    }

    public onCheckDeleteSchema(element: Schema): void {
        if (this.type === SchemaType.System) {
            this.onDeleteSchema(element);
        } else {
            this.loading = true;
            this.schemaService.getSchemaParents(element.id).subscribe((parents) => {
                this.onDeleteSchema(element, parents);
            }, (e) => {
                this.loadError(e);
            }, () => {
                this.loading = false;
            });
        }
    }

    private onDeleteSchema(element: Schema, parents?: ISchema[]): void {
        if (!Array.isArray(parents) || !parents.length) {
            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                data: {
                    dialogTitle: 'Delete schema',
                    dialogText: 'Are you sure to delete schema?'
                },
                disableClose: true,
                autoFocus: false
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
                    text: `There are some schemas that depend on this schema:\r\n${parents.map((parent) =>
                        SchemaHelper.getSchemaName(
                            parent.name,
                            parent.version || parent.sourceVersion,
                            parent.status
                        )
                    ).join('\r\n')}`
                }
            });
        }
    }

    private onNewVersion(element: Schema): void {
        const dialogRef = this.dialogService.open(SchemaDialog, {
            header: 'New Version',
            width: '950px',
            styleClass: 'custom-dialog',
            data: {
                type: 'version',
                topicId: this.currentTopic,
                schemaType: this.type,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools,
                properties: this.properties,
                scheme: element
            }
        });
        dialogRef.onClose.subscribe(async (schema: Schema | null) => {
            this.newVersionSchema(element.id, schema);
        });
    }

    private onCloneSchema(element: Schema): void {
        const newDocument: any = { ...element };
        delete newDocument._id;
        // delete newDocument.id;
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
                topicId: this.currentTopic,
                schemaType: this.type,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools,
                properties: this.properties,
                scheme: newDocument,
                category: this.getCategory()
            }
        });
        dialogRef.onClose.subscribe(async (schema: Schema | null) => {
            this.createSchema(schema);
        });
    }

    public onCopySchema(element: Schema): void {
        const newDocument: any = { ...element };
        delete newDocument._id;
        delete newDocument.id;
        delete newDocument.uuid;
        delete newDocument.creator;
        delete newDocument.owner;
        delete newDocument.version;
        delete newDocument.previousVersion;
        const dialogRef = this.dialog.open(CopySchemaDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                type: 'new',
                topicId: this.currentTopic,
                schemaType: this.type,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools,
                properties: this.properties,
                scheme: newDocument,
            }
        });
        dialogRef.afterClosed().subscribe(async (copyInfo: any | null) => {
            if (copyInfo) {
                this.schemaService.copySchema(copyInfo).subscribe((result) => {
                    const { taskId } = result;
                    this.router.navigate(['task', taskId], {
                        queryParams: {
                            last: btoa(location.href)
                        }
                    });
                }, (e) => {
                    this.loadError(e);
                });
            }
        });
    }

    public onPublish(element: Schema): void {
        const dialogRef = this.dialog.open(SetVersionDialog, {
            width: '350px',
            disableClose: true
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
            data: { timeStamp: messageId }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.importSchemasDetails(result);
            }
        });
    }

    private importSchemasDetails(result: any) {
        const { type, data, schemas, errors } = result;
        const dialogRef = this.dialog.open(SchemaViewDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                schemas: schemas,
                errors: errors,
                topicId: this.currentTopic,
                schemaType: this.type,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools
            }
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
                } else if (type == 'xlsx') {
                    this.importByExcel(data, result.topicId);
                }
            }
        });
    }

    public onExport(element: Schema): void {
        this.schemaService.exportInMessage(element.id)
            .subscribe(schema => this.dialogService.open(ExportSchemaDialog, {
                header: 'Export Schema',
                width: '720px',
                styleClass: 'custom-dialog',
                data: {
                    schema: schema
                },
            }), (e) => {
                this.loadError(e);
            });
    }

    public onActive(element: Schema): void {
        this.loading = true;
        this.schemaService.activeSystemSchema(element.id).subscribe((res) => {
            this.loading = false;
            this.loadSchemas();
        }, (e) => {
            this.loadError(e);
        });
    }

    public onCompare(element?: Schema) {
        const dialogRef = this.dialogService.open(CompareSchemaDialog, {
            header: 'Compare Schemas',
            width: '650px',
            styleClass: 'custom-dialog',
            data: {
                schema: element,
                policies: this.policies,
                schemas: this.compareList
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result && result.schemaId1 && result.schemaId2) {
                const items = btoa(JSON.stringify({
                    parent: null,
                    items: [
                        result.schemaId1,
                        result.schemaId2
                    ].map((id) => {
                        return {
                            type: 'id',
                            value: id
                        }
                    })
                }));
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'schema',
                        items
                    }
                });
            }
        });
    }

    public onViewSchemaTree(element: Schema): void {
        this.dialog.open(SchemaTreeComponent, {
            data: element,
            autoFocus: false
        })
    }

    public downloadExcelExample() {
        this.schemaService
            .downloadExcelExample()
            .subscribe((fileBuffer) => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-schema',
                    })
                );
                downloadLink.setAttribute(
                    'download',
                    `schema template.xlsx`
                );
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (error) => {
                this.loading = false;
            });
    }
}

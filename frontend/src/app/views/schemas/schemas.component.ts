import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
    ISchema,
    ISchemaDeletionPreview,
    IUser,
    LocationType,
    Schema,
    SchemaCategory,
    SchemaHelper,
    SchemaStatus,
    TagType,
    UserPermissions,
    ModelHelper
} from '@guardian/interfaces';
import { forkJoin, Observable, Subject, takeUntil } from 'rxjs';
//services
import { ProfileService } from '../../services/profile.service';
import { SchemaService } from '../../services/schema.service';
import { PolicyEngineService } from '../../services/policy-engine.service';
import { TagsService } from '../../services/tag.service';
//modules
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
import { CopySchemaDialog } from '../../modules/schema-engine/copy-schema-dialog/copy-schema-dialog';
import { SchemaTreeComponent } from 'src/app/modules/schema-engine/schema-tree/schema-tree.component';
import { DialogService } from 'primeng/dynamicdialog';
import { ProjectComparisonService } from 'src/app/services/project-comparison.service';
import { SchemaDeleteWarningDialogComponent } from 'src/app/modules/schema-engine/schema-delete-warning-dialog/schema-delete-warning-dialog.component';
import { SchemaDeleteDialogComponent } from 'src/app/modules/schema-engine/schema-delete-dialog/schema-delete-dialog.component';
import { ReplaceSchemasDialogComponent } from '../../modules/policy-engine/dialogs/replace-schemas-dialog/replace-schemas-dialog.component';
import { TreeNode } from 'primeng/api';

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
    public currentTopic: string | null = null;
    public page: ISchema[] = [];
    public treeData: TreeNode[] = [];
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
    public allPolicies: any[] = [];
    public modules: any[] = [];
    public tools: any[] = [];
    public draftTools: any[] = [];
    public columns: string[] = [];
    public compareList: any[] = [];
    public properties: any[] = [];
    public schemasTypes: { label: string; value: SchemaType }[] = [
        { label: 'Policy Schemas', value: SchemaType.Policy },
        { label: 'Tool Schemas', value: SchemaType.Tool },
        { label: 'Module Schemas', value: SchemaType.Module },
        { label: 'Tag Schemas', value: SchemaType.Tag },
        { label: 'System Schemas', value: SchemaType.System }
    ];
    public textSearch: any;

    public element: any = {};

    public isAllSelected: boolean = false;
    public selectedItems: any[] = [];
    public selectedItemIds: string[] = [];
    private static readonly NOT_BINDED = 'not-binded';

    public onMenuClick(event: MouseEvent, overlayPanel: any, menuData: any): void {
        this.element = menuData;

        overlayPanel.toggle(event)
    }

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
        private dialog: DialogService,
        private dialogService: DialogService
    ) {
        this.readonlyByTopic = {};
    }

    public get readonly(): boolean {
        return this.readonlyByTopic[this.currentTopic ?? ''];
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
                ) &&
                element.status !== SchemaStatus.DEMO
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
                this.ifDraft(element) &&
                element.status !== SchemaStatus.DEMO
            );
        }
    }

    public ifCanCopy(element: Schema): boolean {
        return (
            this.isConfirmed &&
            this.user.SCHEMAS_SCHEMA_CREATE &&
            this.type === SchemaType.Policy &&
            element.status !== SchemaStatus.DEMO
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

    public get NOT_BINDED(): string {
        return SchemaConfigComponent.NOT_BINDED;
    }

    private _destroy$ = new Subject<void>();

    ngOnInit() {
        const type = this.route.snapshot.queryParams.type;
        const topic = this.route.snapshot.queryParams.topic;
        this.type = this.getType(type);
        this.currentTopic = topic && topic !== 'all' ? topic : '';
        this.loadProfile();
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
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

    private getTopicId(): string | null {
        // Preserve "No Binding" selection exactly as-is so it reaches the API as topicId=not-binded
        if (this.currentTopic === SchemaConfigComponent.NOT_BINDED) {
            return SchemaConfigComponent.NOT_BINDED;
        }
        switch (this.type) {
            case SchemaType.Tag:
                return '';
            case SchemaType.Policy:
                if (!this.policyNameByTopic[this.currentTopic ?? '']) {
                    return null;
                } else {
                    return this.currentTopic;
                }
            case SchemaType.Module:
                if (!this.moduleNameByTopic[this.currentTopic ?? '']) {
                    return null;
                } else {
                    return this.currentTopic;
                }
            case SchemaType.Tool:
                if (!this.toolNameByTopic[this.currentTopic ?? '']) {
                    return null;
                } else {
                    return this.currentTopic;
                }
            case SchemaType.System:
                return null;
            default:
                if (!this.policyNameByTopic[this.currentTopic ?? '']) {
                    return null;
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
            this.policyEngineService.all(LocationType.LOCAL),
            this.policyEngineService.all(LocationType.REMOTE),
            this.moduleService.page(),
            this.toolService.page(),
            //Compare
            this.schemaService.list(),
            //Properties
            this.projectComparisonService.getProperties()
        ]).subscribe(([
            profileResponse,
            tagSchemasResponse,
            //Filters
            policiesResponse,
            policyViewsResponse,
            modulesResponse,
            toolsResponse,
            //Compare
            listResponse,
            //Properties
            propertiesResponse
        ]) => {
            try {
                //Profile
                const profile: IUser | null = profileResponse;
                this.isConfirmed = !!(profile && profile.confirmed);
                this.owner = profile?.did || '';
                this.user = new UserPermissions(profile);
                if (!this.isConfirmed) {
                    this.type = SchemaType.System;
                }

                //Tags
                const tagSchemas: ISchema[] = tagSchemasResponse || [];
                this.tagSchemas = SchemaHelper.map(tagSchemas);

                //Filters
                this.readonlyByTopic = {};

                const policies: any[] = policiesResponse || [];
                const policyViews: any[] = policyViewsResponse || [];

                this.policyNameByTopic = {};
                this.policyIdByTopic = {};
                this.allPolicies = [{
                    name: 'All Policies',
                    topicId: null
                },
                {
                    name: 'No Binding',
                    topicId: SchemaConfigComponent.NOT_BINDED
                }];
                for (const policy of policies) {
                    if (policy.topicId) {
                        this.policyIdByTopic[policy.topicId] = policy.id;
                        this.policyNameByTopic[policy.topicId] = policy.name;
                        this.allPolicies.push(policy);
                        this.readonlyByTopic[policy.topicId] = policy.creator !== this.owner;
                    }
                }
                for (const policy of policyViews) {
                    if (policy.topicId) {
                        this.policyIdByTopic[policy.topicId] = policy.id;
                        this.policyNameByTopic[policy.topicId] = policy.name;
                        this.allPolicies.push(policy);
                        this.readonlyByTopic[policy.topicId] = policy.creator !== this.owner;
                    }
                }
                this.policies = this.allPolicies.filter((p) => p.status !== 'DEMO' && p.status !== 'VIEW');

                const modules: any[] = modulesResponse?.body || [];
                this.moduleNameByTopic = {};
                this.modules = [];
                for (const module of modules) {
                    if (module.topicId) {
                        this.moduleNameByTopic[module.topicId] = module.name;
                        this.modules.push(module);
                        this.readonlyByTopic[module.topicId] = module.creator !== this.owner;
                    }
                }

                const tools: any[] = toolsResponse?.body || [];
                this.toolNameByTopic = {};
                this.toolIdByTopic = {};
                this.tools = [{
                    name: 'All Tools',
                    topicId: null
                }];
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
                const list: any[] = listResponse || [];
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
                const properties: any[] = propertiesResponse || [];
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
        this.treeData = [];
        this.columns = this.getColumns();
        this.currentTopic = this.getTopicId();
        let loader: Observable<HttpResponse<ISchema[]>>;
        switch (this.type) {
            case SchemaType.System: {
                loader = this.schemaService.getSystemSchemas({
                    pageIndex: this.pageIndex,
                    pageSize: this.pageSize
                });
                break;
            }
            case SchemaType.Tag: {
                loader = this.tagsService.getSchemas({
                    pageIndex: this.pageIndex,
                    pageSize: this.pageSize
                });
                break;
            }
            case SchemaType.Policy:
            case SchemaType.Module:
            case SchemaType.Tool:
            default: {
                const category = this.getCategory();
                loader = this.schemaService.getSchemasByPage({
                    category,
                    topicId: this.currentTopic || '',
                    search: this.textSearch,
                    pageIndex: this.pageIndex,
                    pageSize: this.pageSize
                });
                break;
            }
        }
        loader.subscribe((schemasResponse: HttpResponse<ISchema[]>) => {
            this.page = schemasResponse.body || [];
            for (const element of this.page as any[]) {
                element.__policyId = this.policyIdByTopic[element.topicId];
                element.__policyName = this.policyNameByTopic[element.topicId] || ' - ';
                element.__toolId = this.toolIdByTopic[element.topicId];
                element.__toolName = this.toolNameByTopic[element.topicId] || ' - ';
            }
            this.count = (schemasResponse.headers.get('X-Total-Count') || this.page.length) as number;
            this.treeData = this.groupSchemas(this.page);
            this.checkIsAllSelected();
            this.loadTagsData();
        }, (e) => {
            this.loadError(e);
        });
    }

    private groupSchemas(schemas: ISchema[]): TreeNode[] {
        if (this.type === SchemaType.System || this.type === SchemaType.Tag) {
            return [];
        }

        const groups = new Map<string, ISchema[]>();
        for (const schema of schemas) {
            const hasPolicyOrToolBinding = Boolean((schema as Record<string, unknown>).__policyId) || Boolean((schema as Record<string, unknown>).__toolId);
            const topicId = hasPolicyOrToolBinding ? schema.topicId ?? SchemaConfigComponent.NOT_BINDED : SchemaConfigComponent.NOT_BINDED;
            if (!groups.has(topicId)) {
                groups.set(topicId, []);
            }
            groups.get(topicId)!.push(schema);
        }

        const result: TreeNode[] = [];
        groups.forEach((groupSchemas, topicId) => {
            const sortedSchemas = groupSchemas.sort((a, b) => {
                // First compare by topicId
                const topicA = a.topicId || '';
                const topicB = b.topicId || '';
                const topicCompare = topicA.localeCompare(topicB);

                // If topicIds are different, return the topic comparison result
                if (topicCompare !== 0) {
                    return topicCompare;
                }

                // If topicIds are the same, compare by version
                return ModelHelper.versionCompare(b.version || b.sourceVersion || '', a.version || a.sourceVersion || '');
            });

            let parentName = '';
            let parentId = '';
            if (this.type === SchemaType.Policy) {
                parentName = this.policyNameByTopic[topicId] || 'No Binding';
                parentId = this.policyIdByTopic[topicId];
            } else if (this.type === SchemaType.Module) {
                parentName = this.moduleNameByTopic[topicId] || '';
            } else if (this.type === SchemaType.Tool) {
                parentName = this.toolNameByTopic[topicId] || '';
                parentId = this.toolIdByTopic[topicId];
            }

            const topicCountByTopicId = new Map<string, number>();
            for (const schema of groupSchemas) {
                if (!schema.topicId) {
                    continue;
                }
                const count = schema.topicCount ?? 0;
                if (!topicCountByTopicId.has(schema.topicId)) {
                    topicCountByTopicId.set(schema.topicId, count);
                }
            }

            const totalTopicCount = Array.from(topicCountByTopicId.values()).reduce(
                (sum, count) => sum + count,
                0
            );

            const parentNode: TreeNode = {
                data: {
                    name: parentName,
                    topicId,
                    isParent: true,
                    policyId: parentId,
                    toolId: parentId,
                    count: groupSchemas.length,
                    totalCount: totalTopicCount
                },
                expanded: true,
                children: sortedSchemas.map(schema => ({
                    data: schema,
                    leaf: true
                }))
            };
            result.push(parentNode);
        });

        return result;
    }

    private loadTagsData() {
        if (this.type === SchemaType.Policy && this.user.TAGS_TAG_READ) {
            const ids = this.page.map(e => String(e.id));
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                for (const schema of this.page) {
                    (schema as any)._tags = data[String(schema.id)];
                }
                for (const node of this.treeData) {
                    if (node.children) {
                        for (const child of node.children) {
                            child.data._tags = data[String(child.data.id)];
                        }
                    }
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

    public onFilter(event?: any) {
        if (event && event.value === null) {
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

    public onSelectFilter(topicId: string) {
        this.currentTopic = topicId === SchemaConfigComponent.NOT_BINDED ? SchemaConfigComponent.NOT_BINDED : topicId;
        this.onFilter();
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

    private deleteSchema(id: string, includeChildren: boolean): void {
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
                this.schemaService.delete(id, includeChildren).subscribe(result => {
                    const { taskId, expectation } = result;
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

    private importByMessage(data: any, topicId: string, schemasForReplace?: string[]): void {
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
                this.schemaService.pushImportByMessage(data, topicId, schemasForReplace).subscribe((result) => {
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

    private importByFile(data: any, topicId: string, schemasForReplace?: string[]): void {
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
                this.schemaService.pushImportByFile(data, topicId, schemasForReplace).subscribe((result) => {
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

    private importByExcel(data: any, topicId: string, schemasForReplace?: string[]): void {
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
                this.schemaService.pushImportByXlsx(data, topicId, schemasForReplace).subscribe((result) => {
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
            showHeader: false,
            header: 'New Schema',
            width: '950px',
            styleClass: 'guardian-dialog',
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
        this.dialog.open(SchemaFormDialog, {
            showHeader: false,
            header: 'Dry run with test data',
            width: '950px',
            styleClass: 'guardian-dialog',
            data: {
                schema,
                example,
                category: this.getCategory()
            },
        });
    }

    public onOpenDocument(element: Schema): void {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                row: element,
                document: element?.document,
                title: 'Schema',
                type: 'JSON',
                topicId: element.topicId,
                schemaId: element.id,
                category: this.getCategory()
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
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
            showHeader: false,
            header: 'Edit Schema',
            width: '950px',
            styleClass: 'guardian-dialog',
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
            this.schemaService.getSchemaDeletionPreview([element.id]).subscribe((result: ISchemaDeletionPreview) => {
                const dialogRef = this.dialogService.open(SchemaDeleteDialogComponent, {
                    showHeader: false,
                    width: '640px',
                    styleClass: 'guardian-dialog',
                    data: {
                        header: 'Delete Schema',
                        itemNames: [element.name],
                        deletableChildren: result.deletableChildren,
                        blockedChildren: result.blockedChildren
                    },
                });
                dialogRef.onClose.subscribe((result: any) => {
                    if (result.action === 'Delete') {
                        this.deleteSchema(element.id, result.includeChildren);
                    }
                });
            })
        } else {
            const parentsSchemaNames = parents.map(parent => SchemaHelper.getSchemaName(
                parent.name,
                parent.version || parent.sourceVersion,
                parent.status
            ));
            this.dialog.open(SchemaDeleteWarningDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'guardian-dialog',
                data: {
                    header: 'Warning',
                    text: `There are some schemas that depend on this schema:`,
                    warningItems: parentsSchemaNames,
                    buttons: [{
                        name: 'Close',
                        class: 'secondary'
                    }]
                }
            });
        }
    }

    private onNewVersion(element: Schema): void {
        const dialogRef = this.dialogService.open(SchemaDialog, {
            showHeader: false,
            header: 'New Version',
            width: '950px',
            styleClass: 'guardian-dialog',
            data: {
                type: 'version',
                topicId: this.currentTopic,
                schemaType: this.type,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools,
                properties: this.properties,
                scheme: element,
                category: this.getCategory(),
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
        // delete newDocument.version;
        delete newDocument.previousVersion;
        const dialogRef = this.dialogService.open(SchemaDialog, {
            showHeader: false,
            header: 'New Version',
            width: '950px',
            styleClass: 'guardian-dialog',
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
        // delete newDocument.version;
        delete newDocument.previousVersion;
        const dialogRef = this.dialog.open(CopySchemaDialog, {
            width: '860px',
            showHeader: false,
            styleClass: 'guardian-dialog',
            modal: true,
            closable: false,
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
        dialogRef.onClose.subscribe(async (copyInfo: any | null) => {
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
            modal: true,
            closable: false,
            data: {
                schema: element
            }
        });
        dialogRef.onClose.subscribe(async (version) => {
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
            styleClass: 'guardian-dialog',
            showHeader: false,
            data: {
                schemas,
                errors,
                topicId: this.currentTopic,
                schemaType: this.type,
                policies: this.policies,
                modules: this.modules,
                tools: this.draftTools
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result && result.messageId) {
                this.onImportSchemas(result.messageId);
                return;
            }
            if (result && result.topicId) {
                this.loading = true;
                this.schemaService.checkForDublicates({
                    policyId: result.topicId,
                    schemaNames: schemas.map(({ name }: { name: string }) => name)
                }).subscribe(
                    (res) => {
                        this.loading = false;
                        if (res?.schemasCanBeReplaced?.length) {
                            if (type == 'message') {
                                this.importFromMessageReplace({
                                    data,
                                    ...result,
                                    schemasCanBeReplaced: res.schemasCanBeReplaced,
                                });
                            } else if (type == 'file') {
                                this.importFromFileReplace({
                                    data,
                                    ...result,
                                    schemasCanBeReplaced: res.schemasCanBeReplaced,
                                });
                            } else if (type == 'xlsx') {
                                this.importExcelReplace({
                                    type: 'xlsx',
                                    data,
                                    ...result,
                                    schemasCanBeReplaced: res.schemasCanBeReplaced,
                                });
                            }
                        } else {
                            if (type == 'message') {
                                this.importByMessage(data, result.topicId);
                            } else if (type == 'file') {
                                this.importByFile(data, result.topicId);
                            } else if (type == 'xlsx') {
                                this.importByExcel(data, result.topicId);
                            }
                        }
                    },
                    (e) => {
                        this.loading = false;
                    }
                );
            }
        });
    }

    private importFromMessageReplace(result: any) {
        const { data, schemasCanBeReplaced } = result;
        const dialogRef = this.dialogService.open(ReplaceSchemasDialogComponent, {
            header: 'Schemas for replace',
            width: '800px',
            styleClass: 'guardian-dialog',
            showHeader: false,
            data: {
                title: 'Schemas for replace',
                schemasCanBeReplaced,
            },
        });
        dialogRef.onClose.subscribe(async (resultWithSchemasForReplace) => {
            if (resultWithSchemasForReplace) {
                this.importByMessage(data, result.topicId, resultWithSchemasForReplace.selectedSchemaIds);
            }
        });
    }

    private importFromFileReplace(result: any) {
        const { data, schemasCanBeReplaced } = result;
        const dialogRef = this.dialogService.open(ReplaceSchemasDialogComponent, {
            header: 'Schemas for replace',
            width: '800px',
            styleClass: 'guardian-dialog',
            showHeader: false,
            data: {
                title: 'Schemas for replace',
                schemasCanBeReplaced,
            },
        });
        dialogRef.onClose.subscribe(async (resultWithSchemasForReplace) => {
            if (resultWithSchemasForReplace) {
                this.importByFile(data, result.topicId, resultWithSchemasForReplace.selectedSchemaIds);
            }
        });
    }

    private importExcelReplace(result: any) {
        const { data, schemasCanBeReplaced } = result;
        const dialogRef = this.dialogService.open(ReplaceSchemasDialogComponent, {
            header: 'Schemas for replace',
            width: '800px',
            styleClass: 'guardian-dialog',
            showHeader: false,
            data: {
                title: 'Schemas for replace',
                schemasCanBeReplaced,
            },
        });
        dialogRef.onClose.subscribe(async (resultWithSchemasForReplace) => {
            if (resultWithSchemasForReplace) {
                this.importByExcel(data, result.topicId, resultWithSchemasForReplace.selectedSchemaIds);

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
                    schema
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
            showHeader: false,
            header: 'Tree',
            width: '650px',
            styleClass: 'guardian-dialog',
            data: element,
            // autoFocus: false
        })
    }

    public downloadExcelExample() {
        this.schemaService
            .downloadExcelExample()
            .subscribe((fileBuffer) => {
                const downloadLink = document.createElement('a');
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

    public canDisplayColumn(columnName: string): boolean {
        switch (columnName) {
            case 'select':
                if (this.type === SchemaType.System) {
                    return (
                        this.isConfirmed &&
                        this.user.SCHEMAS_SYSTEM_SCHEMA_DELETE
                    );
                } else {
                    return (
                        this.isConfirmed &&
                        this.user.SCHEMAS_SCHEMA_DELETE
                    );
                }

            default:
                return true;
        }
    }

    public onSelectAllItems(event: any) {
        if (event.checked) {
            this.selectedItems = [...this.selectedItems, ...this.page.filter((item: any) => this.ifCanDelete(item) && !this.selectedItemIds.includes(item.id))];
            this.selectedItemIds = this.selectedItems.map(item => item.id);
        } else {
            this.selectedItems = this.selectedItems.filter(item => !this.page.some(schema => item.id === schema.id));
            this.selectedItemIds = this.selectedItems.map(item => item.id);
        }

        this.checkIsAllSelected();
    }

    public onSelectItem(item: any) {
        const index = this.selectedItemIds.indexOf(item.id);
        if (index === -1) {
            this.selectedItems.push(item);
            this.selectedItemIds.push(item.id);
        } else {
            this.selectedItems.splice(index, 1);
            this.selectedItemIds.splice(index, 1);
        }

        this.checkIsAllSelected();
    }

    public checkIsAllSelected() {
        const canDeleteItems = this.page.filter((schema: any) => this.ifCanDelete(schema));
        this.isAllSelected = canDeleteItems?.length > 0;

        canDeleteItems.forEach((schema: any) => {
            if (!this.selectedItemIds.includes(schema.id)) {
                this.isAllSelected = false;
            }
        })
    }

    public isSelected(item: any) {
        return this.selectedItemIds.includes(item.id);
    }

    public isAnyItemSelected() {
        return this.selectedItems.length > 0;
    }

    public isAnyDeleteDisabled() {
        return !this.page.some((item: any) => this.ifCanDelete(item));
    }

    public isDeleteDisabled(item: any) {
        return !this.ifCanDelete(item);
    }

    public onDeleteItems() {
        if (this.selectedItems?.length === 1) {
            this.onCheckDeleteSchema(this.selectedItems[0]);
        } else if (this.selectedItems?.length >= 2) {
            this.loading = true;
            this.schemaService.getSchemaDeletionPreview(this.selectedItems.map(item => item.id)).subscribe((result: ISchemaDeletionPreview) => {
                this.loading = false;
                const dialogRef = this.dialogService.open(SchemaDeleteDialogComponent, {
                    showHeader: false,
                    width: '640px',
                    styleClass: 'guardian-dialog',
                    data: {
                        header: 'Delete Schema',
                        text: `Are you sure want to delete these schemas?`,
                        itemNames: this.selectedItems
                            .filter(item => !result.blockedChildren.some(block => item.uuid === block.schema.uuid))
                            .map(item => item.name),
                        deletableChildren: result.deletableChildren,
                        blockedChildren: result.blockedChildren
                    },
                });
                dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe((result: any) => {
                    if (result.action === 'Delete') {
                        this.loading = true;
                        this.schemaService.deleteMultiple(this.selectedItems.map(item => item.id), result.includeChildren)
                            .pipe(takeUntil(this._destroy$)).subscribe(
                                async (result) => {
                                    const { taskId, expectation } = result;
                                    this.router.navigate(['task', taskId], {
                                        queryParams: {
                                            last: btoa(location.href)
                                        }
                                    });
                                },
                                (e) => {
                                    this.loadError(e);
                                }
                            );
                    }
                });
            })
        }
    }

    public onClearSelection() {
        this.selectedItems = [];
        this.selectedItemIds = [];
        this.isAllSelected = false;
    }
}

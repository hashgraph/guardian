import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ISchema, IUser, Schema, SchemaHelper, TagType } from '@guardian/interfaces';
import { forkJoin, Observable } from 'rxjs';
//services
import { ProfileService } from '../../services/profile.service';
import { SchemaService } from '../../services/schema.service';
import { InformService } from '../../services/inform.service';
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

/**
 * Page for creating, editing, importing and exporting schemas.
 */
@Component({
    selector: 'app-schema-config',
    templateUrl: './schemas.component.html',
    styleUrls: ['./schemas.component.css']
})
export class SchemaConfigComponent implements OnInit {
    loading: boolean = true;
    isConfirmed: boolean = false;
    schemas: Schema[] = [];
    schemasCount: any;
    columns: string[] = [];
    policySchemaColumns: string[] = [
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
    systemSchemaColumns: string[] = [
        'type',
        'owner',
        'entity',
        'active',
        'activeOperation',
        'editSystem',
        'deleteSystem',
        'document',
    ];
    tagSchemaColumns: string[] = [
        'type',
        'owner',
        'status',
        'tagOperation',
        'editTag',
        'deleteTag',
        'document',
    ];
    selectedAll!: boolean;
    policies: any[] | null;
    currentTopicPolicy: any = '';
    pageIndex: number;
    pageSize: number;
    schemasMap: any;
    policyNameByTopic: any;
    allSchemas: Schema[] = [];
    tagSchemas: Schema[] = [];
    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;
    owner: any;
    tagEntity = TagType.Schema;
    type: string = 'system';

    public get isSystem(): boolean {
        return this.type === 'system';
    }

    public get isPolicy(): boolean {
        return this.type === 'policy' && this.isConfirmed;
    }

    public get isTag(): boolean {
        return this.type === 'tag' && this.isConfirmed;
    }

    public get isAny(): boolean {
        return this.isSystem || this.isPolicy || this.isTag;
    }

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyEngineService: PolicyEngineService,
        private informService: InformService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog) {
        this.policies = null;
        this.pageIndex = 0;
        this.pageSize = 25;
        this.policyNameByTopic = {};
    }

    ngOnInit() {
        const type = this.route.snapshot.queryParams['type'];
        const topic = this.route.snapshot.queryParams['topic'];
        this.type = 
            type === 'tag' ? 'tag' : 
            (type === 'system' ? 'system' : 'policy');
        this.currentTopicPolicy = topic && topic != 'all' ? topic : '';
        this.loadProfile()
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

    loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.all(),
            this.schemaService.list(),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            this.loading = false;

            const profile: IUser | null = value[0];
            const policies: any[] = value[1] || [];
            const schemas: any[] = value[2] || [];
            const tagSchemas: any[] = value[3] || [];

            this.isConfirmed = !!(profile && profile.confirmed);
            this.owner = profile?.did;
            if (!this.isConfirmed) {
                this.type = 'system';
            }

            this.policyNameByTopic = {};
            this.policies = [];
            for (let i = 0; i < policies.length; i++) {
                const policy = policies[i];
                if (policy.topicId && !this.policyNameByTopic.hasOwnProperty(policy.topicId)) {
                    this.policyNameByTopic[policy.topicId] = policy.name;
                    this.policies.push(policy);
                }
            }

            if (!this.policyNameByTopic[this.currentTopicPolicy]) {
                this.currentTopicPolicy = undefined;
            }

            for (const schema of schemas) {
                schema.policy = this.policyNameByTopic[schema.topicId];
                if (schema.policy) {
                    schema.fullName = `${schema.name} (${schema.policy})`;
                } else {
                    schema.fullName = schema.name;
                }
            }

            this.allSchemas = schemas;
            this.tagSchemas = SchemaHelper.map(tagSchemas);

            this.pageIndex = 0;
            this.pageSize = 25;
            this.loadSchemas();
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    loadSchemas() {
        this.loading = true;

        switch (this.type) {
            case 'system': {
                this.columns = this.systemSchemaColumns;
                this.schemaService.getSystemSchemas(this.pageIndex, this.pageSize)
                    .subscribe((schemasResponse: HttpResponse<ISchema[]>) => {
                        this.schemas = SchemaHelper.map(schemasResponse.body || []);
                        this.schemasCount = schemasResponse.headers.get('X-Total-Count') || this.schemas.length;
                        this.schemaMapping(this.schemas);
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    }, (e) => {
                        console.error(e.error);
                        this.loading = false;
                    });
                break;
            }
            case 'tag': {
                this.columns = this.tagSchemaColumns;
                this.tagsService.getSchemas(this.pageIndex, this.pageSize)
                    .subscribe((schemasResponse: HttpResponse<ISchema[]>) => {
                        this.schemas = SchemaHelper.map(schemasResponse.body || []);
                        this.schemasCount = schemasResponse.headers.get('X-Total-Count') || this.schemas.length;
                        this.schemaMapping(this.schemas);
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    }, (e) => {
                        console.error(e.error);
                        this.loading = false;
                    });
                break;
            }
            default: {
                this.columns = this.policySchemaColumns;
                this.schemaService.getSchemasByPage(this.currentTopicPolicy, this.pageIndex, this.pageSize)
                    .subscribe((schemasResponse: HttpResponse<ISchema[]>) => {
                        this.schemas = SchemaHelper.map(schemasResponse.body || []);
                        this.schemasCount = schemasResponse.headers.get('X-Total-Count') || this.schemas.length;
                        this.schemaMapping(this.schemas);
                        const ids = this.schemas.map(e => e.id);
                        this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                            for (const schema of this.schemas) {
                                (schema as any)._tags = data[schema.id];
                            }
                            setTimeout(() => {
                                this.loading = false;
                            }, 500);
                        }, (e) => {
                            console.error(e.error);
                            this.loading = false;
                        });
                    }, (e) => {
                        console.error(e.error);
                        this.loading = false;
                    });
                break;
            }
        }
    }

    onFilter() {
        this.pageIndex = 0;
        this.router.navigate(['/schemas'], {
            queryParams: {
                topic: this.currentTopicPolicy ? this.currentTopicPolicy : 'all'
            }
        });
        this.loadSchemas();
    }

    onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadSchemas();
    }

    schemaMapping(schemas: ISchema[]) {
        this.schemasMap = {};
        for (let i = 0; i < schemas.length; i++) {
            const schema = schemas[i];
            if (schema.topicId) {
                if (this.schemasMap[schema.topicId]) {
                    this.schemasMap[schema.topicId].push(schema);
                } else {
                    this.schemasMap[schema.topicId] = [schema];
                }
            }
        }
    }

    newSchemas() {
        const dialogRef = this.dialog.open(SchemaDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                type: 'new',
                schemaType: this.type,
                schemasMap: this.schemasMap,
                topicId: this.currentTopicPolicy,
                policies: this.policies
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (!schema) {
                return;
            }
            this.loading = true;
            switch (this.type) {
                case 'system': {
                    this.schemaService.createSystemSchemas(schema).subscribe((data) => {
                        localStorage.removeItem('restoreSchemaData');
                        this.loadSchemas();
                    }, (e) => {
                        console.error(e.error);
                        this.loading = false;
                    });
                    break;
                }
                case 'tag': {
                    this.tagsService.createSchema(schema).subscribe((data) => {
                        localStorage.removeItem('restoreSchemaData');
                        this.loadSchemas();
                    }, (e) => {
                        console.error(e.error);
                        this.loading = false;
                    });
                    break;
                }
                default: {
                    this.schemaService.pushCreate(schema, schema.topicId).subscribe((result) => {
                        const { taskId, expectation } = result;
                        this.taskId = taskId;
                        this.expectedTaskMessages = expectation;
                    }, (e) => {
                        this.loading = false;
                        this.taskId = undefined;
                    });
                    break;
                }
            }
        });
    }

    openDocument(element: Schema) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: element.document,
                title: 'Schema',
                type: 'JSON',
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
    }

    editDocument(element: Schema) {
        const dialogRef = this.dialog.open(SchemaDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                type: 'edit',
                schemaType: this.type,
                schemasMap: this.schemasMap,
                topicId: this.currentTopicPolicy,
                policies: this.policies,
                scheme: element
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this._updateSystem(schema, element.id).subscribe((data) => {
                    localStorage.removeItem('restoreSchemaData');
                    this.loadSchemas();
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    newVersionDocument(element: Schema) {
        const dialogRef = this.dialog.open(SchemaDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                type: 'version',
                schemasMap: this.schemasMap,
                topicId: this.currentTopicPolicy,
                policies: this.policies,
                scheme: element
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.newVersion(schema, element.id).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.taskId = taskId;
                    this.expectedTaskMessages = expectation;
                }, (e) => {
                    this.loading = false;
                    this.taskId = undefined;
                });
            }
        });
    }

    cloneDocument(element: Schema) {
        const newDocument: any = { ...element };
        delete newDocument._id;
        delete newDocument.id;
        delete newDocument.uuid;
        delete newDocument.creator;
        delete newDocument.owner;
        delete newDocument.version;
        delete newDocument.previousVersion;
        const dialogRef = this.dialog.open(SchemaDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                type: 'version',
                schemasMap: this.schemasMap,
                topicId: this.currentTopicPolicy,
                policies: this.policies,
                scheme: newDocument
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.pushCreate(schema, schema.topicId).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.taskId = taskId;
                    this.expectedTaskMessages = expectation;
                }, (e) => {
                    this.loading = false;
                    this.taskId = undefined;
                });
            }
        });
    }

    publish(element: any) {
        const dialogRef = this.dialog.open(SetVersionDialog, {
            width: '350px',
            disableClose: true,
            data: {
                schemas: this.schemas
            }
        });
        dialogRef.afterClosed().subscribe(async (version) => {
            if (version) {
                this.loading = true;
                this.schemaService.pushPublish(element.id, version).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.taskId = taskId;
                    this.expectedTaskMessages = expectation;
                }, (e) => {
                    this.loading = false;
                    this.taskId = undefined;
                });
            }
        });
    }

    onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.loading = false;
        this.taskId = undefined;
    }

    onAsyncCompleted() {
        this.taskId = undefined;
        localStorage.removeItem('restoreSchemaData');
        this.loadSchemas();
    }

    unpublished(element: any) {
        this.loading = true;
        this.schemaService.unpublished(element.id).subscribe((data: any) => {
            const schemas = SchemaHelper.map(data);
            this.schemaMapping(schemas);
            this.loadSchemas();
        }, (e) => {
            this.loading = false;
        });
    }

    deleteSchema(element: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete schema',
                dialogText: 'Are you sure to delete schema?'
            },
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;
            this._deleteSystem(element.id).subscribe((data: any) => {
                this.loadSchemas();
            }, (e) => {
                this.loading = false;
            });
        });
    }

    async importSchemas(messageId?: string) {
        const dialogRef = this.dialog.open(ImportSchemaDialog, {
            width: '500px',
            autoFocus: false,
            data: { timeStamp: messageId }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.importSchemasDetails(result);
            }
        });
    }

    importSchemasDetails(result: any) {
        const { type, data, schemas } = result;
        const dialogRef = this.dialog.open(SchemaViewDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            data: {
                schemas: schemas,
                topicId: this.currentTopicPolicy,
                policies: this.policies,
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && result.messageId) {
                this.importSchemas(result.messageId);
                return;
            }

            if (result && result.topicId) {
                this.loading = true;
                if (type == 'message') {
                    this.schemaService.pushImportByMessage(data, result.topicId).subscribe((result) => {
                        const { taskId, expectation } = result;
                        this.taskId = taskId;
                        this.expectedTaskMessages = expectation;
                    });
                } else if (type == 'file') {
                    this.schemaService.pushImportByFile(data, result.topicId).subscribe((result) => {
                        const { taskId, expectation } = result;
                        this.taskId = taskId;
                        this.expectedTaskMessages = expectation;
                    });
                }
            }
        });
    }

    export(element: any) {
        this.schemaService.exportInMessage(element.id)
            .subscribe(schema => this.dialog.open(ExportSchemaDialog, {
                width: '700px',
                panelClass: 'g-dialog',
                data: {
                    schema: schema
                },
                autoFocus: false
            }));
    }

    downloadObjectAsJson(exportObj: any, exportName: string) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', exportName + '.json');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    selectAll(selectedAll: boolean) {
        this.selectedAll = selectedAll;
        for (let i = 0; i < this.schemas.length; i++) {
            const element: any = this.schemas[i];
            if (element.messageId) {
                element._selected = selectedAll;
            }
        }
        this.schemas = this.schemas.slice();
    }

    selectItem() {
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

    onChangeType(event: any) {
        this.pageIndex = 0;
        this.pageSize = 100;
        this.currentTopicPolicy = undefined;
        this.router.navigate(['/schemas'], { queryParams: { type: this.type } });
        this.loadSchemas();
    }

    active(element: any) {
        this.loading = true;
        this.schemaService.activeSystemSchema(element.id).subscribe((res) => {
            this.loading = false;
            this.loadSchemas();
        }, (e) => {
            this.loading = false;
        });
    }

    publishTagSchema(element: any) {
        this.loading = true;
        this.tagsService.publishSchema(element.id).subscribe((res) => {
            this.loading = false;
            this.loadSchemas();
        }, (e) => {
            this.loading = false;
        });
    }

    compareSchemas(element?: any) {
        const dialogRef = this.dialog.open(CompareSchemaDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: {
                schema: element,
                policies: this.policies,
                schemas: this.allSchemas
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'schema',
                        schemaId1: result.schemaId1,
                        schemaId2: result.schemaId2
                    }
                });
            }
        });
    }
}
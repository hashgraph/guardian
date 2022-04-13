import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaService } from '../../services/schema.service';
import { SchemaDialog } from '../../schema-engine/schema-dialog/schema-dialog.component';
import { ISchema, IUser, Schema, SchemaHelper, SchemaStatus } from 'interfaces';
import { ImportSchemaDialog } from 'src/app/schema-engine/import-schema/import-schema-dialog.component';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';
import { SchemaViewDialog } from 'src/app/schema-engine/schema-view-dialog/schema-view-dialog.component';
import { ExportSchemaDialog } from 'src/app/schema-engine/export-schema-dialog/export-schema-dialog.component';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { HttpResponse } from '@angular/common/http';

/**
 * Page for creating, editing, importing and exporting schemes.
 */
@Component({
    selector: 'app-schema-config',
    templateUrl: './schema-config.component.html',
    styleUrls: ['./schema-config.component.css']
})
export class SchemaConfigComponent implements OnInit {
    loading: boolean = true;
    isConfirmed: boolean = false;
    schemes: Schema[] = [];
    schemesCount: any;
    schemaColumns: string[] = [
        'policy',
        'type',
        'topic',
        'version',
        'entity',
        'status',
        'operation',
        'export',
        'edit',
        'delete',
        'document',
    ];
    selectedAll!: boolean;
    policies: any[] | null;
    currentTopicPolicy: any = '';
    pageIndex: number;
    pageSize: number;
    schemesMap: any;
    policyNameByTopic: any;

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyEngineService: PolicyEngineService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog) {
        this.policies = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.policyNameByTopic = {};
    }

    ngOnInit() {
        this.loadProfile()
    }

    loadProfile() {
        this.loading = true;
        this.profileService.getProfile().subscribe((profile: IUser | null) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            if (this.isConfirmed) {
                this.loadData();
            } else {
                this.loading = false;
            }
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    loadData() {
        this.pageIndex = 0;
        this.pageSize = 100;
        forkJoin([
            this.policyEngineService.all(),
            this.schemaService.getSchemesByPage(undefined, this.pageIndex, this.pageSize)
        ]).subscribe((value) => {
            const policies: any[] = value[0];
            const schemesResponse = value[1] as HttpResponse<ISchema[]>;
            this.policyNameByTopic = {};
            this.policies = [];
            for (let i = 0; i < policies.length; i++) {
                const policy = policies[i];
                if(policy.topicId && !this.policyNameByTopic.hasOwnProperty(policy.topicId)) {
                    this.policyNameByTopic[policy.topicId] = policy.name;
                    this.policies.push(policy);
                }
            }
            this.schemes = SchemaHelper.map(schemesResponse.body || []);
            this.schemesCount = schemesResponse.headers.get('X-Total-Count') || this.schemes.length;
            this.schemaMapping(this.schemes);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    loadSchemes() {
        this.loading = true;
        this.schemaService.getSchemesByPage(this.currentTopicPolicy, this.pageIndex, this.pageSize)
            .subscribe((schemesResponse: HttpResponse<ISchema[]>) => {
                this.schemes = SchemaHelper.map(schemesResponse.body || []);
                this.schemesCount = schemesResponse.headers.get('X-Total-Count') || this.schemes.length;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    onFilter() {
        this.pageIndex = 0;
        this.loadSchemes();
    }

    onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadSchemes();
    }

    schemaMapping(schemes: ISchema[]) {
        this.schemesMap = {};
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            if (schema.topicId) {
                if (this.schemesMap[schema.topicId]) {
                    this.schemesMap[schema.topicId].push(schema);
                } else {
                    this.schemesMap[schema.topicId] = [schema];
                }
            }
        }
    }

    newSchemes() {

        const dialogRef = this.dialog.open(SchemaDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                type: 'new',
                schemesMap: this.schemesMap,
                topicId: this.currentTopicPolicy,
                policies: this.policies
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.create(schema, schema.topicId).subscribe((data) => {
                    this.loadSchemes();
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
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
                schemesMap: this.schemesMap,
                topicId: this.currentTopicPolicy,
                policies: this.policies,
                scheme: element
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.update(schema, element.id).subscribe((data) => {
                    this.loadSchemes();
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
                schemesMap: this.schemesMap,
                topicId: this.currentTopicPolicy,
                policies: this.policies,
                scheme: element
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.newVersion(schema, element.id).subscribe((data) => {
                    this.loadSchemes();
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    cloneDocument(element: Schema) {
        const newDocument: any = { ...element };
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
                schemesMap: this.schemesMap,
                topicId: this.currentTopicPolicy,
                policies: this.policies,
                scheme: newDocument
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.create(schema, schema.topicId).subscribe((data) => {
                    const schemes = SchemaHelper.map(data);
                    this.schemaMapping(schemes);
                    this.loadSchemes();
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    publish(element: any) {
        const dialogRef = this.dialog.open(SetVersionDialog, {
            width: '350px',
            disableClose: true,
            data: {
                schemes: this.schemes
            }
        });
        dialogRef.afterClosed().subscribe(async (version) => {
            if (version) {
                this.loading = true;
                this.schemaService.publish(element.id, version).subscribe((data: any) => {
                    const schemes = SchemaHelper.map(data);
                    this.schemaMapping(schemes);
                    this.loadSchemes();
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    unpublished(element: any) {
        this.loading = true;
        this.schemaService.unpublished(element.id).subscribe((data: any) => {
            const schemes = SchemaHelper.map(data);
            this.schemaMapping(schemes);
            this.loadSchemes();
        }, (e) => {
            this.loading = false;
        });
    }

    deleteSchema(element: any) {
        this.loading = true;
        this.schemaService.delete(element.id).subscribe((data: any) => {
            const schemes = SchemaHelper.map(data);
            this.schemaMapping(schemes);
            this.loadSchemes();
        }, (e) => {
            this.loading = false;
        });
    }

    async importSchemes(messageId?: string) {
        const dialogRef = this.dialog.open(ImportSchemaDialog, {
            width: '500px',
            autoFocus: false,
            data: { timeStamp: messageId }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.importSchemesDetails(result);
            }
        });
    }

    importSchemesDetails(result: any) {
        const { type, data, schemes } = result;
        const dialogRef = this.dialog.open(SchemaViewDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            data: {
                schemes: schemes,
                topicId: this.currentTopicPolicy,
                policies: this.policies,
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && result.messageId) {
                this.importSchemes(result.messageId);
                return;
            }

            if (result && result.topicId) {
                this.loading = true;
                if (type == 'message') {
                    this.schemaService.importByMessage(data, result.topicId).subscribe((schemes) => {
                        this.loadSchemes();
                    }, (e) => {
                        this.loading = false;
                    });
                } else if (type == 'file') {
                    this.schemaService.importByFile(data, result.topicId).subscribe((schemes) => {
                        this.loadSchemes();
                    }, (e) => {
                        this.loading = false;
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
        for (let i = 0; i < this.schemes.length; i++) {
            const element: any = this.schemes[i];
            if (element.messageId) {
                element._selected = selectedAll;
            }
        }
        this.schemes = this.schemes.slice();
    }

    selectItem() {
        this.selectedAll = true;
        for (let i = 0; i < this.schemes.length; i++) {
            const element: any = this.schemes[i];
            if (!element._selected) {
                this.selectedAll = false;
                break;
            }
        }
        this.schemes = this.schemes.slice();
    }
}

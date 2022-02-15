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
    publishSchemes: Schema[] = [];
    schemaColumns: string[] = [
        'type',
        'version',
        'entity',
        'status',
        'export',
        'operation',
        'edit',
        'delete',
        'document',
    ];
    selectedAll!: boolean;

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog) {

    }

    ngOnInit() {
        this.loadProfile()
    }

    loadProfile() {
        this.loading = true;
        this.profileService.getProfile().subscribe((profile: IUser | null) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            if (this.isConfirmed) {
                this.loadSchemes();
            } else {
                this.loading = false;
            }
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    loadSchemes() {
        this.schemaService.getSchemes().subscribe((data) => {
            this.setSchema(data);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    newSchemes() {
        const dialogRef = this.dialog.open(SchemaDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            data: {
                type: 'new',
                schemes: this.publishSchemes
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.create(schema).subscribe((data) => {
                    this.setSchema(data);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
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
                document: element.documentObject,
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
            data: {
                type: 'edit',
                schemes: this.publishSchemes,
                scheme: element
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.update(schema, element.id).subscribe((data) => {
                    this.setSchema(data);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
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
            data: {
                type: 'version',
                schemes: this.publishSchemes,
                scheme: element
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.newVersion(schema, element.id).subscribe((data) => {
                    this.setSchema(data);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    newDocument(element: Schema) {
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
            data: {
                type: 'version',
                schemes: this.publishSchemes,
                scheme: newDocument
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.create(schema).subscribe((data) => {
                    this.setSchema(data);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
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
            data: {
                schemes: this.schemes
            }
        });
        dialogRef.afterClosed().subscribe(async (version) => {
            if (version) {
                this.loading = true;
                this.schemaService.publish(element.id, version).subscribe((data: any) => {
                    this.setSchema(data);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    unpublished(element: any) {
        this.loading = true;
        this.schemaService.unpublished(element.id).subscribe((data: any) => {
            this.setSchema(data);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    deleteSchema(element: any) {
        this.loading = true;
        this.schemaService.delete(element.id).subscribe((data: any) => {
            this.setSchema(data);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    async importSchemes() {
        const dialogRef = this.dialog.open(ImportSchemaDialog, {
            width: '500px',
            autoFocus: false
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
                schemes: schemes
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                if (type == 'message') {
                    this.schemaService.importByMessage(data).subscribe((schemes) => {
                        this.setSchema(schemes);
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    }, (e) => {
                        this.loading = false;
                    });
                } else if (type == 'file') {
                    this.schemaService.importByFile(data).subscribe((schemes) => {
                        this.setSchema(schemes);
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    }, (e) => {
                        this.loading = false;
                    });
                }
            }
        });
    }

    setSchema(data: ISchema[]) {
        this.schemes = SchemaHelper.map(data);
        this.schemes = this.schemes.filter(s => !s.readonly);
        this.publishSchemes = this.schemes.filter(s => s.status == SchemaStatus.PUBLISHED);
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

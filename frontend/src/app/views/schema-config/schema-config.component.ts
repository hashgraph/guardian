import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaService } from '../../services/schema.service';
import { JsonDialog } from '../../components/dialogs/vc-dialog/vc-dialog.component';
import { SchemaDialog } from '../../components/dialogs/schema-dialog/schema-dialog.component';
import { ISchema, ISession, Schema, SchemaStatus, UserState } from 'interfaces';
import { ImportSchemaDialog } from 'src/app/components/dialogs/import-schema/import-schema-dialog.component';

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
        'selected',
        'uuid',
        'type',
        'entity',
        'status',
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
        this.profileService.getCurrentState().subscribe((profile: ISession) => {
            this.isConfirmed = !!profile && profile.state == UserState.CONFIRMED;
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
                schemes: this.publishSchemes
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.createSchema(schema).subscribe((data) => {
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
        const dialogRef = this.dialog.open(JsonDialog, {
            width: '850px',
            data: {
                document: element.schema,
                title: 'Schema'
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
    }

    editDocument(element: Schema) {
        const dialogRef = this.dialog.open(SchemaDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            data: {
                schemes: this.publishSchemes,
                scheme: element
            }
        });
        dialogRef.afterClosed().subscribe(async (schema: Schema | null) => {
            if (schema) {
                this.loading = true;
                this.schemaService.updateSchema(schema, element.id).subscribe((data) => {
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
        this.loading = true;
        this.schemaService.publishSchema(element.id).subscribe((data: any) => {
            this.setSchema(data);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    unpublished(element: any) {
        this.loading = true;
        this.schemaService.unpublishedSchema(element.id).subscribe((data: any) => {
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
        this.schemaService.deleteSchema(element.id).subscribe((data: any) => {
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
            width: '850px',
            data: {
                schemes: this.schemes
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && result.schemes) {
                this.schemaService.importSchemes(result.schemes).subscribe((data) => {
                    this.setSchema(data);
                    this.loading = false;
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    setSchema(data: ISchema[]) {
        this.schemes = Schema.mapRef(data) || [];
        this.publishSchemes = this.schemes.filter(s => s.status == SchemaStatus.PUBLISHED);
    }

    exportSchemes() {
        const ids = this.schemes.filter((s: any) => s._selected).map(s => s.uuid);
        this.schemaService.exportSchemes(ids).subscribe((data) => {
            this.downloadObjectAsJson(data.schemes, 'schema');
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
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
            element._selected = selectedAll;
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

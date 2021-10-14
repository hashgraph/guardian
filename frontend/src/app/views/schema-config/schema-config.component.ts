import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from "../../services/profile.service";
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaService } from '../../services/schema.service';
import { JsonDialog } from '../../components/dialogs/vc-dialog/vc-dialog.component';
import { SchemaDialog } from '../../components/dialogs/schema-dialog/schema-dialog.component';
import { ISession, Schema, UserState } from 'interfaces';
import { ImportSchemaDialog } from 'src/app/components/dialogs/import-schema/import-schema-dialog.component';

@Component({
    selector: 'app-schema-config',
    templateUrl: './schema-config.component.html',
    styleUrls: ['./schema-config.component.css']
})
export class SchemaConfigComponent implements OnInit {
    loading: boolean = true;
    isConfirmed: boolean = false;
    schemes: Schema[] = [];
    schemaColumns: string[] = [
        'selected',
        'type',
        'entity',
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
            this.schemes = Schema.map(data);
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    newSchemes() {
        const dialogRef = this.dialog.open(SchemaDialog, {
            width: '500px',
            data: {
                schemes: this.schemes
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.schemaService.createSchema(
                    result.type,
                    result.entity,
                    false,
                    result.document
                ).subscribe((data) => {
                    this.schemes = Schema.map(data);
                    this.loading = false;
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
                document: element.fullDocument,
                title: "Schema"
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
    }

    async importSchemes() {
        // const json = await this.loadObjectAsJson();
        // if (json) {
        //     this.schemaService.importSchemes(json).subscribe((data) => {
        //         this.schemes = Schema.map(data);
        //         this.loading = false;
        //     }, (e) => {
        //         console.error(e.error);
        //         this.loading = false;
        //     });
        // }

        const dialogRef = this.dialog.open(ImportSchemaDialog, {
            width: '850px',
            data: {
                schemes: this.schemes
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && result.schemes) {
                this.schemaService.importSchemes(result.schemes).subscribe((data) => {
                    this.schemes = Schema.map(data);
                    this.loading = false;
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    exportSchemes() {
        const ids = this.schemes.filter((s: any) => s._selected).map(s => s.type);
        this.schemaService.exportSchemes(ids).subscribe((data) => {
            this.downloadObjectAsJson(data.schemes, "schema");
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    downloadObjectAsJson(exportObj: any, exportName: string) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
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

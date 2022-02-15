import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuditService } from 'src/app/services/audit.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { Schema, SchemaHelper } from 'interfaces';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';

/**
 * Page with the list of VP Documents.
 */
@Component({
    selector: 'app-audit',
    templateUrl: './audit.component.html',
    styleUrls: ['./audit.component.css']
})
export class AuditComponent implements OnInit {
    loading: boolean = true;
    displayedColumns: string[] = [
        'id',
        'hash',
        'owner',
        'createDate',
        'type',
        'vp',
    ];
    dataSource: any[] = [];
    schemas: Schema[] = [];

    constructor(
        private auth: AuthService,
        private auditService: AuditService,
        private schemaService: SchemaService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog) {

    }


    ngOnInit() {
        this.loading = true;
        this.loadData();
    }

    loadData() {
        this.loading = true;
        forkJoin([
            this.auditService.getVpDocuments(),
            this.schemaService.getSchemes()
        ]).subscribe((value) => {
            const data: any = value[0];
            const schemes = value[1];

            this.loading = false;
            this.dataSource = data;
            this.schemas = SchemaHelper.map(schemes);
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    openVP(document: any) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document,
                title: 'VP',
                type: 'VP',
                schemas: this.schemas,
                viewDocument: true
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
    }

    setFilter(type: string, value: string) {
        if (type == 'id') {
            this.router.navigate(['/trust-chain'], { queryParams: { search: value } });
        }
        if (type == 'hash') {
            this.router.navigate(['/trust-chain'], { queryParams: { search: value } });
        }
    }
}
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuditService } from '../../services/audit.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { VCViewerDialog } from '../../modules/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from '../../services/policy-engine.service';
import { HttpResponse } from '@angular/common/http';
import { DialogService } from 'primeng/dynamicdialog';

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
        'policyId',
        'id',
        'hash',
        'owner',
        'createDate',
        'type',
        'vp',
    ];
    dataSource: any[] = [];
    policies: any[] = [];
    users: any[] = [];
    _policies: any[] = [];
    _users: any[] = [];
    currentPolicy: any;
    currentUser: any;
    pageIndex: number;
    pageSize: number;
    dataCount: any;

    constructor(
        private auth: AuthService,
        private auditService: AuditService,
        private route: ActivatedRoute,
        private router: Router,
        private policyEngineService: PolicyEngineService,
        public dialog: MatDialog,
        private dialogService: DialogService,
    ) {
        this.dataCount = 0;
        this.pageIndex = 0;
        this.pageSize = 10;
    }

    ngOnInit() {
        this.loading = true;
        this.loadData();
    }

    onFilter(type?: string) {
        if (type === 'did') {
            this.updateFilters();
        } else if (type === 'policyId') {

        }
        this.pageIndex = 0;
        this.router.navigate(['/audit'], {
            queryParams: {
                policyId: this.currentPolicy ? this.currentPolicy : '',
                owner: this.currentUser ? this.currentUser : ''
            }
        });
        this.loadVP();
    }

    onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadVP();
    }

    loadVP() {
        this.loading = true;
        this.auditService.getVpDocuments(this.currentPolicy, this.currentUser, this.pageIndex, this.pageSize)
            .subscribe((dataResponse: HttpResponse<any[]>) => {
                this.dataSource = dataResponse.body || [];
                this.dataCount = dataResponse.headers.get('X-Total-Count') || this.dataSource.length;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }

    loadData() {
        this.loading = true;
        this.dataCount = 0;
        this.pageIndex = 0;
        this.pageSize = 10;
        this.currentPolicy = this.route.snapshot.queryParams['policyId'] || '';
        this.currentUser = this.route.snapshot.queryParams['owner'] || '';
        forkJoin([
            this.auth.getStandardRegistries(),
            this.policyEngineService.all(),
            this.auditService.getVpDocuments(this.currentPolicy, this.currentUser, this.pageIndex, this.pageSize)
        ]).subscribe((value) => {
            const users: any = value[0];
            const policies: any = value[1];
            const dataResponse: any = value[2];
            this._users = users;
            this._policies = policies;
            this.dataSource = dataResponse.body || [];
            this.dataCount = dataResponse.headers.get('X-Total-Count') || this.dataSource.length;
            this.users = this._users?.filter(u => u.did);
            this.updateFilters();
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    updateFilters() {
        if (this.currentUser) {
            this.policies = this._policies?.filter(p => p.owner === this.currentUser);
        } else {
            this.policies = this._policies;
        }
        this.currentPolicy = this.policies.find(p => p.id == this.currentPolicy)?.id || '';
    }

    openVP(element: any) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            width: '850px',
            closable: true,
            header: 'VP',
            styleClass: 'custom-dialog',
            data: {
                id: element.id,
                dryRun: !!element.dryRunId,
                document: element.document,
                title: 'VP',
                type: 'VP',
                viewDocument: true
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    setFilter(type: string, value: string) {
        if (type == 'policyId') {
            this.currentPolicy = value;
            this.router.navigate(['/audit'], { queryParams: { policyId: value } });
            this.onFilter();
        }
        if (type == 'id') {
            this.router.navigate(['/trust-chain'], { queryParams: { search: value } });
        }
        if (type == 'hash') {
            this.router.navigate(['/trust-chain'], { queryParams: { search: value } });
        }
    }
}

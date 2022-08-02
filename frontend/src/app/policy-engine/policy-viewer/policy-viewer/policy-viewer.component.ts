import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IToken, IUser, PolicyType, UserRole } from '@guardian/interfaces';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subscription } from 'rxjs';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../../helpers/export-policy-dialog/export-policy-dialog.component';
import { NewPolicyDialog } from '../../helpers/new-policy-dialog/new-policy-dialog.component';
import { ImportPolicyDialog } from '../../helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from '../../helpers/preview-policy-dialog/preview-policy-dialog.component';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpResponse } from '@angular/common/http';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-policy-viewer',
    templateUrl: './policy-viewer.component.html',
    styleUrls: ['./policy-viewer.component.css']
})
export class PolicyViewerComponent implements OnInit, OnDestroy {
    policyId!: string;
    policy: any | null;
    policyInfo: any | null;
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    virtualUsers: any[] = []
    view: string = 'policy';
    documents: any[] = [];
    columns: string[] = [
        'createDate',
        'type',
        'owner',
        'document'
    ];
    pageIndex: number;
    pageSize: number;
    documentCount: any;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private toastr: ToastrService
    ) {
        this.policy = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.documentCount = 0;
    }

    ngOnInit() {
        this.loading = true;
        this.subscription.add(
            this.route.queryParams.subscribe(queryParams => {
                this.loadPolicy();
            })
        );

        this.subscription.add(
            this.wsService.subscribeUserInfo((message => {
                this.policyInfo.userRoles = [message.userRole];
            }))
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    loadPolicy() {
        const policyId = this.route.snapshot.params['id'];
        if (policyId && this.policyId == policyId) {
            return;
        }
        if (!policyId) {
            this.policyId = policyId;
            this.policy = null;
            this.policyInfo = null;
            this.loading = false;
            return;
        }

        this.policyId = policyId;
        this.policy = null;
        this.policyInfo = null;
        this.isConfirmed = false;
        this.loading = true;
        this.profileService.getProfile().subscribe((profile: IUser | null) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.role = profile ? profile.role : null;
            if (this.isConfirmed) {
                this.loadPolicyById(this.policyId);
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    loadPolicyById(policyId: string) {
        forkJoin([
            this.policyEngineService.policyBlock(policyId),
            this.policyEngineService.policy(policyId)
        ]).subscribe((value) => {
            this.policy = value[0];
            this.policyInfo = value[1];
            this.virtualUsers = [];
            if (this.policyInfo?.status === PolicyType.DRY_RUN) {
                this.policyEngineService.getVirtualUsers(this.policyInfo.id).subscribe((users) => {
                    this.virtualUsers = users;
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }, (e) => {
                    this.loading = false;
                });
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    createVirtualUser() {
        this.loading = true;
        this.policyEngineService.createVirtualUser(this.policyInfo.id).subscribe((users) => {
            this.virtualUsers = users;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    setVirtualUser(item: any) {
        this.loading = true;
        this.policyEngineService.loginVirtualUser(this.policyInfo.id, item.did).subscribe((users) => {
            this.virtualUsers = users;
            this.policy = null;
            this.policyInfo = null;
            this.loadPolicyById(this.policyId);
        }, (e) => {
            this.loading = false;
        });
    }

    restartDryRun() {
        this.loading = true;
        this.policyEngineService.restartDryRun(this.policyInfo.id).subscribe((users) => {
            this.policy = null;
            this.policyInfo = null;
            this.loadPolicyById(this.policyId);
        }, (e) => {
            this.loading = false;
        });
    }

    onView(view: string) {
        this.view = view;
        if (this.view !== 'policy') {
            this.loading = true;
            this.pageIndex = 0;
            this.pageSize = 100;
            this.policyEngineService.loadDocuments(
                this.policyInfo.id,
                this.view,
                this.pageIndex,
                this.pageSize
            ).subscribe((documents: HttpResponse<any[]>) => {
                this.documents = documents.body || [];
                this.documents = this.documents.map(d => this.setType(d));
                this.documentCount = documents.headers.get('X-Total-Count') || this.documents.length;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
        }
    }

    openDocument(element: any) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '900px',
            data: {
                document: element,
                title: 'Document',
                type: 'JSON',
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => { });
    }

    onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }

        this.loading = true;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.policyEngineService.loadDocuments(
            this.policyInfo.id,
            this.view,
            this.pageIndex,
            this.pageSize
        ).subscribe((documents: HttpResponse<any[]>) => {
            this.documents = documents.body || [];
            this.documents = this.documents.map(d => this.setType(d));
            this.documentCount = documents.headers.get('X-Total-Count') || this.documents.length;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    private setType(document: any) {
        if (this.view === 'documents') {
            if (document.dryRunClass === 'VcDocumentCollection') {
                document.__type = 'VC';
            } else if (document.dryRunClass === 'VpDocumentCollection') {
                document.__type = 'VP';
            } else if (document.dryRunClass === 'DidDocumentCollection') {
                document.__type = 'DID';
                document.owner = document.did;
            } else if (document.dryRunClass === 'ApprovalDocumentCollection') {
                document.__type = 'VC';
            }
        } else if (this.view === 'transactions') {
            document.__type = document.type;
            document.owner = document.hederaAccountId;
        } else if (this.view === 'ipfs') {
            document.__type = '';
        }
        return document;
    }
}

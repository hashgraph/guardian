import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, PolicyType } from '@guardian/interfaces';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subscription } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-policy-viewer',
    templateUrl: './policy-viewer.component.html',
    styleUrls: ['./policy-viewer.component.scss']
})
export class PolicyViewerComponent implements OnInit, OnDestroy {
    public policyId!: string;
    public policy: any | null;
    public policyInfo: any | null;
    public role!: any;
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public virtualUsers: any[] = []
    public view: string = 'policy';
    public documents: any[] = [];
    public columns: string[] = [];
    public columnsMap: any = {
        transactions: [
            'createDate',
            'type',
            'owner',
            'document'
        ],
        artifacts: [
            'createDate',
            'type',
            'owner',
            'document'
        ],
        ipfs: [
            'createDate',
            'size',
            'url',
            'document'
        ]
    };
    public pageIndex: number;
    public pageSize: number;
    public documentCount: any;
    public groups: any[] = [];
    public isMultipleGroups: boolean = false;
    public userRole!: string;
    public userGroup!: string;
    public recording: boolean = false;
    public running: boolean = false;
    public recordId: any;
    public recordItems: any[] = [];
    public recordLoading: boolean = true;
    public recordIndex: any;
    public recordStatus: string;
    public recordError: string;

    private subscription = new Subscription();

    public get isDryRun(): boolean {
        return this.policyInfo && this.policyInfo.status === 'DRY-RUN';
    }

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private toastr: ToastrService,
        private cdRef: ChangeDetectorRef
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
                const { userRole, userGroup, userGroups } = message;
                this.userRole = userRole;
                this.userGroup = userGroup?.groupLabel || userGroup?.uuid;
                this.groups = userGroups;
            }))
        );
        this.subscription.add(
            this.wsService.recordSubscribe((message => {
                this.updateRecordLogs(message);
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
            this.isMultipleGroups = false;
            this.policyInfo = null;
            this.loading = false;
            return;
        }

        this.policyId = policyId;
        this.policy = null;
        this.isMultipleGroups = false;
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
            this.policyEngineService.policy(policyId),
            this.policyEngineService.policyBlock(policyId),
            this.policyEngineService.getGroups(policyId)
        ]).subscribe((value) => {
            this.policyInfo = value[0];
            this.policy = value[1];
            this.groups = value[2] || [];

            this.virtualUsers = [];
            this.isMultipleGroups = !!(this.policyInfo?.policyGroups && this.groups?.length);
            this.userRole = this.policyInfo.userRole;
            this.userGroup = this.policyInfo.userGroup?.groupLabel || this.policyInfo.userGroup?.uuid;

            if (this.policyInfo?.status === PolicyType.DRY_RUN) {
                this.loadDryRunOptions();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    loadDryRunOptions() {
        forkJoin([
            this.policyEngineService.getVirtualUsers(this.policyInfo.id),
            this.policyEngineService.getRecordStatus(this.policyInfo.id)
        ]).subscribe((value) => {
            this.virtualUsers = value[0];
            const record = value[1];
            this.updateRecordLogs(record);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    setGroup(item: any) {
        this.loading = true;
        this.policyEngineService.setGroup(this.policyInfo.id, item ? item.uuid : null).subscribe(() => {
            this.policy = null;
            this.policyInfo = null;
            this.loadPolicyById(this.policyId);
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
            this.isMultipleGroups = false;
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
            this.isMultipleGroups = false;
            this.loadPolicyById(this.policyId);
        }, (e) => {
            this.loading = false;
        });
    }

    onView(view: string) {
        this.view = view;
        this.columns = this.columnsMap[this.view];
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
        let dialogRef;

        if (window.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
            dialogRef = this.dialog.open(VCViewerDialog, {
                width: `${window.innerWidth.toString()}px`,
                maxWidth: '100vw',
                height: `${window.innerHeight - headerHeight}px`,
                position: {
                    'bottom': '0'
                },
                panelClass: 'g-dialog',
                hasBackdrop: true, // Shadows beyond the dialog
                closeOnNavigation: true,
                disableClose: true,
                autoFocus: false,
                data: this
            });
        } else {
            dialogRef = this.dialog.open(VCViewerDialog, {
                width: '900px',
                panelClass: 'g-dialog',
                data: {
                    document: element,
                    title: 'Document',
                    type: 'JSON',
                },
                disableClose: true,
            });
        }
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
        if (this.view === 'artifacts') {
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

    public startRecord() {
        this.loading = true;
        this.recordItems = [];
        this.policyEngineService.startRecord(this.policyId).subscribe((result) => {
            this.recording = !!result;
            this.loading = false;
        }, (e) => {
            this.recording = true;
            this.loading = false;
        });
    }

    public startRun() {
        this.loading = true;
        this.recordItems = [];
        this.policyEngineService.startRun(this.policyId).subscribe((result) => {
            this.running = !!result;
            this.loading = false;
        }, (e) => {
            this.recording = true;
            this.loading = false;
        });
    }

    public stopRecord() {
        this.loading = true;
        this.recordItems = [];
        this.policyEngineService.stopRecord(this.policyId).subscribe((users) => {
            this.recording = false;
            this.running = false;
            this.loading = false;
        }, (e) => {
            this.recording = false;
            this.running = false;
            this.loading = false;
        });
    }

    public updateRecordLogs(data: any) {
        this.recording = false;
        this.running = false;
        this.recordId = null;
        if (data) {
            if (data.type === 'Running') {
                this.running = true;
                this.recordId = data.id;
                this.recordIndex = data.index - 1;
                this.recordStatus = data.status;
                this.recordError = data.error;
            }
            if (data.type === 'Recording') {
                this.recording = true;
                this.recordId = data.uuid;
                this.recordIndex = -1;
                this.recordStatus = data.status;
                this.recordError = data.error;
            }
        }
        console.log(this.running, this.recordStatus, this.recordIndex, this.recordError);
        if (this.recording || this.running) {
            this.recordLoading = true;
            this.policyEngineService.getRecordActions(this.policyId).subscribe((items) => {
                this.recordItems = items || [];
                const start = this.recordItems[0];
                const startTime = start?.time;
                for (const item of this.recordItems) {
                    item._time = this.convertMsToTime(item.time - startTime);
                }
                this.recordLoading = false;
            }, (e) => {
                this.recordLoading = false;
            });
        }
        if (this.running) {
            this.updatePolicy();
        }
    }

    updatePolicy() {
        forkJoin([
            this.policyEngineService.getVirtualUsers(this.policyId),
            this.policyEngineService.policyBlock(this.policyId),
            this.policyEngineService.policy(this.policyId),
        ]).subscribe((value) => {
            this.policy = null;
            this.cdRef.detectChanges();
            this.virtualUsers = value[0];
            this.policy = value[1];
            this.policyInfo = value[2];
            this.isMultipleGroups = !!(this.policyInfo?.policyGroups && this.groups?.length);
            this.userRole = this.policyInfo.userRole;
            this.userGroup = this.policyInfo.userGroup?.groupLabel || this.policyInfo.userGroup?.uuid;
            this.cdRef.detectChanges();
        }, (e) => {
            this.loading = false;
        });
    }

    private padTo2Digits(num: number): string {
        return num.toString().padStart(2, '0');
    }

    private convertMsToTime(milliseconds: number): string {
        if (Number.isNaN(milliseconds)) {
            return ''
        }
        let seconds = Math.floor(milliseconds / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);

        seconds = seconds % 60;
        minutes = minutes % 60;

        return `${hours}:${this.padTo2Digits(minutes)}:${this.padTo2Digits(seconds)}`;
    }

    public loadRecord() {
        this.loading = true;
        this.policyEngineService.exportRecord(this.policyId, this.recordId)
            .subscribe(fileBuffer => {
                let downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-policy-record'
                    })
                );
                downloadLink.setAttribute('download', `record_${Date.now()}.record`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, error => {
                this.loading = false;
            });
    }
}

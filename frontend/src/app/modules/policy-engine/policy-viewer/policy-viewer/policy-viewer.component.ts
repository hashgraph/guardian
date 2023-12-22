import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
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
import { IStep } from '../../structures';
import { PolicyProgressService } from '../../services/policy-progress.service';
import { DialogService } from 'primeng/dynamicdialog';

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-policy-viewer',
    templateUrl: './policy-viewer.component.html',
    styleUrls: ['./policy-viewer.component.scss'],
})
export class PolicyViewerComponent implements OnInit, OnDestroy {
    policyId!: string;
    policy: any | null;
    policyInfo: any | null;
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    virtualUsers: any[] = [];
    view: string = 'policy';
    documents: any[] = [];
    columns: string[] = [];
    columnsMap: any = {
        transactions: ['createDate', 'type', 'owner', 'document'],
        artifacts: ['createDate', 'type', 'owner', 'document'],
        ipfs: ['createDate', 'size', 'url', 'document'],
    };
    pageIndex: number;
    pageSize: number;
    documentCount: any;
    groups: any[] = [];
    isMultipleGroups: boolean = false;
    userRole!: string;
    userGroup!: string;

    steps: IStep[] = [];

    private subscription = new Subscription();

    public innerWidth: any;
    public innerHeight: any;

    public navigationFooterDisabled = false;
    public prevButtonDisabled = false;
    public nextButtonDisabled = false;

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
        private dialogService: DialogService,
        private toastr: ToastrService,
        private policyProgressService: PolicyProgressService,
        private changeDetector: ChangeDetectorRef,
    ) {
        this.policy = null;
        this.pageIndex = 0;
        this.pageSize = 10;
        this.documentCount = 0;
    }

    ngOnInit() {
        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
        this.loading = true;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadPolicy();
            })
        );

        this.subscription.add(
            this.wsService.subscribeUserInfo((message) => {
                const { userRole, userGroup, userGroups } = message;
                this.userRole = userRole;
                this.userGroup = userGroup?.groupLabel || userGroup?.uuid;
                this.groups = userGroups;
            })
        );

        this.updateNavigationButtons();
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
        this.profileService.getProfile().subscribe(
            (profile: IUser | null) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.role = profile ? profile.role : null;
                if (this.isConfirmed) {
                    this.loadPolicyById(this.policyId);
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }
            },
            (e) => {
                this.loading = false;
            }
        );
    }

    loadPolicyById(policyId: string) {
        forkJoin([
            this.policyEngineService.policyBlock(policyId),
            this.policyEngineService.policy(policyId),
            this.policyEngineService.getGroups(policyId),
        ]).subscribe(
            (value) => {
                this.policy = value[0];
                this.policyInfo = value[1];
                this.groups = value[2] || [];

                this.virtualUsers = [];
                this.isMultipleGroups = !!(
                    this.policyInfo?.policyGroups && this.groups?.length
                );

                this.userRole = this.policyInfo.userRole;
                this.userGroup =
                    this.policyInfo.userGroup?.groupLabel ||
                    this.policyInfo.userGroup?.uuid;

                if (this.policyInfo?.status === PolicyType.DRY_RUN) {
                    this.policyEngineService
                        .getVirtualUsers(this.policyInfo.id)
                        .subscribe(
                            (users) => {
                                this.virtualUsers = users;
                                setTimeout(() => {
                                    this.loading = false;
                                }, 500);
                            },
                            (e) => {
                                this.loading = false;
                            }
                        );
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }

                this.policyProgressService.updateData({role: this.policyInfo.userRole});

                this.policyProgressService.data$.subscribe((data: any) => {
                    this.policyEngineService.getPolicyNavigation(policyId).subscribe((data: any) => {
                        this.updatePolicyProgress(data);

                        if (data && data.length > 0) {
                            this.policyProgressService.setHasNavigation(true);
                        } else {
                            // this.policyProgressService.setHasNavigation(false);
                        }
                    })
                })
            },
            (e) => {
                this.loading = false;
            }
        );
    }

    updatePolicyProgress(navigation: any) {
        if (navigation && navigation.length > 0) {
            this.steps = navigation.map((step: any, index: number) => {
                return {
                    index,
                    level: step.level,
                    label: step.name,
                    blockTag: step.block,
                    blockId: step.uuid,
                    hasAction: false,
                };
            })
            this.updateNavigationButtons();
        } else {
            this.steps = [];
        }
    }

    setGroup(item: any) {
        this.loading = true;
        this.policyEngineService
            .setGroup(this.policyInfo.id, item ? item.uuid : null)
            .subscribe(
                () => {
                    this.policy = null;
                    this.policyInfo = null;
                    this.loadPolicyById(this.policyId);
                },
                (e) => {
                    this.loading = false;
                }
            );
    }

    createVirtualUser() {
        this.loading = true;
        this.policyEngineService
            .createVirtualUser(this.policyInfo.id)
            .subscribe(
                (users) => {
                    this.virtualUsers = users;
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                (e) => {
                    this.loading = false;
                }
            );
    }

    setVirtualUser(item: any) {
        this.loading = true;
        this.policyEngineService
            .loginVirtualUser(this.policyInfo.id, item.did)
            .subscribe(
                (users) => {
                    this.virtualUsers = users;
                    this.policy = null;
                    this.policyInfo = null;
                    this.isMultipleGroups = false;
                    this.loadPolicyById(this.policyId);
                },
                (e) => {
                    this.loading = false;
                }
            );
    }

    restartDryRun() {
        this.loading = true;
        this.policyEngineService.restartDryRun(this.policyInfo.id).subscribe(
            (users) => {
                this.policy = null;
                this.policyInfo = null;
                this.isMultipleGroups = false;
                this.loadPolicyById(this.policyId);
            },
            (e) => {
                this.loading = false;
            }
        );
    }

    onView(view: string) {
        this.view = view;
        this.columns = this.columnsMap[this.view];
        if (this.view !== 'policy') {
            this.loading = true;
            this.pageIndex = 0;
            this.pageSize = 10;
            this.policyEngineService
                .loadDocuments(
                    this.policyInfo.id,
                    this.view,
                    this.pageIndex,
                    this.pageSize
                )
                .subscribe(
                    (documents: HttpResponse<any[]>) => {
                        this.documents = documents.body || [];
                        this.documents = this.documents.map((d) =>
                            this.setType(d)
                        );
                        this.documentCount =
                            documents.headers.get('X-Total-Count') ||
                            this.documents.length;

                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    (e) => {
                        this.loading = false;
                    }
                );
        }
    }

    openDocument(element: any) {
        let dialogRef;

        if (this.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(
                bodyStyles.getPropertyValue('--header-height')
            );
            dialogRef = this.dialogService.open(VCViewerDialog, {
                width: `${this.innerWidth.toString()}px`,
                header: 'Document',
                styleClass: 'custom-dialog',
                data: this,
            });
        } else {
            dialogRef = this.dialogService.open(VCViewerDialog, {
                header: 'Document',
                width: '900px',
                styleClass: 'custom-dialog',
                data: {
                    document: element,
                    title: 'Document',
                    type: 'JSON',
                },
            });
        }
        dialogRef.onClose.subscribe(async (result) => {
        });
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
        this.policyEngineService
            .loadDocuments(
                this.policyInfo.id,
                this.view,
                this.pageIndex,
                this.pageSize
            )
            .subscribe(
                (documents: HttpResponse<any[]>) => {
                    this.documents = documents.body || [];
                    this.documents = this.documents.map((d) => this.setType(d));
                    this.documentCount =
                        documents.headers.get('X-Total-Count') ||
                        this.documents.length;
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                (e) => {
                    this.loading = false;
                }
            );
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

    newOnPage() {
        this.pageIndex = 0;

        this.loading = true;
        this.policyEngineService
            .loadDocuments(
                this.policyInfo.id,
                this.view,
                this.pageIndex,
                this.pageSize
            )
            .subscribe(
                (documents: HttpResponse<any[]>) => {
                    this.documents = documents.body || [];
                    this.documents = this.documents.map((d) => this.setType(d));
                    this.documentCount =
                        documents.headers.get('X-Total-Count') ||
                        this.documents.length;
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                (e) => {
                    this.loading = false;
                }
            );
    }

    movePageIndex(inc: number) {
        const exec = () => {
            this.loading = true;
            this.policyEngineService
                .loadDocuments(
                    this.policyInfo.id,
                    this.view,
                    this.pageIndex,
                    this.pageSize
                )
                .subscribe(
                    (documents: HttpResponse<any[]>) => {
                        this.documents = documents.body || [];
                        this.documents = this.documents.map((d) => this.setType(d));
                        this.documentCount =
                            documents.headers.get('X-Total-Count') ||
                            this.documents.length;
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    (e) => {
                        this.loading = false;
                    }
                );
        }

        if (inc > 0 && this.pageIndex < (this.documentCount / this.pageSize) - 1) {
            this.pageIndex += 1;
            exec();
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            exec();
        }
    }

    updateNavigationButtons() {
        const progressFooter = document.getElementById('block-progress-footer');
        if (!progressFooter) {
            this.navigationFooterDisabled = false;
        } else {
            this.navigationFooterDisabled = true;
        }

        this.prevButtonDisabled = true;
        this.nextButtonDisabled = true;
        const currentStepIndex = this.policyProgressService.getCurrentStepIndex();
        for (let i = (currentStepIndex - 1); i >= 0; i--) {
            const step = this.steps[i];
            if (!step.blockId) {
                continue;
            }
            const hasAction = this.policyProgressService.stepHasAction(step.blockId);

            if (step.level == 1 && hasAction) {
                this.prevButtonDisabled = false;
            }
        }
        for (let i = (currentStepIndex + 1); i < this.steps.length; i++) {
            const step = this.steps[i];
            if (!step.blockId) {
                continue;
            }
            const hasAction = this.policyProgressService.stepHasAction(step.blockId);

            if (step.level == 1 && hasAction) {
                this.nextButtonDisabled = false;
            }
        }
    }

    onNavigationPrevButton() {
        const currentStepIndex = this.policyProgressService.getCurrentStepIndex();
        for (let i = (currentStepIndex - 1); i >= 0; i--) {
            const step = this.steps[i];
            const hasAction = this.policyProgressService.stepHasAction(step.blockId);

            if (step.level == 1 && hasAction) {
                this.policyProgressService.runStepAction(step.blockId);
                break;
            }
        }
    }

    onNavigationNextButton() {
        const currentStepIndex = this.policyProgressService.getCurrentStepIndex();
        for (let i = (currentStepIndex + 1); i < this.steps.length; i++) {
            const step = this.steps[i];
            const hasAction = this.policyProgressService.stepHasAction(step.blockId);

            if (step.level == 1 && hasAction) {
                this.policyProgressService.runStepAction(step.blockId);
                break;
            }
        }
    }
}

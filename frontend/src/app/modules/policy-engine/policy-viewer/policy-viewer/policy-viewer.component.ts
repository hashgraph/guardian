import { HttpResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { forkJoin, interval, Subscription } from 'rxjs';
import { audit } from 'rxjs/operators';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { RecordControllerComponent } from '../../record/record-controller/record-controller.component';
import { PolicyProgressService } from '../../services/policy-progress.service';
import { IStep } from '../../structures';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';

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
    private subscription = new Subscription();
    public savePointState: boolean = false;
    public policyId!: string;
    public policy: any | null;
    public policyInfo: any | null;
    public role!: any;
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public virtualUsers: any[] = [];
    public view: string = 'policy';
    public documents: any[] = [];
    public columns: string[] = [];
    public columnsMap: any = {
        transactions: ['createDate', 'type', 'owner', 'document'],
        artifacts: ['createDate', 'type', 'owner', 'document'],
        ipfs: ['createDate', 'size', 'url', 'document'],
    };
    public pageIndex: number;
    public pageSize: number;
    public documentCount: any;
    public groups: any[] = [];
    public isMultipleGroups: boolean = false;
    public userRole!: string;
    public userGroup!: string;
    public recordingActive: boolean = false;
    public steps: IStep[] = [];
    public navigationFooterDisabled = false;
    public prevButtonDisabled = false;
    public nextButtonDisabled = false;
    public permissions: UserPermissions;
    public newRequestsExist: boolean = false;
    public newActionsExist: boolean = false;

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private route: ActivatedRoute,
        private dialogService: DialogService,
        private policyProgressService: PolicyProgressService,
        private externalPoliciesService: ExternalPoliciesService,
        private changeDetector: ChangeDetectorRef,
        private router: Router
    ) {
        this.policy = null;
        this.pageIndex = 0;
        this.pageSize = 10;
        this.documentCount = 0;
    }

    public get isDryRun(): boolean {
        return (
            this.policyInfo &&
            (
                this.policyInfo.status === PolicyStatus.DRY_RUN ||
                this.policyInfo.status === PolicyStatus.DEMO
            )
        );
    }

    private _recordController!: RecordControllerComponent | undefined;

    @ViewChild('recordController')
    public set recordController(value: RecordControllerComponent | undefined) {
        this._recordController = value;
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

    private getSavepointState() {
        if (!this.isDryRun) {
            return;
        }
        this.policyEngineService
            .getSavepointState(this.policyInfo.id)
            .subscribe((value) => {
                this.savePointState = value.state;
            }, (e) => {
                this.savePointState = false;
            });
    }

    ngOnInit() {
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
        this.subscription.add(
            this.wsService.requestSubscribe((message) => {
                if (message?.data?.policyId === this.policyId && this.isConfirmed) {
                    this.updateRemotePolicyRequests();
                }
            })
        );

        this.subscription.add(
            this.wsService.restoreSubscribe((message) => {
                if (message?.data?.policyId === this.policyId && this.isConfirmed) {
                    this.loadPolicyById(this.policyId);
                }
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
        this.recordingActive = false;
        this.profileService.getProfile().subscribe(
            (profile: IUser | null) => {
                this.permissions = new UserPermissions(profile);
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
            this.policyEngineService.getGroups(policyId),
            this.externalPoliciesService.getActionRequestsCount({ policyId })
        ]).subscribe(
            (value) => {
                this.policyInfo = value[0];
                this.policy = value[1];
                this.groups = value[2] || [];
                const count: any = value[3]?.body || {};

                this.virtualUsers = [];
                this.isMultipleGroups = !!(this.policyInfo?.policyGroups && this.groups?.length);

                this.userRole = this.policyInfo.userRole;
                this.userGroup = this.policyInfo.userGroup?.groupLabel || this.policyInfo.userGroup?.uuid;

                if (this.policyInfo?.status === PolicyStatus.DRY_RUN
                    || this.policyInfo?.status === PolicyStatus.DEMO
                ) {
                    this.loadDryRunOptions();
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }

                this.policyProgressService.updateData({ role: this.policyInfo.userRole });

                this.policyProgressService.data$.pipe(audit(ev => interval(1000))).subscribe(() => {
                    this.policyEngineService.getPolicyNavigation(policyId).subscribe((data: any) => {
                        this.updatePolicyProgress(data);
                        if (data && data.length > 0) {
                            this.policyProgressService.setHasNavigation(true);
                        } else {
                            // this.policyProgressService.setHasNavigation(false);
                        }
                    })
                })
                this.getSavepointState();

                this.newRequestsExist = count.requestsCount > 0;
                this.newActionsExist = count.actionsCount > 0;
            }, (e) => {
                this.loading = false;
            });
    }

    loadDryRunOptions() {
        this.policyEngineService.getVirtualUsers(this.policyInfo.id).subscribe((value) => {
            this.virtualUsers = value;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
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

    setGroup(item: any, group: any) {
        group?.toggle(false);
        this.loading = true;
        this.policyEngineService
            .setGroup(this.policyInfo.id, item ? item.uuid : null)
            .subscribe(
                () => {
                    this.policy = null;
                    this.policyInfo = null;
                    this.loadPolicyById(this.policyId);
                }, (e) => {
                    this.loading = false;
                });
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
                }, (e) => {
                    this.loading = false;
                });
    }

    setVirtualUser(item: any, menu: any) {
        menu?.toggle(false)
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
                }, (e) => {
                    this.loading = false;
                });
    }

    public createSavepoint() {
        this.loading = true;
        this.policyEngineService.createSavepoint(this.policyInfo.id).subscribe(() => {
            this.loadPolicyById(this.policyId);
            this.getSavepointState();
        }, (e) => {
            this.loading = false;
        }
        );
    }

    public deleteSavepoint() {
        this.loading = true;
        this.policyEngineService.deleteSavepoint(this.policyInfo.id).subscribe(() => {
            this.loadPolicyById(this.policyId);
        }, (e) => {
            this.loading = false;
        }
        );
    }

    public restoreSavepoint() {
        this.loading = true;
        this.policyEngineService.restoreSavepoint(this.policyInfo.id).subscribe(() => {
            this.policy = null;
            this.policyInfo = null;
            this.isMultipleGroups = false;
            this.loadPolicyById(this.policyId);
        }, (e) => {
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
            this.pageSize = 10;
            this.policyEngineService
                .loadDocuments(
                    this.policyInfo.id,
                    this.view,
                    this.pageIndex,
                    this.pageSize
                ).subscribe(
                    (documents: HttpResponse<any[]>) => {
                        this.documents = documents.body || [];
                        this.documents = this.documents.map((d) => this.setType(d));
                        this.documentCount =
                            documents.headers.get('X-Total-Count') ||
                            this.documents.length;

                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    }, (e) => {
                        this.loading = false;
                    });
        }
    }

    public openDocument(element: any) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                document: element,
                title: 'Document',
                type: 'JSON',
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onPage(event: any): void {
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
            if (!step || !step.blockId) {
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

    public updatePolicy() {
        forkJoin([
            this.policyEngineService.getVirtualUsers(this.policyId),
            this.policyEngineService.policyBlock(this.policyId),
            this.policyEngineService.policy(this.policyId),
        ]).subscribe((value) => {
            this.policy = null;
            this.changeDetector.detectChanges();
            this.virtualUsers = value[0];
            this.policy = value[1];
            this.policyInfo = value[2];
            this.isMultipleGroups = !!(this.policyInfo?.policyGroups && this.groups?.length);
            this.userRole = this.policyInfo.userRole;
            this.userGroup = this.policyInfo.userGroup?.groupLabel || this.policyInfo.userGroup?.uuid;
            this.changeDetector.detectChanges();
        }, (e) => {
            this.loading = false;
        });
    }

    public startRecord() {
        this.recordingActive = true;
        this._recordController?.startRecording();
    }

    public runRecord() {
        this.recordingActive = true;
        this._recordController?.runRecord();
    }

    public onBack() {
        this.router.navigate(['/policy-viewer']);
    }

    public onPolicyRequests() {
        this.router.navigate([`/policy-requests`], { queryParams: { policyId: this.policyId } });
    }

    private updateRemotePolicyRequests() {
        this.externalPoliciesService.getActionRequestsCount().subscribe((response) => {
            if (response?.body) {
                this.newRequestsExist = response.body.requestsCount > 0;
                this.newActionsExist = response.body.actionsCount > 0;
            }
        })
    }
}

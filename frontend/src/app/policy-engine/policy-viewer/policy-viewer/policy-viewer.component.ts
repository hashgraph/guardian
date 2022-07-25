import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IToken, IUser, UserRole } from '@guardian/interfaces';
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
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';

enum OperationMode {
    none,
    create,
    import,
    publish,
}

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
    policies: any[] | null;
    columns: string[] = [];
    columnsRole: any = {};
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    pageIndex: number;
    pageSize: number;
    policyCount: any;

    mode: OperationMode = OperationMode.none;
    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private toastr: ToastrService,
        private taskService: TasksService,
        private informService: InformService
    ) {
        this.policies = null;
        this.policy = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.policyCount = 0;
        this.columnsRole = {};
        this.columnsRole[UserRole.STANDARD_REGISTRY] = [
            'name',
            'description',
            'roles',
            'topic',
            'schemas',
            'version',
            'status',
            'operation',
            'export',
            'edit',
            'open'
        ]
        this.columnsRole[UserRole.USER] = [
            'name',
            'description',
            'roles',
            'version',
            'open',
        ]
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
        const policyId = this.route.snapshot.queryParams['policyId'];
        if (policyId && this.policyId == policyId) {
            return;
        }

        this.policyId = policyId;
        this.policies = null;
        this.policy = null;
        this.isConfirmed = false;
        this.loading = true;
        this.profileService.getProfile().subscribe((profile: IUser | null) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.role = profile ? profile.role : null;
            if (this.role == UserRole.STANDARD_REGISTRY) {
                this.columns = this.columnsRole[UserRole.STANDARD_REGISTRY];
            } else {
                this.columns = this.columnsRole[UserRole.USER];
            }
            if (this.isConfirmed) {
                if (this.policyId) {
                    this.loadPolicyById(this.policyId);
                } else {
                    this.loadAllPolicy();
                }
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
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    loadAllPolicy() {
        this.loading = true;
        this.policyEngineService.page(this.pageIndex, this.pageSize).subscribe((policiesResponse) => {
            this.policies = policiesResponse.body || [];
            this.policyCount = policiesResponse.headers.get('X-Total-Count') || this.policies.length;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
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
        this.loadAllPolicy();
    }

    onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.taskId = undefined;
        this.mode = OperationMode.none;
        this.loadAllPolicy();
    }

    onAsyncCompleted() {
        switch (this.mode) {
            case OperationMode.create:
            case OperationMode.import:
                this.taskId = undefined;
                this.mode = OperationMode.none;
                this.loadAllPolicy();
                break;
            case OperationMode.publish:
                if (this.taskId) {
                    const taskId = this.taskId;
                    this.taskId = undefined;
                    this.processPublishResult(taskId);
                }
                break;
            default:
                console.log(`Not allowed mode ${this.mode}`);
                break;
        }

        this.mode = OperationMode.none;
    }

    newPolicy() {
        const dialogRef = this.dialog.open(NewPolicyDialog, {
            width: '500px',
            data: {}
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            debugger;
            if (result) {
                this.loading = true;
                this.policyEngineService.pushCreate(result).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.taskId = taskId;
                    this.expectedTaskMessages = expectation;
                    this.mode = OperationMode.create;
                }, (e) => {
                    this.loading = false;
                    this.taskId = undefined;
                    this.mode = OperationMode.none;
                });
            }
        });
    }

    setVersion(element: any) {
        const dialogRef = this.dialog.open(SetVersionDialog, {
            width: '350px',
            data: {}
        });
        dialogRef.afterClosed().subscribe((version) => {
            if (version) {
                this.publish(element, version);
            }
        });
    }

    private publish(element: any, version: string) {
        this.loading = true;
        this.policyEngineService.pushPublish(element.id, version).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.mode = OperationMode.publish;
        });
    }

    exportPolicy(element: any) {
        this.policyEngineService.exportInMessage(element.id)
            .subscribe(exportedPolicy => this.dialog.open(ExportPolicyDialog, {
                width: '700px',
                panelClass: 'g-dialog',
                data: {
                    policy: exportedPolicy
                },
                autoFocus: false
            }));
    }

    importPolicy(messageId?: string) {
        const dialogRef = this.dialog.open(ImportPolicyDialog, {
            width: '500px',
            autoFocus: false,
            data: {
                timeStamp: messageId
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.importPolicyDetails(result);
            }
        });
    }

    importPolicyDetails(result: any) {
        const { type, data, policy } = result;
        const distinctPolicies = this.getDistinctPolicy();
        const dialogRef = this.dialog.open(PreviewPolicyDialog, {
            width: '950px',
            panelClass: 'g-dialog',
            data: {
                policy: policy,
                policies: distinctPolicies
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                if (result.messageId) {
                    this.importPolicy(result.messageId);
                    return;
                }

                let versionOfTopicId = result.versionOfTopicId || null;
                this.loading = true;
                if (type == 'message') {
                    this.policyEngineService.pushImportByMessage(data, versionOfTopicId).subscribe(
                        (result) => {
                            const { taskId, expectation } = result;
                            this.taskId = taskId;
                            this.expectedTaskMessages = expectation;
                            this.mode = OperationMode.import;
                        },
                        (e) => {
                            this.loading = false;
                            this.taskId = undefined;
                            this.mode = OperationMode.none;
                        });
                } else if (type == 'file') {
                    this.policyEngineService.pushImportByFile(data, versionOfTopicId).subscribe(
                        (result) => {
                            const { taskId, expectation } = result;
                            this.taskId = taskId;
                            this.expectedTaskMessages = expectation;
                            this.mode = OperationMode.import;
                        },
                        (e) => {
                            this.loading = false;
                            this.taskId = undefined;
                            this.mode = OperationMode.none;
                        });
                }
            }
        });
    }

    private getDistinctPolicy(): any[] {
        const policyByTopic: any = {};
        if (this.policies) {
            for (let i = 0; i < this.policies.length; i++) {
                const policy = this.policies[i];
                if (policy.topicId) {
                    if (!policyByTopic.hasOwnProperty(policy.topicId)) {
                        policyByTopic[policy.topicId] = policy;
                    } else if (policyByTopic[policy.topicId].createDate > policy.createDate) {
                        policyByTopic[policy.topicId] = policy;
                    }
                }
            }
        }
        return Object.values(policyByTopic)
            .sort((a: any, b: any) => a.createDate > b.createDate ? -1 : (b.createDate > a.createDate ? 1 : 0));
    }

    private processPublishResult(taskId: string): void {
        this.taskService.get(taskId).subscribe((task: any) => {
            const { result } = task;
            if (result) {
                const { isValid, errors } = result;
                if (!isValid) {
                    let text = [];
                    const blocks = errors.blocks;
                    const invalidBlocks = blocks.filter(
                        (block: any) => !block.isValid
                    );
                    for (let i = 0; i < invalidBlocks.length; i++) {
                        const block = invalidBlocks[i];
                        for (
                            let j = 0;
                            j < block.errors.length;
                            j++
                        ) {
                            const error = block.errors[j];
                            text.push(
                                `<div>${block.id}: ${error}</div>`
                            );
                        }
                    }
                    this.toastr.error(
                        text.join(''),
                        'The policy is invalid',
                        {
                            timeOut: 30000,
                            closeButton: true,
                            positionClass: 'toast-bottom-right',
                            enableHtml: true,
                        }
                    );
                }
                this.loadAllPolicy();
            }
        });
    }
}

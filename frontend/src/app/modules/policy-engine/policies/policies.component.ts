import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, Schema, SchemaHelper, TagType, Token, UserRole } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../helpers/export-policy-dialog/export-policy-dialog.component';
import { NewPolicyDialog } from '../helpers/new-policy-dialog/new-policy-dialog.component';
import { ImportPolicyDialog } from '../helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from '../helpers/preview-policy-dialog/preview-policy-dialog.component';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';
import { ConfirmationDialogComponent } from 'src/app/modules/common/confirmation-dialog/confirmation-dialog.component';
import { MultiPolicyDialogComponent } from '../helpers/multi-policy-dialog/multi-policy-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { ComparePolicyDialog } from '../helpers/compare-policy-dialog/compare-policy-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { SetVersionDialog } from '../../schema-engine/set-version-dialog/set-version-dialog.component';
import { forkJoin } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { WizardMode, WizardService } from 'src/app/modules/policy-engine/services/wizard.service';

enum OperationMode {
    None,
    Create,
    Import,
    Publish,
    Delete,
    WizardCreate
}

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-policies',
    templateUrl: './policies.component.html',
    styleUrls: ['./policies.component.css']
})
export class PoliciesComponent implements OnInit, OnDestroy {
    policies: any[] | null;
    columns: string[] = [];
    columnsRole: any = {};
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    pageIndex: number;
    pageSize: number;
    policyCount: any;
    owner: any;
    tagEntity = TagType.Policy;
    tagSchemas: any[] = [];

    saveWizardState: boolean = false;

    mode: OperationMode = OperationMode.None;
    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;

    publishMenuOption = [{
        id: 'Publish',
        title: 'Publish',
        description: 'Release version into public domain.',
        color: '#4caf50'
    }, {
        id: 'Dry-run',
        title: 'Dry Run',
        description: 'Run without making any persistent changes or executing transaction.',
        color: '#3f51b5'
    }];

    draftMenuOption = [{
        id: 'Draft',
        title: 'Stop',
        description: 'Return to editing.',
        color: '#9c27b0'
    }, {
        id: 'Publish',
        title: 'Publish',
        description: 'Release version into public domain.',
        color: '#4caf50'
    }];

    publishErrorMenuOption = [
        // {
        //     id: 'Draft',
        //     title: 'Stop',
        //     description: 'Return to editing.',
        //     color: '#9c27b0'
        // },
        {
            id: 'Publish',
            title: 'Publish',
            description: 'Release version into public domain.',
            color: '#4caf50'
        }
    ];

    public innerWidth: any;
    public innerHeight: any;

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private taskService: TasksService,
        private informService: InformService,
        private toastr: ToastrService,
        private schemaService: SchemaService,
        private wizardService: WizardService,
    ) {
        this.policies = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.policyCount = 0;
        this.columnsRole = {};
        this.columnsRole[UserRole.STANDARD_REGISTRY] = [
            'name',
            'description',
            'roles',
            'topic',
            'version',
            'tags',
            'tokens',
            'schemas',
            'status',
            'instance',
            'operations'
        ]
        this.columnsRole[UserRole.USER] = [
            'name',
            'description',
            'roles',
            'version',
            'tags',
            'instance',
        ]
    }

    ngOnInit() {
        this.loading = true;
        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
        this.loadPolicy();
    }

    ngOnDestroy() {

    }

    loadPolicy() {
        this.policies = null;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const profile: IUser | null = value[0];
            const tagSchemas: any[] = value[1] || [];

            this.isConfirmed = !!(profile && profile.confirmed);
            this.role = profile ? profile.role : null;
            this.owner = profile?.did;
            this.tagSchemas = SchemaHelper.map(tagSchemas);

            if (this.role == UserRole.STANDARD_REGISTRY) {
                this.columns = this.columnsRole[UserRole.STANDARD_REGISTRY];
            } else {
                this.columns = this.columnsRole[UserRole.USER];
            }
            if (this.isConfirmed) {
                this.loadAllPolicy();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    loadAllPolicy() {
        this.loading = true;
        this.policyEngineService.page(this.pageIndex, this.pageSize).subscribe((policiesResponse) => {
            this.policies = policiesResponse.body || [];
            this.policyCount = policiesResponse.headers.get('X-Total-Count') || this.policies.length;
            const ids = this.policies.map(e => e.id);
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                if (this.policies) {
                    for (const policy of this.policies) {
                        (policy as any)._tags = data[policy.id];
                    }
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
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
        this.mode = OperationMode.None;
        this.loadAllPolicy();
    }

    onAsyncCompleted() {
        switch (this.mode) {
            case OperationMode.Delete:
            case OperationMode.Create:
            case OperationMode.Import:
                this.taskId = undefined;
                this.mode = OperationMode.None;
                this.loadAllPolicy();
                break;
            case OperationMode.Publish:
                if (this.taskId) {
                    const taskId = this.taskId;
                    this.taskId = undefined;
                    this.processPublishResult(taskId);
                }
                break;
            case OperationMode.WizardCreate:
                if (this.taskId) {
                    const taskId = this.taskId;
                    this.taskId = undefined;
                    this.processCreateWizardResult(taskId);
                    this.mode = OperationMode.None;
                    this.loadAllPolicy();
                }
                break;
            default:
                console.log(`Not allowed mode ${this.mode}`);
                break;
        }

        this.mode = OperationMode.None;
    }

    dryRun(element: any) {
        this.loading = true;
        this.policyEngineService.dryRun(element.id).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            if (!isValid) {
                let text = [];
                const blocks = errors.blocks;
                const invalidBlocks = blocks.filter((block: any) => !block.isValid);
                for (let i = 0; i < invalidBlocks.length; i++) {
                    const block = invalidBlocks[i];
                    for (let j = 0; j < block.errors.length; j++) {
                        const error = block.errors[j];
                        if (block.id) {
                            text.push(`<div>${block.id}: ${error}</div>`);
                        } else {
                            text.push(`<div>${error}</div>`);
                        }
                    }
                }
                this.informService.errorMessage(text.join(''), 'The policy is invalid');
            }
            this.loadAllPolicy();
        }, (e) => {
            this.loading = false;
        });
    }

    draft(element: any) {
        this.loading = true;
        this.policyEngineService.draft(element.id).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            this.loadAllPolicy();
        }, (e) => {
            this.loading = false;
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
            this.mode = OperationMode.Publish;
        }, (e) => {
            this.loading = false;
        });
    }

    deletePolicy(element: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete policy',
                dialogText: !element.previousVersion
                    ? 'Are you sure to delete policy with related schemas?'
                    : 'Are you sure to delete policy?'
            },
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;
            this.policyEngineService.pushDelete(element.id).subscribe((result) => {
                const { taskId, expectation } = result;
                this.taskId = taskId;
                this.expectedTaskMessages = expectation;
                this.mode = OperationMode.Delete;
            }, (e) => {
                this.loading = false;
            });
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
        let dialogRef;
        if (this.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
            dialogRef = this.dialog.open(PreviewPolicyDialog, {
                width: `${this.innerWidth.toString()}px`,
                maxWidth: '100vw',
                height: `${this.innerHeight - headerHeight}px`,
                position: {
                    'bottom': '0'
                },
                panelClass: 'g-dialog',
                hasBackdrop: true, // Shadows beyond the dialog
                closeOnNavigation: true,
                autoFocus: false,
                data: {
                    policy: policy,
                    policies: distinctPolicies
                }
            });
        } else {
            dialogRef = this.dialog.open(PreviewPolicyDialog, {
                width: '950px',
                panelClass: 'g-dialog',
                data: {
                    policy: policy,
                    policies: distinctPolicies
                }
            });
        }
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
                            this.mode = OperationMode.Import;
                        }, (e) => {
                            this.loading = false;
                        });
                } else if (type == 'file') {
                    this.policyEngineService.pushImportByFile(data, versionOfTopicId).subscribe(
                        (result) => {
                            const { taskId, expectation } = result;
                            this.taskId = taskId;
                            this.expectedTaskMessages = expectation;
                            this.mode = OperationMode.Import;
                        }, (e) => {
                            this.loading = false;
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

    onPublishAction(event: any, element: any) {
        if (event.id === 'Publish') {
            this.setVersion(element);
        } else if (event.id === 'Dry-run') {
            this.dryRun(element);
        }
    }

    onDryRunAction(event: any, element: any) {
        if (event.id === 'Publish') {
            this.setVersion(element);
        } else if (event.id === 'Draft') {
            this.draft(element);
        }
    }
    onPublishErrorAction(event: any, element: any) {
        if (event.id === 'Publish') {
            this.setVersion(element);
        }
        // else if (event.id === 'Draft') {
        //     this.draft(element);
        // }
    }

    private processCreateWizardResult(taskId: string): void {
        this.taskService.get(taskId).subscribe((task: any) => {
            const { result } = task;
            if (this.saveWizardState) {
                this.wizardService.setWizardPreset(result.policyId, {
                    data: result.wizardConfig,
                });
                this.saveWizardState = false;
            }
        });
    }

    private processPublishResult(taskId: string): void {
        this.taskService.get(taskId).subscribe((task: any) => {
            const { result } = task;
            if (result) {
                const { isValid, errors, policyId } = result;
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
                            if (block.id) {
                                text.push(`<div>${block.id}: ${error}</div>`);
                            } else {
                                text.push(`<div>${error}</div>`);
                            }
                        }
                    }
                    this.informService.errorMessage(text.join(''), 'The policy is invalid');
                } else {
                    this.wizardService.removeWizardPreset(policyId)
                }
                this.loadAllPolicy();
            }
        });
    }

    createMultiPolicy(element: any) {
        let dialogRef;
        const bodyStyles = window.getComputedStyle(document.body);
        const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
        if (this.innerWidth <= 810) {
            dialogRef = this.dialog.open(MultiPolicyDialogComponent, {
                width: `${this.innerWidth.toString()}px`,
                maxWidth: '100vw',
                height: `${this.innerHeight - headerHeight}px`,
                position: {
                    'bottom': '0'
                },
                panelClass: 'g-dialog',
                hasBackdrop: true, // Shadows beyond the dialog
                closeOnNavigation: true,
                autoFocus: false,
                data: {
                    policyId: element.id
                }
            });
        } else {
            dialogRef = this.dialog.open(MultiPolicyDialogComponent, {
                width: '650px',
                panelClass: 'g-dialog',
                disableClose: true,
                autoFocus: false,
                data: {
                    policyId: element.id
                }
            });
        }
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.importPolicyDetails(result);
            }
        });
    }

    comparePolicy(element?: any) {
        const dialogRef = this.dialog.open(ComparePolicyDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: {
                policy: element,
                policies: this.policies
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'policy',
                        policyId1: result.policyId1,
                        policyId2: result.policyId2
                    }
                });
            }
        });
    }

    newPolicy() {
        const dialogRef = this.dialog.open(NewPolicyDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: {}
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.policyEngineService.pushCreate(result).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.taskId = taskId;
                    this.expectedTaskMessages = expectation;
                    this.mode = OperationMode.Create;
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    openPolicyWizardDialog() {
        this.loading = true;
        forkJoin([
            this.tokenService.getTokens(),
            this.schemaService.getSchemas(),
        ]).subscribe((result) => {
            const schemas = result[1].map((schema) => new Schema(schema));
            const tokens = result[0].map((token) => new Token(token));
            this.loading = false;
            this.wizardService.openPolicyWizardDialog(
                WizardMode.CREATE,
                (value) => {
                    this.saveWizardState = value.saveState;
                    this.loading = true;
                    this.wizardService
                        .createPolicyAsync(value.config)
                        .subscribe(
                            (result) => {
                                const { taskId, expectation } = result;
                                this.taskId = taskId;
                                this.expectedTaskMessages = expectation;
                                this.mode = OperationMode.WizardCreate;
                            },
                            (e) => {
                                this.loading = false;
                            }
                        );
                },
                tokens,
                schemas,
                this.policies as any[]
            );
        });
    }
}

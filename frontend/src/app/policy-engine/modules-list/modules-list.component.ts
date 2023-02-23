import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IToken, IUser, UserRole } from '@guardian/interfaces';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ExportPolicyDialog } from '../helpers/export-policy-dialog/export-policy-dialog.component';
import { ImportPolicyDialog } from '../helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from '../helpers/preview-policy-dialog/preview-policy-dialog.component';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { MultiPolicyDialogComponent } from '../helpers/multi-policy-dialog/multi-policy-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { ComparePolicyDialog } from '../helpers/compare-policy-dialog/compare-policy-dialog.component';
import { ModulesService } from 'src/app/services/modules.service';
import { NewModuleDialog } from '../helpers/new-module-dialog/new-module-dialog.component';

enum OperationMode {
    None,
    Create,
    Import,
    Publish,
    Delete
}

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-modules-list',
    templateUrl: './modules-list.component.html',
    styleUrls: ['./modules-list.component.css']
})
export class ModulesListComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public modules: any[] | null;
    public modulesCount: any;
    public pageIndex: number;
    public pageSize: number;
    public columns: string[] = [
        'name',
        'description',
        'status',
        'operation',
        'menu',
        'operations'
    ];

    // columnsRole: any = {};
    // role!: any;

    public mode: OperationMode = OperationMode.None;
    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;

    // publishMenuOption = [{
    //     id: 'Publish',
    //     title: 'Publish',
    //     description: 'Release version into public domain.',
    //     color: '#4caf50'
    // }, {
    //     id: 'Dry-run',
    //     title: 'Dry Run',
    //     description: 'Run without making any persistent changes or executing transaction.',
    //     color: '#3f51b5'
    // }];

    // draftMenuOption = [{
    //     id: 'Draft',
    //     title: 'Stop',
    //     description: 'Return to editing.',
    //     color: '#9c27b0'
    // }, {
    //     id: 'Publish',
    //     title: 'Publish',
    //     description: 'Release version into public domain.',
    //     color: '#4caf50'
    // }];

    constructor(
        private profileService: ProfileService,
        private modulesService: ModulesService,
        private wsService: WebSocketService,
        private tokenService: TokenService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private taskService: TasksService,
        private informService: InformService,
        private toastr: ToastrService
    ) {
        this.modules = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.modulesCount = 0;

        // this.columnsRole = {};
        // this.columnsRole[UserRole.STANDARD_REGISTRY] = [
        //     'name',
        //     'description',
        //     'roles',
        //     'topic',
        //     'version',
        //     'tokens',
        //     'schemas',
        //     'status',
        //     'instance',
        //     'operations'
        // ]
        // this.columnsRole[UserRole.USER] = [
        //     'name',
        //     'description',
        //     'roles',
        //     'version',
        //     'instance',
        // ]
    }

    ngOnInit() {
        this.loading = true;
        this.loadModules();
    }

    ngOnDestroy() {

    }

    private loadModules() {
        this.modules = null;
        this.isConfirmed = false;
        this.loading = true;
        this.profileService.getProfile().subscribe((profile: IUser | null) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            if (this.isConfirmed) {
                this.loadAllModules();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadAllModules() {
        this.loading = true;
        this.modulesService.page(this.pageIndex, this.pageSize).subscribe((policiesResponse) => {
            this.modules = policiesResponse.body || [];
            this.modulesCount = policiesResponse.headers.get('X-Total-Count') || this.modules.length;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    public onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadAllModules();
    }

    // onAsyncError(error: any) {
    //     this.informService.processAsyncError(error);
    //     this.taskId = undefined;
    //     this.mode = OperationMode.None;
    //     this.loadAllPolicy();
    // }

    // onAsyncCompleted() {
    //     switch (this.mode) {
    //         case OperationMode.Delete:
    //         case OperationMode.Create:
    //         case OperationMode.Import:
    //             this.taskId = undefined;
    //             this.mode = OperationMode.None;
    //             this.loadAllPolicy();
    //             break;
    //         case OperationMode.Publish:
    //             if (this.taskId) {
    //                 const taskId = this.taskId;
    //                 this.taskId = undefined;
    //                 this.processPublishResult(taskId);
    //             }
    //             break;
    //         default:
    //             console.log(`Not allowed mode ${this.mode}`);
    //             break;
    //     }
    //     this.mode = OperationMode.None;
    // }

    // dryRun(element: any) {
    //     this.loading = true;
    //     this.policyEngineService.dryRun(element.id).subscribe((data: any) => {
    //         const { policies, isValid, errors } = data;
    //         if (!isValid) {
    //             let text = [];
    //             const blocks = errors.blocks;
    //             const invalidBlocks = blocks.filter((block: any) => !block.isValid);
    //             for (let i = 0; i < invalidBlocks.length; i++) {
    //                 const block = invalidBlocks[i];
    //                 for (let j = 0; j < block.errors.length; j++) {
    //                     const error = block.errors[j];
    //                     if (block.id) {
    //                         text.push(`<div>${block.id}: ${error}</div>`);
    //                     } else {
    //                         text.push(`<div>${error}</div>`);
    //                     }
    //                 }
    //             }
    //             this.informService.errorMessage(text.join(''), 'The policy is invalid');
    //         }
    //         this.loadAllPolicy();
    //     }, (e) => {
    //         this.loading = false;
    //     });
    // }

    // draft(element: any) {
    //     this.loading = true;
    //     this.policyEngineService.draft(element.id).subscribe((data: any) => {
    //         const { policies, isValid, errors } = data;
    //         this.loadAllPolicy();
    //     }, (e) => {
    //         this.loading = false;
    //     });
    // }

    // setVersion(element: any) {
    //     const dialogRef = this.dialog.open(SetVersionDialog, {
    //         width: '350px',
    //         data: {}
    //     });
    //     dialogRef.afterClosed().subscribe((version) => {
    //         if (version) {
    //             this.publish(element, version);
    //         }
    //     });
    // }

    // private publish(element: any, version: string) {
    //     this.loading = true;
    //     this.policyEngineService.pushPublish(element.id, version).subscribe((result) => {
    //         const { taskId, expectation } = result;
    //         this.taskId = taskId;
    //         this.expectedTaskMessages = expectation;
    //         this.mode = OperationMode.Publish;
    //     }, (e) => {
    //         this.loading = false;
    //     });
    // }

    // exportPolicy(element: any) {
    //     this.policyEngineService.exportInMessage(element.id)
    //         .subscribe(exportedPolicy => this.dialog.open(ExportPolicyDialog, {
    //             width: '700px',
    //             panelClass: 'g-dialog',
    //             data: {
    //                 policy: exportedPolicy
    //             },
    //             autoFocus: false
    //         }));
    // }

    // importPolicy(messageId?: string) {
    //     const dialogRef = this.dialog.open(ImportPolicyDialog, {
    //         width: '500px',
    //         autoFocus: false,
    //         data: {
    //             timeStamp: messageId
    //         }
    //     });
    //     dialogRef.afterClosed().subscribe(async (result) => {
    //         if (result) {
    //             this.importPolicyDetails(result);
    //         }
    //     });
    // }

    // importPolicyDetails(result: any) {
    //     const { type, data, policy } = result;
    //     const distinctPolicies = this.getDistinctPolicy();
    //     const dialogRef = this.dialog.open(PreviewPolicyDialog, {
    //         width: '950px',
    //         panelClass: 'g-dialog',
    //         data: {
    //             policy: policy,
    //             policies: distinctPolicies
    //         }
    //     });
    //     dialogRef.afterClosed().subscribe(async (result) => {
    //         if (result) {
    //             if (result.messageId) {
    //                 this.importPolicy(result.messageId);
    //                 return;
    //             }
    //             let versionOfTopicId = result.versionOfTopicId || null;
    //             this.loading = true;
    //             if (type == 'message') {
    //                 this.policyEngineService.pushImportByMessage(data, versionOfTopicId).subscribe(
    //                     (result) => {
    //                         const { taskId, expectation } = result;
    //                         this.taskId = taskId;
    //                         this.expectedTaskMessages = expectation;
    //                         this.mode = OperationMode.Import;
    //                     }, (e) => {
    //                         this.loading = false;
    //                     });
    //             } else if (type == 'file') {
    //                 this.policyEngineService.pushImportByFile(data, versionOfTopicId).subscribe(
    //                     (result) => {
    //                         const { taskId, expectation } = result;
    //                         this.taskId = taskId;
    //                         this.expectedTaskMessages = expectation;
    //                         this.mode = OperationMode.Import;
    //                     }, (e) => {
    //                         this.loading = false;
    //                     });
    //             }
    //         }
    //     });
    // }

    // private getDistinctPolicy(): any[] {
    //     const policyByTopic: any = {};
    //     if (this.policies) {
    //         for (let i = 0; i < this.policies.length; i++) {
    //             const policy = this.policies[i];
    //             if (policy.topicId) {
    //                 if (!policyByTopic.hasOwnProperty(policy.topicId)) {
    //                     policyByTopic[policy.topicId] = policy;
    //                 } else if (policyByTopic[policy.topicId].createDate > policy.createDate) {
    //                     policyByTopic[policy.topicId] = policy;
    //                 }
    //             }
    //         }
    //     }
    //     return Object.values(policyByTopic)
    //         .sort((a: any, b: any) => a.createDate > b.createDate ? -1 : (b.createDate > a.createDate ? 1 : 0));
    // }

    // onPublishAction(event: any, element: any) {
    //     if (event.id === 'Publish') {
    //         this.setVersion(element);
    //     } else if (event.id === 'Dry-run') {
    //         this.dryRun(element);
    //     }
    // }

    // onDryRunAction(event: any, element: any) {
    //     if (event.id === 'Publish') {
    //         this.setVersion(element);
    //     } else if (event.id === 'Draft') {
    //         this.draft(element);
    //     }
    // }

    // private processPublishResult(taskId: string): void {
    //     this.taskService.get(taskId).subscribe((task: any) => {
    //         const { result } = task;
    //         if (result) {
    //             const { isValid, errors } = result;
    //             if (!isValid) {
    //                 let text = [];
    //                 const blocks = errors.blocks;
    //                 const invalidBlocks = blocks.filter(
    //                     (block: any) => !block.isValid
    //                 );
    //                 for (let i = 0; i < invalidBlocks.length; i++) {
    //                     const block = invalidBlocks[i];
    //                     for (
    //                         let j = 0;
    //                         j < block.errors.length;
    //                         j++
    //                     ) {
    //                         const error = block.errors[j];
    //                         if (block.id) {
    //                             text.push(`<div>${block.id}: ${error}</div>`);
    //                         } else {
    //                             text.push(`<div>${error}</div>`);
    //                         }
    //                     }
    //                 }
    //                 this.informService.errorMessage(text.join(''), 'The policy is invalid');
    //             }
    //             this.loadAllPolicy();
    //         }
    //     });
    // }

    // createMultiPolicy(element: any) {
    //     const dialogRef = this.dialog.open(MultiPolicyDialogComponent, {
    //         width: '650px',
    //         panelClass: 'g-dialog',
    //         disableClose: true,
    //         autoFocus: false,
    //         data: {
    //             policyId: element.id
    //         }
    //     });
    //     dialogRef.afterClosed().subscribe(async (result) => {
    //         if (result) {
    //             this.importPolicyDetails(result);
    //         }
    //     });
    // }

    // comparePolicy(element?: any) {
    //     const dialogRef = this.dialog.open(ComparePolicyDialog, {
    //         width: '650px',
    //         panelClass: 'g-dialog',
    //         disableClose: true,
    //         autoFocus: false,
    //         data: {
    //             policy: element,
    //             policies: this.policies
    //         }
    //     });
    //     dialogRef.afterClosed().subscribe(async (result) => {
    //         if (result) {
    //             this.router.navigate(['/compare'], {
    //                 queryParams: {
    //                     type: 'policy',
    //                     policyId1: result.policyId1,
    //                     policyId2: result.policyId2
    //                 }
    //             });
    //         }
    //     });
    // }

    public importModules() {
        this.loading = true;
        throw '';
    }

    public exportModules(element: any) {
        this.loading = true;
        throw '';
    }

    public newModules() {
        const dialogRef = this.dialog.open(NewModuleDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: {}
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                const module = {
                    name: result.name,
                    description: result.description,
                    config: {
                        blockType: 'module'
                    }
                }
                this.loading = true;
                this.modulesService.create(module).subscribe((result) => {
                    this.loadAllModules();
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    public deleteModule(element: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete module',
                dialogText: 'Are you sure to delete module?'
            },
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.modulesService.delete(element.uuid).subscribe((result) => {
                this.loadAllModules();
            }, (e) => {
                this.loading = false;
            });
        });
    }

    public publishModule(element: any) {

    }

    public showModule(element: any, value: boolean) {
        this.loading = true;
        (value ? this.modulesService.show(element.uuid) : this.modulesService.hide(element.uuid))
            .subscribe((result) => {
                this.loadAllModules();
            }, (e) => {
                this.loading = false;
            });
    }
}
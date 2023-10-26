import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, } from '@angular/core';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { forkJoin, Subscription } from 'rxjs';
import { IStatus, StatusType, TaskAction, UserRole, } from '@guardian/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';
import { AuthService } from 'src/app/services/auth.service';
import { WizardService } from '../../policy-engine/services/wizard.service';

@Component({
    selector: 'async-progress',
    templateUrl: './async-progress.component.html',
    styleUrls: ['./async-progress.component.css'],
})
export class AsyncProgressComponent implements OnInit, OnDestroy {
    progressValue!: number;
    statusesCount: number = 0;
    statuses: IStatus[] = [];
    statusesRefMap: any = {};
    taskId: string;
    expected: number;
    action: TaskAction | string;
    taskNotFound: boolean = false;
    userRole?: UserRole;
    last?: any;

    @Input('taskId') inputTaskId?: string;
    @Output() completed = new EventEmitter<string>();
    @Output() error = new EventEmitter<any>();

    private subscription = new Subscription();

    constructor(
        private wsService: WebSocketService,
        private route: ActivatedRoute,
        private taskService: TasksService,
        private router: Router,
        private informService: InformService,
        private auth: AuthService,
        private wizardService: WizardService
    ) {
        this.last = this.route?.snapshot?.queryParams?.last;
        try {
            if (this.last) {
                this.last = atob(this.last);
            }
        } catch (error) {
            this.last = null;
        }
    }

    ngOnInit() {
        this.init(true);
    }

    init(addSubscription: boolean = false) {
        if (this.inputTaskId) {
            this.taskId = this.inputTaskId;
            this.taskService.get(this.taskId).subscribe((task) => {
                this.taskNotFound = !task;
                if (!task) {
                    return;
                }
                this.expected = task.expectation;
                this.action = task.action;
                this.handleStatuses(task.statuses);
                if (task.result) {
                    this.progressValue = 100;
                    this.handleResult(task.result);
                    return;
                } else if (task.error) {
                    this.handleError(task.error);
                    return;
                }
                if (addSubscription) {
                    this.addWsSubscription();
                }
            });
        } else {
            this.taskId = this.route.snapshot.params['id'];
            forkJoin([
                this.taskService.get(this.taskId),
                this.auth.sessions(),
            ]).subscribe(([task, user]) => {
                this.userRole = user?.role;
                this.taskNotFound = !task;
                if (!task) {
                    return;
                }
                this.expected = task.expectation;
                this.action = task.action;
                this.handleStatuses(task.statuses);
                if (task.result) {
                    this.progressValue = 100;
                    this.handleResult(task.result);
                    return;
                } else if (task.error) {
                    this.handleError(task.error);
                    return;
                }
                if (addSubscription) {
                    this.addWsSubscription();
                    this.subscription.add(
                        this.route.params.subscribe(this.init.bind(this, false))
                    );
                }
            });
        }
    }

    addWsSubscription() {
        this.subscription.add(
            this.wsService.taskSubscribe((task) => {
                const { taskId, statuses, error, result } = task;
                if (taskId != this.taskId) {
                    return;
                }
                if (result) {
                    this.progressValue = 100;
                    this.handleResult(result);
                    return;
                } else if (error) {
                    this.handleError(error);
                    return;
                }
                this.handleStatuses(statuses);
            })
        );
    }

    redirect(urlString: string) {
        const url = new URL(urlString);
        const path = [url.pathname];
        const queryParams: any = {};
        for (const [key, value] of url.searchParams.entries()) {
            if (queryParams.hasOwnProperty(key)) {
                if (Array.isArray(queryParams[key])) {
                    queryParams[key].push(value);
                } else {
                    queryParams[key] = [queryParams[key], value];
                }
            } else {
                queryParams[key] = value;
            }
        }
        this.router.navigate(path, { queryParams });
    }

    handleResult(result: any) {
        if (this.inputTaskId) {
            this.completed.emit(result);
            return;
        }
        switch (this.action) {
            case TaskAction.RESTORE_USER_PROFILE:
            case TaskAction.CONNECT_USER:
                this.wsService.updateProfile();
                this.router.navigate([
                    this.userRole === UserRole.USER ? 'user-profile' : 'config',
                ], {
                    replaceUrl: true,
                });
                return;
            case TaskAction.DELETE_TOKEN:
            case TaskAction.UPDATE_TOKEN:
            case TaskAction.CREATE_TOKEN:
                this.router.navigate(['tokens'], {
                    replaceUrl: true,
                });
                break;
            case TaskAction.CLONE_POLICY:
            case TaskAction.CREATE_POLICY:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        policyId: result,
                    },
                    replaceUrl: true,
                });
                break;
            case TaskAction.CREATE_TOOL:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        toolId: result,
                    },
                    replaceUrl: true,
                });
                break;
            case TaskAction.IMPORT_POLICY_FILE:
            case TaskAction.IMPORT_POLICY_MESSAGE:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        policyId: result.policyId,
                    },
                    replaceUrl: true,
                });
                break;
            case TaskAction.IMPORT_TOOL_FILE:
            case TaskAction.IMPORT_TOOL_MESSAGE:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        toolId: result.toolId,
                    },
                    replaceUrl: true,
                });
                break;
            case TaskAction.WIZARD_CREATE_POLICY:
                const { policyId, saveState } = result;
                if (saveState) {
                    this.wizardService.setWizardPreset(policyId, {
                        data: result.wizardConfig,
                    });
                }
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        policyId,
                    },
                    replaceUrl: true,
                });
                break;
            case TaskAction.PUBLISH_POLICY:
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
                            for (let j = 0; j < block.errors.length; j++) {
                                const error = block.errors[j];
                                if (block.id) {
                                    text.push(
                                        `<div>${block.id}: ${error}</div>`
                                    );
                                } else {
                                    text.push(`<div>${error}</div>`);
                                }
                            }
                        }
                        this.informService.errorMessage(
                            text.join(''),
                            'The policy is invalid'
                        );
                    }
                    this.router.navigate(['policy-configuration'], {
                        queryParams: {
                            policyId,
                        },
                        replaceUrl: true,
                    });
                }
                break;
            case TaskAction.PUBLISH_TOOL:
                if (result) {
                    const { isValid, errors, tool } = result;
                    if (!isValid) {
                        let text = [];
                        const blocks = errors.blocks;
                        const invalidBlocks = blocks.filter(
                            (block: any) => !block.isValid
                        );
                        for (let i = 0; i < invalidBlocks.length; i++) {
                            const block = invalidBlocks[i];
                            for (let j = 0; j < block.errors.length; j++) {
                                const error = block.errors[j];
                                if (block.id) {
                                    text.push(
                                        `<div>${block.id}: ${error}</div>`
                                    );
                                } else {
                                    text.push(`<div>${error}</div>`);
                                }
                            }
                        }
                        this.informService.errorMessage(
                            text.join(''),
                            'The tool is invalid'
                        );
                    }
                    this.router.navigate(['policy-configuration'], {
                        queryParams: {
                            toolId: tool?.id
                        },
                        replaceUrl: true,
                    });
                }
                break;
            case TaskAction.DELETE_POLICY:
                this.router.navigate(['policy-viewer'], {
                    replaceUrl: true,
                });
                break;
            // @ts-ignore
            case TaskAction.CREATE_SCHEMA:
                localStorage.removeItem('restoreSchemaData');
            case TaskAction.CREATE_SCHEMA:
            case TaskAction.PUBLISH_SCHEMA:
            case TaskAction.IMPORT_SCHEMA_FILE:
            case TaskAction.IMPORT_SCHEMA_MESSAGE:
                if (this.last) {
                    this.redirect(this.last);
                    return;
                }
                this.router.navigate(['schemas'], {
                    replaceUrl: true,
                });
                break;
        }
    }

    handleError(error: any) {
        if (this.inputTaskId) {
            this.error.emit(error);
            return;
        }

        if (this.last) {
            this.redirect(this.last);
            return;
        }

        switch (this.action) {
            case TaskAction.RESTORE_USER_PROFILE:
            case TaskAction.CONNECT_USER:
                this.router.navigate([
                    this.userRole === UserRole.USER ? 'user-profile' : 'config',
                ], {
                    replaceUrl: true,
                });
                break;
            case TaskAction.DELETE_TOKEN:
            case TaskAction.UPDATE_TOKEN:
            case TaskAction.CREATE_TOKEN:
                this.router.navigate(['tokens'], {
                    replaceUrl: true,
                });
                break;
            case TaskAction.CLONE_POLICY:
            case TaskAction.CREATE_POLICY:
            case TaskAction.IMPORT_POLICY_FILE:
            case TaskAction.IMPORT_POLICY_MESSAGE:
            case TaskAction.IMPORT_TOOL_FILE:
            case TaskAction.IMPORT_TOOL_MESSAGE:
            case TaskAction.WIZARD_CREATE_POLICY:
            case TaskAction.PUBLISH_POLICY:
            case TaskAction.DELETE_POLICY:
                this.router.navigate(['policy-viewer'], {
                    replaceUrl: true,
                });
                break;
            case TaskAction.CREATE_SCHEMA:
            case TaskAction.PUBLISH_SCHEMA:
            case TaskAction.IMPORT_SCHEMA_FILE:
            case TaskAction.IMPORT_SCHEMA_MESSAGE:
                this.router.navigate(['schemas'], {
                    replaceUrl: true,
                });
                break;
        }
    }

    handleStatuses(statuses: any) {
        if (!statuses || statuses.length < this.statuses.length) {
            return;
        }
        this.statuses = [];
        this.statusesCount = 0;
        const newStatuses: IStatus[] = statuses || [];
        newStatuses.forEach((status) => {
            switch (status.type) {
                case StatusType.INFO:
                    this.statuses.push(status);
                    break;
                case StatusType.PROCESSING:
                    this.statusesRefMap[status.message] = status;
                    this.statuses.push(status);
                    break;
                case StatusType.COMPLETED:
                    if (this.statusesRefMap[status.message]) {
                        this.statusesRefMap[status.message].type = status.type;
                        this.statusesCount++;
                    } else {
                        this.statusesRefMap[status.message] = status;
                        this.statuses.push(status);
                        this.statusesCount++;
                    }
                    break;
                default:
                    console.log('Unknown status type');
                    break;
            }
        });
        this.applyChanges();
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.taskId) {
            this.statusesCount = 0;
            this.statuses.length = 0;
            this.progressValue = 0;
        }
    }

    isInfo(status: IStatus) {
        return status.type == StatusType.INFO;
    }

    private applyChanges() {
        if (!this.taskId) {
            return;
        }
        this.progressValue =
            this.statusesCount > this.expected
                ? 100
                : Math.floor((this.statusesCount / this.expected) * 100);
    }
}

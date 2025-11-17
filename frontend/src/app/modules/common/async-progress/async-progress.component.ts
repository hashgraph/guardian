import { Component, ElementRef, EventEmitter, Inject, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, } from '@angular/core';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { forkJoin, Subscription } from 'rxjs';
import { IStatus, StatusType, TaskAction, UserRole, } from '@guardian/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';
import { AuthService } from 'src/app/services/auth.service';
import { WizardService } from '../../policy-engine/services/wizard.service';
import { CONFIGURATION_ERRORS } from '../../policy-engine/injectors/configuration.errors.injector';

@Component({
    selector: 'async-progress',
    templateUrl: './async-progress.component.html',
    styleUrls: ['./async-progress.component.scss'],
})
export class AsyncProgressComponent implements OnInit, OnDestroy {
    public action: TaskAction | string;
    public progressValue!: number;
    public statusesCount: number = 0;
    public statuses: IStatus[] = [];
    public newProgress: boolean = false;
    public steps: any[];

    private statusesRefMap: any = {};
    private taskId: string;
    private expected: number;
    private taskNotFound: boolean = false;
    private last?: any;
    private redir?: boolean;
    private lastTimestamp: number = 0;

    @Input('taskId') inputTaskId?: string;
    @Output() completed = new EventEmitter<string>();
    @Output() error = new EventEmitter<any>();

    @ViewChild('status') statusRef: ElementRef;

    private subscription = new Subscription();

    public isInfo(status: IStatus) {
        return status.type == StatusType.INFO;
    }

    constructor(
        private wsService: WebSocketService,
        private route: ActivatedRoute,
        private taskService: TasksService,
        private router: Router,
        private informService: InformService,
        private auth: AuthService,
        private wizardService: WizardService,
        @Inject(CONFIGURATION_ERRORS)
        private _configurationErrors: Map<string, any>
    ) {
        const queryParams = this.route?.snapshot?.queryParams;
        this.last = queryParams?.last;
        this.redir = !(queryParams?.redir === 'false' || queryParams?.redir === false);
        this.steps = [];
        try {
            if (this.last) {
                this.last = atob(this.last);
            }
        } catch (error) {
            this.last = null;
        }
    }

    ngOnInit() {
        if (this.inputTaskId) {
            this.taskId = this.inputTaskId;
            this.initEvents();
            this.update();
        } else {
            this.taskId = this.route.snapshot.params['id'];
            this.initEvents();
            this.subscription.add(this.route.params.subscribe(this.update.bind(this)));
        }
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

    private update() {
        this.taskService.get(this.taskId).subscribe((task) => {
            if (task) {
                this.expected = task.expectation;
                this.action = task.action;
            } else {
                this.taskNotFound = true;
            }
            this.setTask(task);
        });
    }

    private initEvents() {
        this.subscription.add(
            this.wsService.taskSubscribe((task) => {
                this.setTask(task);
            })
        );
    }

    private setTask(task: any) {
        if (!task) {
            return;
        }
        const { taskId, statuses, error, result, info } = task;
        if (taskId != this.taskId) {
            return;
        }

        this.expected = task.expectation;
        this.action = task.action;

        if (info) {
            this.setNewProgress(info);
        } else if (statuses) {
            this.setStatuses(statuses);
        }
        if (result) {
            this.progressValue = 100;
            this.setResult(result);
        } else if (error) {
            this.setError(error);
        }
    }

    private setResult(result: any) {
        if (this.inputTaskId) {
            this.completed.emit(result);
            return;
        }
        switch (this.action) {
            case TaskAction.RESTORE_USER_PROFILE:
            case TaskAction.CONNECT_USER:
                this.wsService.updateProfile();
                this.toHome();
                return;
            case TaskAction.DELETE_TOKEN:
            case TaskAction.DELETE_TOKENS:
            case TaskAction.UPDATE_TOKEN:
            case TaskAction.CREATE_TOKEN:
                setTimeout(() => {
                    this.router.navigate(['tokens'], {
                        replaceUrl: true,
                    });
                }, 500);
                break;
            case TaskAction.CLONE_POLICY:
            case TaskAction.CREATE_POLICY:
                setTimeout(() => {
                    this.router.navigate(['policy-configuration'], {
                        queryParams: {
                            policyId: result,
                        },
                        replaceUrl: true,
                    });
                }, 500);
                break;
            case TaskAction.CREATE_TOOL:
                setTimeout(() => {
                    this.router.navigate(['tool-configuration'], {
                        queryParams: {
                            toolId: result,
                        },
                        replaceUrl: true,
                    });
                }, 500);
                break;
            case TaskAction.IMPORT_POLICY_FILE:
            case TaskAction.IMPORT_POLICY_MESSAGE:
                if (this.redir) {
                    setTimeout(() => {
                        this.router.navigate(['policy-configuration'], {
                            queryParams: {
                                policyId: result.policyId,
                            },
                            replaceUrl: true,
                        });
                    }, 500);
                } else {
                    setTimeout(() => {
                        this.router.navigate(['policy-viewer'], {
                            replaceUrl: true,
                        });
                    }, 500);
                }
                break;
            case TaskAction.IMPORT_TOOL_FILE:
            case TaskAction.IMPORT_TOOL_MESSAGE:
                if (this.redir) {
                    setTimeout(() => {
                        this.router.navigate(['tool-configuration'], {
                            queryParams: {
                                toolId: result.toolId,
                            },
                            replaceUrl: true,
                        });
                    }, 500);
                } else {
                    setTimeout(() => {
                        this.router.navigate(['tools'], {
                            replaceUrl: true,
                        });
                    }, 500);
                }
                break;
            case TaskAction.WIZARD_CREATE_POLICY:
                const { policyId, saveState } = result;
                if (saveState) {
                    this.wizardService.setWizardPreset(policyId, {
                        data: result.wizardConfig,
                    });
                }
                setTimeout(() => {
                    this.router.navigate(['policy-configuration'], {
                        queryParams: {
                            policyId,
                        },
                        replaceUrl: true,
                    });
                }, 500);
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
                        this._configurationErrors.set(policyId, errors);
                    }
                    setTimeout(() => {
                        this.router.navigate(['policy-configuration'], {
                            queryParams: {
                                policyId,
                            },
                            replaceUrl: true,
                        });
                    }, 500);
                }
                break;
            case TaskAction.APPROVE_EXTERNAL_POLICY:
                if (result) {
                    const { isValid, errors, policyId } = result;
                    if (!isValid) {
                        this._configurationErrors.set(policyId, errors);
                    }
                    setTimeout(() => {
                        this.router.navigate(['policy-viewer'], {
                            queryParams: {
                                tab: 'remote',
                            },
                            replaceUrl: true,
                        });
                    }, 500);
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
                        this._configurationErrors.set(tool?.id, errors);
                    }
                    setTimeout(() => {
                        this.router.navigate(['tool-configuration'], {
                            queryParams: {
                                toolId: tool?.id
                            },
                            replaceUrl: true,
                        });
                    }, 500);
                }
                break;
            case TaskAction.DELETE_POLICY:
            case TaskAction.DELETE_POLICIES:
            case TaskAction.MIGRATE_DATA:
                if (result?.length > 0) {
                    this.informService.warnMessage(
                        'There are some errors while migrating',
                        'Migration warning'
                    );
                }
                setTimeout(() => {
                    this.router.navigate(['policy-viewer'], {
                        replaceUrl: true,
                    });
                }, 500);
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
                setTimeout(() => {
                    this.router.navigate(['schemas'], {
                        replaceUrl: true,
                    });
                }, 500);
                break;
            case TaskAction.PUBLISH_POLICY_LABEL:
                if (this.last) {
                    this.redirect(this.last);
                    return;
                }
                setTimeout(() => {
                    this.router.navigate(['policy-labels'], {
                        replaceUrl: true,
                    });
                }, 500);
                break;
            default:
                debugger;
                return;
        }
    }

    private setError(error: any) {
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
                this.toHome();
                break;
            case TaskAction.DELETE_TOKEN:
            case TaskAction.DELETE_TOKENS:
            case TaskAction.UPDATE_TOKEN:
            case TaskAction.CREATE_TOKEN:
                setTimeout(() => {
                    this.router.navigate(['tokens'], {
                        replaceUrl: true,
                    });
                }, 500);
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
            case TaskAction.DELETE_POLICIES:
            case TaskAction.MIGRATE_DATA:
                setTimeout(() => {
                    this.router.navigate(['policy-viewer'], {
                        replaceUrl: true,
                    });
                }, 500);
                break;
            case TaskAction.CREATE_SCHEMA:
            case TaskAction.PUBLISH_SCHEMA:
            case TaskAction.IMPORT_SCHEMA_FILE:
            case TaskAction.IMPORT_SCHEMA_MESSAGE:
                setTimeout(() => {
                    this.router.navigate(['schemas'], {
                        replaceUrl: true,
                    });
                }, 500);
                break;
        }
    }

    private setStatuses(statuses: any) {
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

    private redirect(urlString: string) {
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
        setTimeout(() => {
            this.router.navigate(path, { queryParams });
        }, 500);

    }

    private applyChanges() {
        if (!this.taskId) {
            return;
        }
        this.progressValue =
            this.statusesCount > this.expected
                ? 100
                : Math.floor((this.statusesCount / this.expected) * 100);
        setTimeout(() => {
            if (this.statusRef?.nativeElement) {
                this.statusRef.nativeElement.scrollTop = 99999;
            }
        }, 50);
    }

    private needScroll() {
        try {
            if (this.statusRef?.nativeElement) {
                const div = this.statusRef.nativeElement;
                const height = div.getBoundingClientRect().height;
                const scrollTop = div.scrollHeight - height;
                if (scrollTop > 0) {
                    const diff = scrollTop - div.scrollTop;
                    return diff < 30;
                }
            }
            return true;
        } catch (error) {
            return true;
        }
    }

    private toScroll(needScroll: boolean) {
        try {
            if (needScroll) {
                setTimeout(() => {
                    if (this.statusRef?.nativeElement) {
                        this.statusRef.nativeElement.scrollTop = 99999;
                    }
                }, 0);
                setTimeout(() => {
                    if (this.statusRef?.nativeElement) {
                        this.statusRef.nativeElement.scrollTop = 99999;
                    }
                }, 50);
            }
        } catch (error) {
            return;
        }
    }

    private setNewProgress(info: any) {
        if (info.timestamp && this.lastTimestamp > info.timestamp) {
            return;
        }
        this.lastTimestamp = info.timestamp || 0;
        const needScroll = this.needScroll();
        this.newProgress = true;
        this.progressValue = Math.min(Math.max(info.progress, 0), 100);
        if (Array.isArray(info.steps)) {
            this.steps = info.steps;
        } else {
            this.steps = [info];
        }
        this.toScroll(needScroll);
    }

    public isWait(step: any): boolean {
        return !step.started;
    }

    public isSkipped(step: any): boolean {
        return step.skipped && !step.completed && !step.failed;
    }

    public isCompleted(step: any): boolean {
        return step.completed && !step.failed && !step.skipped;
    }

    public isFailed(step: any): boolean {
        return step.failed;
    }

    public isStarted(step: any): boolean {
        return step.started && !step.completed && !step.failed && !step.skipped;
    }

    private toHome() {
        this.auth.sessions().subscribe((user) => {
            const userRole = user?.role;
            const home = this.auth.home(userRole);
            setTimeout(() => {
                this.router.navigate([home], {
                    replaceUrl: true,
                });
            });
        }, (error) => {
            const home = this.auth.home('');
            setTimeout(() => {
                this.router.navigate([home], {
                    replaceUrl: true,
                });
            });
        });
    }
}

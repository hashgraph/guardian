import { Component, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { Subscription } from 'rxjs';
import { IStatus, StatusType, TaskAction } from '@guardian/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { TasksService } from 'src/app/services/tasks.service';

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

    private subscription = new Subscription();

    constructor(
        private wsService: WebSocketService,
        private route: ActivatedRoute,
        private taskService: TasksService,
        private router: Router
    ) {}

    ngOnInit() {
        this.subscription.add(
            this.route.params.subscribe(this.init.bind(this, false))
        );
        this.init(true);
    }

    init(addSubscription: boolean = false) {
        this.taskId = this.route.snapshot.params['id'];
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
                return;
            } else if (task.error) {
                return;
            }
            if (addSubscription) {
                this.addWsSubscription();
            }
        });
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
                    return;
                }
                console.log(statuses);
                this.handleStatuses(statuses);
            })
        );
    }

    handleResult(result: any) {
        switch (this.action) {
            case TaskAction.CREATE_POLICY:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        policyId: result,
                    },
                });
                break;
            case TaskAction.PUBLISH_POLICY:
            case TaskAction.IMPORT_POLICY_FILE:
            case TaskAction.IMPORT_POLICY_MESSAGE:
                if (result) {
                    this.router.navigate(['policy-configuration'], {
                        queryParams: {
                            policyId: result.policyId,
                        },
                    });
                }
                break;
            case TaskAction.CLONE_POLICY:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        policyId: result,
                    },
                });
                break;
            case TaskAction.DELETE_POLICY:
                this.router.navigate(['policy-viewer']);
                break;

            case TaskAction.CREATE_SCHEMA:
            case TaskAction.PUBLISH_SCHEMA:
            case TaskAction.IMPORT_SCHEMA_FILE:
            case TaskAction.IMPORT_SCHEMA_MESSAGE:
                this.router.navigate(['schemas']);
                break;
        }
    }

    handleStatuses(statuses: any) {
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
                    // this.statusesCount++;
                    break;
                case StatusType.COMPLETED:
                    if (this.statusesRefMap[status.message]) {
                        this.statusesRefMap[status.message].type = status.type;
                        this.statusesCount++;
                    } else {
                        this.statusesRefMap[status.message] = status;
                        this.statuses.push(status);
                        this.statusesCount = this.statusesCount + 2;
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

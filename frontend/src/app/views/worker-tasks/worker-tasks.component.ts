import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { WorkerTasksService } from '../../services/worker-tasks.service';

/**
 * Notifications
 */
@Component({
    selector: 'app-worker-tasks',
    templateUrl: './worker-tasks.component.html',
    styleUrls: ['./worker-tasks.component.scss'],
})
export class WorkerTasksComponent implements OnInit {
    public loading: boolean = true;
    public workerTasks: any[] = [];
    public workerTasksCount: any;
    public workerTasksColumns: string[] = ['type', 'operations'];
    public pageIndex: number;
    public pageSize: number;
    public currentStatus: any = '';
    public statuses = [{
        name: 'All',
        value: ''
    }, {
        name: 'Complete',
        value: 'COMPLETE'
    }, {
        name: 'Processing',
        value: 'PROCESSING'
    }, {
        name: 'In queue',
        value: 'IN QUEUE'
    }, {
        name: 'Error',
        value: 'ERROR'
    }];

    constructor(
        private tasksService: WorkerTasksService,
    ) {
        this.pageIndex = 0;
        this.pageSize = 10;
    }

    ngOnInit() {
        this.loadWorkerTasks();
    }

    private loadWorkerTasks() {
        this.loading = true;
        const request = this.tasksService.all(
            this.pageIndex,
            this.pageSize,
            this.currentStatus
        );
        request.subscribe(
            (notificationsResponse: HttpResponse<any[]>) => {
                this.workerTasks = notificationsResponse.body || [];
                this.workerTasksCount =
                    notificationsResponse.headers.get('X-Total-Count') ||
                    this.workerTasks.length;
                for (const task of this.workerTasks) {
                    task.status = this.getStatus(task);
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            },
            (e) => {
                console.error(e.error);
                this.loading = false;
            }
        );
    }

    private getStatus(task: any) {
        if (task.done) {
            return 'COMPLETE'
        } else if (task.isError) {
            return 'ERROR';
        } else if (task.sent) {
            return 'PROCESSING'
        } else {
            return 'IN QUEUE'
        }
    }

    public onPage(event: any) {
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadWorkerTasks();
    }

    public onFilter(event: any) {
        this.pageIndex = 0;
        this.loadWorkerTasks();
    }


    public restartTask(task: any) {
        if (!task.isError) {
            return;
        }
        this.tasksService.restartTask(task.taskId).subscribe(() => {
            this.loadWorkerTasks();
        });
    }

    public deleteTask(task: any) {
        if (!task.isError) {
            return;
        }
        this.tasksService.deleteTask(task.taskId).subscribe(() => {
            this.loadWorkerTasks();
        });
    }
}

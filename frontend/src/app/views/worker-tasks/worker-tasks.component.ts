import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpResponse } from '@angular/common/http';
import { WorkerTasksService } from '../../services/worker-tasks.service';

/**
 * Notifications
 */
@Component({
    selector: 'app-worker-tasks',
    templateUrl: './worker-tasks.component.html',
    styleUrls: ['./worker-tasks.component.css'],
})
export class WorkerTasksComponent implements OnInit{
    loading: boolean = true;
    workerTasks: any[] = [];
    workerTasksCount: any;
    workerTasksColumns: string[] = ['type', 'operations'];
    pageIndex: number;
    pageSize: number;

    constructor(
        private tasksService: WorkerTasksService,
        public dialog: MatDialog,
    ) {
        this.pageIndex = 0;
        this.pageSize = 10;
    }

    ngOnInit() {
        this.loadWorkerTasks();
    }

    loadWorkerTasks() {
        this.loading = true;
        const request = this.tasksService.all(
            this.pageIndex,
            this.pageSize
        );
        request.subscribe(
            (notificationsResponse: HttpResponse<any[]>) => {
                this.workerTasks = notificationsResponse.body || [];
                this.workerTasksCount =
                    notificationsResponse.headers.get('X-Total-Count') ||
                    this.workerTasks.length;
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

    onPage(event: any) {
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadWorkerTasks();
    }

    taskStatus(task: any) {
        if (task.done) {
            return 'COMPLETE'
        } else if (task.isError) {
            return 'ERROR, Reason: ' + task.errorReason;
        } else if (task.sent) {
            return 'PROCESSING'
        } else {
            return 'IN QUEUE'
        }
    }

    restartTask(task: any) {
        if (!task.isError) {
            return;
        }
        this.tasksService.restartTask(task.taskId).subscribe(() => {
            this.loadWorkerTasks();
        });
    }

    deleteTask(task: any) {
        if (!task.isError) {
            return;
        }
        this.tasksService.deleteTask(task.taskId).subscribe(() => {
            this.loadWorkerTasks();
        });
    }
}

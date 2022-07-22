import { WebSocketsService } from '@api/service/websockets';
import { MessageBrokerChannel, MessageResponse } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { Singleton } from '@helpers/decorators/singleton';

@Singleton
export class TaskManager {
    // private tasks:TaskCollection = new TaskCollection(); // Default - one day
    private tasks:TaskCollection = new TaskCollection(1000 * 60 * 5 /* 5 minutes */);
    private wsService: WebSocketsService;
    private channel: MessageBrokerChannel;

    private static expectationMap = {
        'Create policy': 14,
        'Publish policy': 24,
        'Import policy file': 16,
        'Import policy message': 20,
        'Publish schema': 14,
        'Import schema file': 4,
        'Import schema message': 4,
    }

    public setDependecies(wsService: WebSocketsService, channel: MessageBrokerChannel) {
        this.wsService = wsService;
        this.channel = channel;
        this.channel.response<any, any>('UPDATE_TASK_STATUS', async (msg) => {
            const { taskId, statuses } = msg;
            if (taskId && statuses) {
                this.addStatuses(taskId, statuses);
            }
            return new MessageResponse({});
        });
    }

    public start(taskName: string): { taskId: string, expectation: number } {
        const taskId = GenerateUUIDv4();
        if (this.tasks[taskId]) {
            throw new Error(`Task ${taskId} exists.`);
        }

        this.tasks[taskId] = new Task(taskName);

        const expectation = this.getExpectation(taskName);
        return { taskId, expectation };
    }

    public addStatuses(taskId: string, statuses: string[], skipIfNotFound: boolean = true): void {
        if (this.tasks[taskId]) {
            this.tasks[taskId].statuses.push(...statuses);
            this.wsService.notifyTaskProgress(taskId, statuses);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    public addResult(taskId: string, result: any, skipIfNotFound: boolean = true) {
        const task = this.tasks[taskId];
        if (task) {
            task.result = result;
            this.wsService.notifyTaskProgress(taskId, undefined, true);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }

        this.correctExpectation(task);
    }

    public addError(taskId: string, error: any, skipIfNotFound: boolean = true) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].error = error;
            this.wsService.notifyTaskProgress(taskId, undefined, true, error);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    public getStatuses(taskId: string, skipIfNotFound: boolean = true): string[] {
        if (this.tasks[taskId]) {
            return this.tasks[taskId].statuses;
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    public getState(taskId: string, skipIfNotFound: boolean = true): Task {
        if (this.tasks[taskId]) {
            return this.tasks[taskId];
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    private getExpectation(taskName: string): number {
        if (!TaskManager.expectationMap[taskName]) {
            TaskManager.expectationMap[taskName] = 2;
        }

        return TaskManager.expectationMap[taskName];
    }

    private correctExpectation(task: Task): void {
        const taskStatusCount = task.statuses.length;
        if (TaskManager.expectationMap[task.name] < taskStatusCount) {
            TaskManager.expectationMap[task.name] = taskStatusCount;
        }
    }
}

class TaskCollection {
    [taskId: string]: Task;

    constructor(delay: number = 1000 * 60 * 60 * 24 /* One day */) {
        let self = this;
        
        setInterval(() => {
            console.log("Before: ", Object.keys(self).length);
            const old = new Date(new Date().valueOf() - delay);
            Object.keys(self)
                .filter(key => self[key].date < old)
                .forEach(key => { delete self[key] });
            console.log("After: ", Object.keys(self).length);
        }, delay);
    }
}

class Task {
    public date: Date = new Date();
    public statuses: string[] = [];
    public result: any;
    public error: any;

    constructor(public name: string) {}
}
import { WebSocketsService } from '@api/service/websockets';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { Singleton } from '@helpers/decorators/singleton';

@Singleton
export class TaskManager {
    private tasks:TaskCollection = new TaskCollection();
    private webSocketsService: WebSocketsService;

    public setWebSocketsService(webSocketsService: WebSocketsService) {
        this.webSocketsService = webSocketsService;
    }

    public add(name: string): string {
        const taskId = GenerateUUIDv4();
        if (this.tasks[taskId]) {
            throw new Error(`Task ${taskId} exists.`);
        }

        this.tasks[taskId] = new Task(name);
        return taskId;
    }

    public addStatuses(taskId: string, statuses: string[], skipIfNotFound: boolean = true): void {
        if (this.tasks[taskId]) {
            this.tasks[taskId].statuses.push(...statuses);
            this.webSocketsService.notifyTaskProgress(taskId, statuses);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    public addResult(taskId: string, result: any, skipIfNotFound: boolean = true) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].result = result;
            this.webSocketsService.notifyTaskProgress(taskId, undefined, true);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    public addError(taskId: string, error: any, skipIfNotFound: boolean = true) {
        if (this.tasks[taskId]) {
            this.tasks[taskId].error = error;
            this.webSocketsService.notifyTaskProgress(taskId, undefined, true);
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
}

class TaskCollection {
    [taskId: string]: Task;

    constructor() {
        let self = this;
        //const delta = 1000 * 60 * 60 * 24; // One day
        const delta = 1000 * 60 * 5; // 5 minutes
        setInterval(() => {
            console.log("Before: ", JSON.stringify(self));
            const old = new Date(new Date().valueOf() - delta);
            old.setDate(old.getDate()-1);
            Object.keys(self)
                .filter(key => self[key].date < old)
                .forEach(key => { delete self[key] });
            console.log("After: ", JSON.stringify(self));
        }, delta);
    }
}

class Task {
    public date: Date = new Date();
    public statuses: string[] = [];
    public result: any;
    public error: any;

    constructor(public name: string) {}
}
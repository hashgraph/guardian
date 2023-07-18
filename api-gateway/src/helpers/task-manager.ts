import { WebSocketsService } from '@api/service/websockets';
import { MessageResponse, NatsService } from '@guardian/common';
import {
    GenerateUUIDv4,
    IStatus,
    MessageAPI,
    StatusType,
    TaskAction,
} from '@guardian/interfaces';
import { Singleton } from '@helpers/decorators/singleton';
import { NatsConnection } from 'nats';

/**
 * WebSocketsServiceChannel
 */
@Singleton
export class TaskManagerChannel extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'task-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'task-reply-' + GenerateUUIDv4();

    /**
     * Register listener
     * @param event
     * @param cb
     */
    registerListener(event: string, cb: Function): void {
        this.getMessages(event, cb);
    }
}

/**
 * Task manager
 */
@Singleton
export class TaskManager {
    /**
     * Map of tasks
     */
    private readonly tasks: TaskCollection = new TaskCollection(); // Default - one day
    /**
     * WebSocket service
     */
    private wsService: WebSocketsService;
    /**
     * Message broker channel
     */
    private channel: TaskManagerChannel;

    /**
     * Cache of task expectations
     */
    private static readonly expectationMap = {
        'Create policy': 14,
        'Publish policy': 24,
        'Import policy file': 16,
        'Import policy message': 20,
        'Publish schema': 14,
        'Import schema file': 4,
        'Import schema message': 4,
        'Create schema': 10,
        'Preview schema message': 6,
        'Create random key': 4,
        'Connect user': 16,
        'Preview policy message': 6,
        'Create token': 5,
        'Associate/dissociate token': 6,
        'Grant/revoke KYC': 6,
        'Delete policy': 3,
        'Clone policy': 8,
    };

    /**
     * Set task manager dependecies
     * @param wsService
     * @param cn
     */
    public setDependecies(wsService: WebSocketsService, cn: NatsConnection) {
        this.wsService = wsService;
        this.channel = new TaskManagerChannel();
        this.channel.setConnection(cn);
        this.channel.getMessages(MessageAPI.UPDATE_TASK_STATUS, async (msg) => {
            console.log(msg)
            const { taskId, statuses, result, error } = msg;
            if (taskId) {
                if (statuses) {
                    this.addStatuses(taskId, statuses);
                }
                if (error) {
                    this.addError(taskId, error);
                } else if (result) {
                    this.addResult(taskId, result);
                }
            }

            return new MessageResponse({});
        });
        this.channel.subscribe(MessageAPI.PUBLISH_TASK, async (msg) => {
            const { taskId, action, userId, expectation } = msg;
            if (!this.tasks[taskId]) {
                this.tasks[taskId] = new Task(action, userId, expectation, taskId);
            }
        });
    }

    /**
     * Start new task
     * @param taskName
     * @returns { string, number } - task id and expected count of task phases
     */
    public start(action: TaskAction | string, userId: string): NewTask {
        const taskId = GenerateUUIDv4();
        if (this.tasks[taskId]) {
            throw new Error(`Task ${taskId} exists.`);
        }

        const expectation = this.getExpectation(action);
        this.tasks[taskId] = new Task(action, userId, expectation, taskId);
        this.channel.publish(MessageAPI.PUBLISH_TASK, {
            taskId,
            action,
            userId,
            expectation
        });
        return { taskId, expectation, action, userId };
    }

    /**
     * Add task statuses
     * @param taskId
     * @param statuses
     * @param skipIfNotFound
     */
    public addStatuses(
        taskId: string,
        statuses: IStatus[],
        skipIfNotFound: boolean = true
    ): void {
        const task = this.tasks[taskId];
        if (task) {
            task.statuses.push(...statuses);
            this.wsService.notifyTaskProgress(task);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    /**
     * Add task status
     * @param taskId
     * @param message
     * @param type
     * @param skipIfNotFound
     */
    public addStatus(
        taskId: string,
        message: string,
        type: StatusType,
        skipIfNotFound: boolean = true
    ) {
        this.addStatuses(taskId, [{ message, type }], skipIfNotFound);
    }

    /**
     * Set result for task
     * @param taskId
     * @param result
     * @param skipIfNotFound
     */
    public addResult(
        taskId: string,
        result: any,
        skipIfNotFound: boolean = true
    ): void {
        const task = this.tasks[taskId];
        if (task) {
            task.result = result;
            this.wsService.notifyTaskProgress(task);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }

        this.correctExpectation(task);
    }

    /**
     * Set error for task
     * @param taskId
     * @param error
     * @param skipIfNotFound
     */
    public addError(
        taskId: string,
        error: any,
        skipIfNotFound: boolean = true
    ): void {
        const task = this.tasks[taskId];
        if (task) {
            task.error = error;
            this.wsService.notifyTaskProgress(task);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    /**
     * Return task
     * @param taskId
     * @param skipIfNotFound
     * @returns {Task} - task data
     */
    public getState(taskId: string, skipIfNotFound: boolean = true): Task {
        if (this.tasks[taskId]) {
            return this.tasks[taskId];
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    /**
     * Return expectation for task
     * @param taskName
     * @returns {number} - expected count of task phases
     */
    private getExpectation(taskName: string): number {
        if (!TaskManager.expectationMap[taskName]) {
            TaskManager.expectationMap[taskName] = 2;
        }

        return TaskManager.expectationMap[taskName];
    }

    /**
     * Fix expectation by task
     * @param task
     */
    private correctExpectation(task: Task): void {
        const taskStatusCount = task.statuses.length;
        if (TaskManager.expectationMap[task.action] < taskStatusCount) {
            TaskManager.expectationMap[task.action] = taskStatusCount;
        }
    }
}

/**
 * New task interface
 */
interface NewTask {
    /**
     * Task id
     */
    taskId: string;
    /**
     * Action
     */
    action: TaskAction | string;
    /**
     * Expected count of task phases
     */
    expectation: number;
    /**
     * User id
     */
    userId: string;
}

/**
 * Map of tasks
 */
class TaskCollection {
    [taskId: string]: Task;

    constructor(delay: number = 1000 * 60 * 60 * 24 /* One day */) {
        const self = this;
        setInterval(() => {
            const old = new Date(new Date().valueOf() - delay);
            Object.keys(self)
                .filter((key) => self[key].date < old)
                .forEach((key) => {
                    delete self[key];
                });
        }, delay);
    }
}

/**
 * Task
 */
class Task {
    /**
     * Date&time of task creation
     */
    public date: Date = new Date();
    /**
     * Task statuses
     */
    public statuses: IStatus[] = [];
    /**
     * Result of task
     */
    public result: any;
    /**
     * Error of task
     */
    public error: any;

    constructor(
        public action: TaskAction | string,
        public userId: string,
        public expectation: number,
        public taskId: string,
    ) {}
}

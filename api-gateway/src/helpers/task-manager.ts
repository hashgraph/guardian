import { WebSocketsService } from '../api/service/websockets.js';
import { INotificationInfo, MessageResponse, NatsService } from '@guardian/common';
import {
    GenerateUUIDv4,
    IStatus,
    MessageAPI,
    StatusType,
    TaskAction,
} from '@guardian/interfaces';
import { Singleton } from '../helpers/decorators/singleton.js';
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
    private static readonly expectationMap: Map<TaskAction, number> = new Map([
        [TaskAction.CREATE_POLICY, 8],
        [TaskAction.WIZARD_CREATE_POLICY, 8],
        [TaskAction.PUBLISH_POLICY, 13],
        [TaskAction.IMPORT_POLICY_FILE, 15],
        [TaskAction.IMPORT_POLICY_MESSAGE, 17],
        [TaskAction.PUBLISH_SCHEMA, 8],
        [TaskAction.IMPORT_SCHEMA_FILE, 3],
        [TaskAction.IMPORT_SCHEMA_MESSAGE, 3],
        [TaskAction.CREATE_SCHEMA, 6],
        [TaskAction.PREVIEW_SCHEMA_MESSAGE, 4],
        [TaskAction.CREATE_RANDOM_KEY, 3],
        [TaskAction.CONNECT_USER, 9],
        [TaskAction.PREVIEW_POLICY_MESSAGE, 4],
        [TaskAction.CREATE_TOKEN, 4],
        [TaskAction.ASSOCIATE_TOKEN, 4],
        [TaskAction.DISSOCIATE_TOKEN, 4],
        [TaskAction.GRANT_KYC, 4],
        [TaskAction.REVOKE_KYC, 4],
        [TaskAction.DELETE_POLICY, 3],
        [TaskAction.CLONE_POLICY, 5],
        [TaskAction.CREATE_TOOL, 8],
        [TaskAction.IMPORT_TOOL_FILE, 9],
        [TaskAction.IMPORT_TOOL_MESSAGE, 11],
        [TaskAction.MIGRATE_DATA, 4],
        [TaskAction.PUBLISH_POLICY_LABEL, 4]
    ]);

    /**
     * NotifyTask lock
     */
    private readonly notifyTaskLock: Set<string> = new Set();

    /**
     * Callbacks
     */
    private readonly callbacks: Map<string, (task: Task) => Promise<void>> = new Map();

    /**
     * Notify task progress
     * @param taskId
     */
    private notifyTaskProgress(taskId: string, canSkip: boolean = false) {
        if (canSkip) {
            // Skip task if already in queue
            if (this.notifyTaskLock.has(taskId)) {
                return;
            }
            // Send websocket with rate limit
            setTimeout(() => {
                this.notifyTaskLock.delete(taskId);
                this.wsService.notifyTaskProgress(this.tasks[taskId]);
            }, 1 * 1000);
            this.notifyTaskLock.add(taskId);
        } else {
            this.wsService.notifyTaskProgress(this.tasks[taskId]);
        }
    }

    /**
     * Set task manager dependecies
     * @param wsService
     * @param cn
     */
    public setDependencies(wsService: WebSocketsService, cn: NatsConnection) {
        this.wsService = wsService;
        this.channel = new TaskManagerChannel();
        this.channel.setConnection(cn);

        this.channel.subscribe(MessageAPI.UPDATE_TASK_STATUS, async (msg) => {
            const { taskId, statuses, result, error, info } = msg;
            if (taskId) {
                if (info) {
                    this.addInfo(taskId, info);
                } else if (statuses) {
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
                this.tasks[taskId] = new Task(
                    action,
                    userId,
                    expectation,
                    taskId
                );
            }
        });
    }

    /**
     * Start new task
     * @param task
     * @param userId
     * @returns { NewTask } - New task
     */
    public start(action: TaskAction, userId: string): NewTask {
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
            expectation,
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
            this.notifyTaskProgress(taskId);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    /**
     * Add task statuses
     * @param taskId
     * @param statuses
     * @param skipIfNotFound
     */
    public addInfo(
        taskId: string,
        info: INotificationInfo,
        skipIfNotFound: boolean = true
    ): void {
        const task = this.tasks[taskId];
        if (task) {
            if (
                !task.info ||
                !task.info.timestamp ||
                info.timestamp >= task.info.timestamp
            ) {
                task.info = info;
            }
            this.notifyTaskProgress(taskId, true);
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
     * Cleanup After Callback
     * @param taskId
     */
    private cleanupAfterCallback(taskId: string): void {
        this.notifyTaskProgress(taskId);
        this.callbacks.delete(taskId);
    }

    /**
     * Handle Callback
     * @param taskId
     * @param task
     */
    private handleCallback(taskId: string, task: Task): void {
        const callback = this.callbacks.get(task.taskId);
        if (!callback) {
            this.notifyTaskProgress(taskId);
            return;
        }

        callback(task)
            .finally(() => this.cleanupAfterCallback(taskId));
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

            this.handleCallback(taskId, task);
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
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

            this.handleCallback(taskId, task);
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
    public getState(
        userId: string,
        taskId: string,
        skipIfNotFound: boolean = true
    ): Task {
        const task = this.tasks[taskId];
        if (task && task.userId === userId) {
            return this.tasks[taskId];
        } else if (skipIfNotFound) {
            return;
        } else {
            throw new Error(`Task ${taskId} not found.`);
        }
    }

    /**
     * Return expectation for task
     * @param action
     * @returns {number} - expected count of task phases
     */
    private getExpectation(action: TaskAction): number {
        let expectation = TaskManager.expectationMap.get(action);
        if (!expectation) {
            expectation = 2;
            TaskManager.expectationMap.set(action, expectation);
        }
        return expectation;
    }

    /**
     * Register Callback
     * @param task
     * @param callback
     */
    public registerCallback(task: NewTask, callback: (task: Task) => Promise<void>) {
        this.callbacks.set(task.taskId, callback);
    }
}

/**
 * New task interface
 */
export interface NewTask {
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
    /**
     * Info of task
     */
    public info: any;

    constructor(
        public action: TaskAction | string,
        public userId: string,
        public expectation: number,
        public taskId: string
    ) { }
}

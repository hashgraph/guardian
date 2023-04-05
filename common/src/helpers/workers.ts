import { Singleton } from '../decorators/singleton';
import { GenerateUUIDv4, IActiveTask, ITask, WorkerEvents } from '@guardian/interfaces';
import { Environment } from '../hedera-modules';
import { NatsService } from '../mq';
import { MessageResponse } from '../models';
import { doNothing } from './do-nothing';

/**
 * Workers helper
 */
@Singleton
export class Workers extends NatsService {
    /**
     * Tasks sended to work
     * @private
     */
    private readonly tasksCallbacks: Map<string, IActiveTask> = new Map();

    /**
     * Message queue name
     */
    public messageQueueName = 'workers-service-' + GenerateUUIDv4();

    /**
     * Reply subject
     * @private
     */
    public replySubject = this.messageQueueName + `-reply-${GenerateUUIDv4()}`;

    /**
     * Queue
     * @private
     */
    private readonly queue: Set<ITask> = new Set();

    /**
     * Max Repetitions
     * @private
     */
    private readonly maxRepetitions = 25;

    /**
     * Add non retryable task
     * @param task
     * @param priority
     */
    public addNonRetryableTask(task: ITask, priority: number): Promise<any> {
        if (!task.data.network) {
            task.data.network = Environment.network;
        }
        if (!task.data.nodes) {
            task.data.nodes = Environment.nodes;
        }
        if (!task.data.mirrorNodes) {
            task.data.mirrorNodes = Environment.mirrorNodes;
        }
        return this.addTask(task, priority, false);
    }

    /**
     * Add retryable task
     * @param task
     * @param priority
     * @param attempts
     */
    public addRetryableTask(task: ITask, priority: number, attempts: number = 0): Promise<any> {
        if (!task.data.network) {
            task.data.network = Environment.network;
        }
        if (!task.data.nodes) {
            task.data.nodes = Environment.nodes;
        }
        if (!task.data.mirrorNodes) {
            task.data.mirrorNodes = Environment.mirrorNodes;
        }
        return this.addTask(task, priority, true, attempts);
    }

    /**
     * Add retryable task
     * @param task
     * @param priority
     * @param isRetryableTask
     * @param attempts
     * @param registerCallback
     */
    private addTask(task: ITask, priority: number, isRetryableTask: boolean = false, attempts: number = 0, registerCallback = true): Promise<any> {
        const taskId = task.id || GenerateUUIDv4();
        task.id = taskId;
        task.priority = priority;
        attempts = attempts > 0 && attempts < this.maxRepetitions ? attempts : this.maxRepetitions;
        this.queue.add(task);

        const result = new Promise((resolve, reject) => {
            if (registerCallback) {
                this.tasksCallbacks.set(taskId, {
                    task,
                    number: 0,
                    callback: (data, error) => {
                        if (error) {
                            if (isRetryableTask) {
                                if (this.tasksCallbacks.has(taskId)) {
                                    const callback = this.tasksCallbacks.get(taskId);
                                    callback.number++;
                                    if (callback.number > attempts) {
                                        this.tasksCallbacks.delete(taskId);
                                        this.publish(WorkerEvents.TASK_COMPLETE_BROADCAST, { id: taskId, data, error });
                                        reject(error);
                                        return;
                                    }
                                }
                                task.sent = false;
                                this.queue.add(task);
                            } else {
                                this.publish(WorkerEvents.TASK_COMPLETE_BROADCAST, { id: taskId ,data, error });
                                reject(error);
                            }
                        } else {
                            this.tasksCallbacks.delete(task.id);
                            this.publish(WorkerEvents.TASK_COMPLETE_BROADCAST, { id: taskId, data, error });
                            resolve(data);
                        }
                    }
                });
            } else {
                resolve(null);
            }
        });

        this.searchAndUpdateTasks();

        return result;
    }

    /**
     * Get free workers
     * @private
     */
    private getFreeWorkers(): Promise<any[]> {
        const workers = [];

        return new Promise((resolve) => {
            this.publish(WorkerEvents.GET_FREE_WORKERS, {
                replySubject: [this.replySubject, WorkerEvents.WORKER_FREE_RESPONSE].join('.')
            });

            const subscription = this.subscribe([this.replySubject, WorkerEvents.WORKER_FREE_RESPONSE].join('.'), (msg) => {
                workers.push({
                    subject: msg.subject,
                    minPriority: msg.minPriority,
                    maxPriority: msg.maxPriority
                });
            });

            setTimeout(() => {
                subscription.unsubscribe();
                resolve(workers);
            }, 300);
        })
    }

    /**
     * Search and update tasks
     * @private
     */
    private async searchAndUpdateTasks(): Promise<void> {
        if ([...this.queue.values()].filter(i => !i.sent).length > 0) {
            for (const worker of await this.getFreeWorkers()) {
                const queue = [...this.queue.values()];
                const itemIndex = queue.findIndex(_item => {
                    return (_item.priority >= worker.minPriority) && (_item.priority <= worker.maxPriority) && !_item.sent
                });
                if (itemIndex === -1) {
                    return;
                }
                const item: any = queue[itemIndex];
                item.reply = this.messageQueueName;
                queue[itemIndex].sent = true;
                const r = await this.sendMessage(worker.subject, item) as any;
                if (r?.result) {
                    queue[itemIndex].sent = true;
                    this.queue.delete(item);
                    // this.queue.splice(itemIndex, 1);
                } else {
                    queue[itemIndex].sent = false;
                }
                // this.queue = this.queue.filter(item => !item.sent)
            }
        }
    }

    /**
     * Init listeners
     */
    public initListeners() {
        this.subscribe(WorkerEvents.WORKER_READY, async () => {
            await this.searchAndUpdateTasks();
        });

        setInterval(async () => {
            await this.searchAndUpdateTasks();
        }, 1000);

        this.subscribe([this.messageQueueName, WorkerEvents.TASK_COMPLETE].join('.'), async (msg: any) => {
            if (!msg.id) {
                throw new Error('Message without id');
            }
            if (msg.error) {
                console.log(msg);
            }
            if (this.tasksCallbacks.has(msg.id)) {
                const activeTask = this.tasksCallbacks.get(msg.id);
                activeTask.callback(msg.data, msg.error);
            }
        });
    }

    /**
     * Update worker settings
     */
    public updateSettings(settings: {
        /**
         * IPFS storage api key
         */
        ipfsStorageApiKey: string
    }) {
        console.log('update worker settings', settings);
        this.publish(WorkerEvents.UPDATE_SETTINGS, settings);
    }
}

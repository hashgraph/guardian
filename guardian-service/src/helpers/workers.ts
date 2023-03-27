import { Singleton } from '@helpers/decorators/singleton';
import { GenerateUUIDv4, IActiveTask, ITask, WorkerEvents } from '@guardian/interfaces';
import { doNothing, MessageResponse, NatsService } from '@guardian/common';
import { Environment } from '@hedera-modules';

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
    public messageQueueName = 'workers-queue-' + GenerateUUIDv4();

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'workers-queue-reply-' + GenerateUUIDv4();

    /**
     * Queue
     * @private
     */
    private readonly queue: ITask[] = [];

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
        this.queue.push(task);

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
                                        this.sendMessage(WorkerEvents.TASK_COMPLETE_BROADCAST, { id: taskId, data, error });
                                        reject(error);
                                        return;
                                    }
                                }
                                this.queue.push(task);
                            } else {
                                this.sendMessage(WorkerEvents.TASK_COMPLETE_BROADCAST, { id: taskId ,data, error });
                                reject(error);
                            }
                        } else {
                            this.tasksCallbacks.delete(task.id);
                            this.sendMessage(WorkerEvents.TASK_COMPLETE_BROADCAST, { id: taskId, data, error });
                            resolve(data);
                        }
                    }
                });
            } else {
                resolve(null);
            }
        });

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
                replySubject: [this.replySubject, WorkerEvents.WORKER_FREE_RESPONSE].join('-')
            });

            const subscription = this.subscribe([this.replySubject, WorkerEvents.WORKER_FREE_RESPONSE].join('-'), (msg) => {
                workers.push({
                    subject: msg.subject,
                    minPriority: msg.minPriority,
                    maxPriority: msg.maxPriority
                });
            });

            setTimeout(() => {
                subscription.unsubscribe();
                resolve(workers);
            }, 500);
        })
    }

    /**
     * Init listeners
     */
    public initListeners() {
        setInterval(async () => {
            if (this.queue.length > 0) {
                for (const worker of await this.getFreeWorkers()) {
                    const itemIndex = this.queue.findIndex(_item => {
                        return (_item.priority >= worker.minPriority) && (_item.priority <= worker.maxPriority)
                    });
                    if (itemIndex === -1) {
                        return;
                    }
                    const item: any = this.queue[itemIndex];
                    item.reply = this.messageQueueName;
                    const r = await this.sendMessage(worker.subject, item) as any;
                    if (r?.result) {
                        this.queue.splice(itemIndex, 1);
                    }
                }
            }
        }, 1000);

        this.getMessages([this.messageQueueName, WorkerEvents.TASK_COMPLETE].join('-'), async (msg: any) => {
            console.log('TASK_COMPLETE', msg.id);
            if (this.tasksCallbacks.has(msg.id)) {
                const activeTask = this.tasksCallbacks.get(msg.id);

                activeTask.callback(msg.data, msg.error);
            }
        });

        this.getMessages(WorkerEvents.PUSH_TASK, async (msg: any) => {
            const { task, priority, isRetryableTask, attempts } = msg;
            this.addTask(task, priority, isRetryableTask, attempts).then(doNothing, doNothing);
            return new MessageResponse(null);
        })
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

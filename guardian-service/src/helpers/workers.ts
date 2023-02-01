import { Singleton } from '@helpers/decorators/singleton';
import { GenerateUUIDv4, IActiveTask, ITask, IWorkerRequest, WorkerEvents } from '@guardian/interfaces';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
import { MessageResponse } from '@guardian/common';
import { Environment } from '@hedera-modules';

/**
 * Workers helper
 */
@Singleton
export class Workers extends ServiceRequestsBase {
    /**
     * Tasks sended to work
     * @private
     */
    private readonly tasksCallbacks: Map<string, IActiveTask> = new Map();

    /**
     * Target
     */
    public target: string = 'worker.*';

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
        return this.addTask(task, priority, true, attempts);
    }

    /**
     * Add retryable task
     * @param task
     * @param priority
     * @param isRetryableTask
     * @param attempts
     */
    private addTask(task: ITask, priority: number, isRetryableTask: boolean = false, attempts: number = 0, registerCallback = true): Promise<any> {
        const taskId = GenerateUUIDv4()
        task.id = task.id || taskId;
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
                                        reject(error);
                                        return;
                                    }
                                }
                                this.queue.push(task);
                            } else {
                                reject(error);
                            }
                        } else {
                            this.tasksCallbacks.delete(taskId);
                            resolve(data);
                        }
                    }
                });
            }
        });
        this.channel.publish(WorkerEvents.QUEUE_UPDATED, null);
        return result;
    }

    /**
     * Init listeners
     */
    public initListeners() {
        this.channel.response(WorkerEvents.QUEUE_GET, async (msg: IWorkerRequest) => {
            const itemIndex = this.queue.findIndex(_item => {
                return (_item.priority >= msg.minPriority) && (_item.priority <= msg.maxPriority)
            });
            if (itemIndex === -1) {
                return new MessageResponse(null);
            }
            const item = this.queue[itemIndex];
            this.queue.splice(itemIndex, 1);
            return new MessageResponse(item || null);
        });

        this.channel.response(WorkerEvents.TASK_COMPLETE, async (msg: any) => {
            const activeTask = this.tasksCallbacks.get(msg.id);

            if (!activeTask) {
                this.channel.publish(WorkerEvents.TASK_COMPLETE_BROADCAST, msg);
            }

            activeTask.callback(msg.data, msg.error);
            return new MessageResponse(null);
        });

        this.channel.response(WorkerEvents.PUSH_TASK, async (msg: any) => {
            const { task, priority, isRetryableTask, attempts } = msg;
            this.addTask(task, priority, isRetryableTask, attempts, false);
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
        this.channel.publish(WorkerEvents.UPDATE_SETTINGS, settings);
    }
}

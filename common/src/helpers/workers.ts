import { Singleton } from '../decorators/singleton';
import {
    GenerateUUIDv4,
    HederaResponseCode,
    IActiveTask,
    ITask,
    WorkerEvents,
} from '@guardian/interfaces';
import { Environment } from '../hedera-modules';
import { NatsService } from '../mq';

export const NON_RETRYABLE_HEDERA_ERRORS = [
    // Insufficient type errors
    HederaResponseCode.INSUFFICIENT_ACCOUNT_BALANCE,
    HederaResponseCode.INSUFFICIENT_GAS,
    HederaResponseCode.INSUFFICIENT_LOCAL_CALL_GAS,
    HederaResponseCode.INSUFFICIENT_PAYER_BALANCE,
    HederaResponseCode.INSUFFICIENT_PAYER_BALANCE_FOR_CUSTOM_FEE,
    HederaResponseCode.INSUFFICIENT_SENDER_ACCOUNT_BALANCE_FOR_CUSTOM_FEE,
    HederaResponseCode.INSUFFICIENT_TOKEN_BALANCE,
    HederaResponseCode.INSUFFICIENT_TX_FEE,

    // Token type errors
    HederaResponseCode.MISSING_TOKEN_SYMBOL,
    HederaResponseCode.MISSING_TOKEN_NAME,
    HederaResponseCode.INVALID_TOKEN_ID,
    HederaResponseCode.TOKEN_WAS_DELETED,
    HederaResponseCode.INVALID_ADMIN_KEY,

    // Associate type errors
    HederaResponseCode.TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR,
    HederaResponseCode.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT,
    HederaResponseCode.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT,

    // KYC type errors
    HederaResponseCode.ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN,
    HederaResponseCode.INVALID_KYC_KEY,
    HederaResponseCode.TOKEN_HAS_NO_KYC_KEY,

    // Freeze type errors
    HederaResponseCode.INVALID_FREEZE_KEY,
    HederaResponseCode.TOKEN_HAS_NO_FREEZE_KEY,

    // Mint type errors
    HederaResponseCode.INVALID_TOKEN_MINT_AMOUNT,
    HederaResponseCode.INVALID_TOKEN_MINT_METADATA,
    HederaResponseCode.SENDER_DOES_NOT_OWN_NFT_SERIAL_NO,

    // Wipe type errors
    HederaResponseCode.CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT,
    HederaResponseCode.TOKEN_HAS_NO_WIPE_KEY,
    HederaResponseCode.INVALID_WIPE_KEY,

    // Burn type errors
    HederaResponseCode.INVALID_TOKEN_BURN_AMOUNT,
    HederaResponseCode.INVALID_TOKEN_BURN_METADATA,

    // Pause type errors
    HederaResponseCode.INVALID_PAUSE_KEY,
    HederaResponseCode.TOKEN_HAS_NO_PAUSE_KEY,
    HederaResponseCode.TOKEN_IS_PAUSED,

    // Account type errors
    HederaResponseCode.ACCOUNT_FROZEN_FOR_TOKEN,
    HederaResponseCode.ACCOUNT_IS_TREASURY,
    HederaResponseCode.INVALID_ACCOUNT_ID,
    HederaResponseCode.ACCOUNT_DELETED,
    HederaResponseCode.INVALID_SIGNATURE,

    // Contract type errors
    HederaResponseCode.CONTRACT_REVERT_EXECUTED
];

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
     * Check error message for retryable
     * @param error Error
     * @returns Is not retryable
     */
    public static isNotRetryableError(error: any) {
        return typeof error === 'string'
            && NON_RETRYABLE_HEDERA_ERRORS.some(code => error.indexOf(code) !== -1);
    }

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
                            if (isRetryableTask && !Workers.isNotRetryableError(error)) {
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

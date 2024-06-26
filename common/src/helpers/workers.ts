import { Singleton } from '../decorators/singleton.js';
import { GenerateUUIDv4, HederaResponseCode, IActiveTask, ITask, QueueEvents, TimeoutError, WorkerEvents, } from '@guardian/interfaces';
import { Environment } from '../hedera-modules/index.js';
import { NatsService } from '../mq/index.js';

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
    // private readonly maxRepetitions = 25;

    private _wrapError(error, isTimeoutError?: boolean): any {
        if (isTimeoutError) {
            return new TimeoutError(error);
        }
        return error;
    }

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
     * @param userId
     */
    public addNonRetryableTask(task: ITask, priority: number, userId?: string | null): Promise<any> {
        if (!task.data.network) {
            task.data.network = Environment.network;
        }
        if (!task.data.nodes) {
            task.data.nodes = Environment.nodes;
        }
        if (!task.data.mirrorNodes) {
            task.data.mirrorNodes = Environment.mirrorNodes;
        }
        if (!task.data.localNodeAddress) {
            task.data.localNodeAddress = Environment.localNodeAddress;
        }
        if (!task.data.localNodeProtocol) {
            task.data.localNodeProtocol = Environment.localNodeProtocol;
        }
        return this.addTask(task, priority, false, 0, true, userId);
    }

    /**
     * Add retryable task
     * @param task
     * @param priority
     * @param attempts
     * @param userId
     */
    public addRetryableTask(task: ITask, priority: number, attempts: number = 0, userId: string = null): Promise<any> {
        if (!task.data.network) {
            task.data.network = Environment.network;
        }
        if (!task.data.nodes) {
            task.data.nodes = Environment.nodes;
        }
        if (!task.data.mirrorNodes) {
            task.data.mirrorNodes = Environment.mirrorNodes;
        }
        if (!task.data.localNodeAddress) {
            task.data.localNodeAddress = Environment.localNodeAddress;
        }
        if (!task.data.localNodeProtocol) {
            task.data.localNodeProtocol = Environment.localNodeProtocol;
        }
        return this.addTask(task, priority, true, attempts, true, userId);
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

        this.subscribe(QueueEvents.TASK_COMPLETE, async (data: any) => {
            if (!data.id) {
                throw new Error('Message without id');
            }
            if (data.error) {
                console.error(data);
            }
            if (this.tasksCallbacks.has(data.id)) {
                const activeTask = this.tasksCallbacks.get(data.id);
                activeTask.callback(data.data, data.error, data.isTimeoutError);
            }

        })
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
                } else {
                    queue[itemIndex].sent = false;
                }
            }
        }
    }

    /**
     * Add retryable task
     * @param task
     * @param priority
     * @param isRetryableTask
     * @param attempts
     * @param registerCallback
     * @param userId
     */
    private async addTask(task: ITask, priority: number, isRetryableTask: boolean = false, attempts: number = 0, registerCallback = true, userId?: string | null): Promise<any> {
        const taskId = task.id || GenerateUUIDv4();
        task.id = taskId;
        task.priority = priority;
        task.isRetryableTask = isRetryableTask;
        task.attempts = attempts;
        task.userId = userId;

        const addTaskToQueue = async (): Promise<void> => {
            const result = await this.sendMessage<any>(QueueEvents.ADD_TASK_TO_QUEUE, task);
            if (!result?.ok) {
                console.log(result);
                await addTaskToQueue();
            }
        }
        await addTaskToQueue();

        return new Promise((resolve, reject) => {
            if (registerCallback) {
                this.tasksCallbacks.set(taskId, {
                    task,
                    number: 0,
                    callback: async (data, error, isTimeoutError) => {
                        if (error) {
                            reject(this._wrapError(error, isTimeoutError));
                            return;
                        }
                        resolve(data);
                    }
                })
            } else {
                resolve(null);
            }
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
        this.publish(WorkerEvents.UPDATE_SETTINGS, settings);
    }
}

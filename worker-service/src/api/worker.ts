import { Logger, MessageBrokerChannel } from '@guardian/common';
import {
    ExternalMessageEvents,
    ITask,
    ITaskResult,
    IWorkerRequest,
    WorkerEvents,
    WorkerTaskType
} from '@guardian/interfaces';
import { HederaSDKHelper } from './helpers/hedera-sdk-helper';
import { Environment } from './helpers/environment';
import { IpfsClient } from './ipfs-client';
import Blob from 'cross-blob';

/**
 * Sleep helper
 * @param t
 */
function rejectTimeout(t: number): Promise<void> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Timeout error'));
        }, t);
    })
}

/**
 * Worker class
 */
export class Worker {
    /**
     * Logger instance
     * @private
     */
    private logger: Logger;

    /**
     * Current task ID
     */
    private currentTaskId: string;

    /**
     * Update event received flag
     * @private
     */
    private updateEventReceived = false;

    /**
     * Worker in use
     * @private
     */
    private _isInUse: boolean = false;

    /**
     * Ipfs client
     * @private
     */
    private ipfsClient: IpfsClient;

    /**
     * Worker in use getter
     * @private
     */
    private get isInUse(): boolean {
        return this._isInUse;
    }

    /**
     * Worker in use setter
     * @private
     */
    private set isInUse(v: boolean) {
        this._isInUse = v;
    }

    /**
     * Minimum priority
     * @private
     */
    private readonly minPriority: number;

    /**
     * Maximum priority
     * @private
     */
    private readonly maxPriority: number;

    /**
     * Task timeout
     * @private
     */
    private readonly taskTimeout: number;

    /**
     * Channel Name
     * @private
     */
    private readonly _channelName: string;

    constructor(
        private readonly channel: MessageBrokerChannel
    ) {
        this.logger = new Logger();
        this.ipfsClient = new IpfsClient(process.env.IPFS_STORAGE_API_KEY);
        this.minPriority = parseInt(process.env.MIN_PRIORITY, 10);
        this.maxPriority = parseInt(process.env.MAX_PRIORITY, 10);
        this.taskTimeout = parseInt(process.env.TASK_TIMEOUT, 10) * 1000; // env in seconds
        this._channelName = process.env.SERVICE_CHANNEL.toUpperCase();
    }

    /**
     * Initialize worker
     */
    public init(): void {
        setInterval(() => {
            if (!this.isInUse) {
                this.getItem().then();
            }
        }, parseInt(process.env.REFRESH_INTERVAL, 10) * 1000);

        this.channel.subscribe(WorkerEvents.QUEUE_UPDATED, () => {
            if (!this.isInUse) {
                this.getItem().then();
            } else {
                this.updateEventReceived = true;
            }
        });
    }

    /**
     * Request to guardian service method
     * @param entity
     * @param params
     * @param type
     */
    private async request<T extends any>(entity: string, params?: IWorkerRequest | ITaskResult, type?: string): Promise<T> {
        try {
            const response = await this.channel.request<any, T>(`guardians.${entity}`, params);
            if (!response) {
                throw new Error('Server is not available');
            }
            if (response.error) {
                throw new Error(response.error);
            }
            return response.body;
        } catch (error) {
            throw new Error(`Guardian (${entity}) send: ` + error);
        }
    }

    /**
     * Clear states
     * @private
     */
    private clearState(): void {
        this.isInUse = false;
        this.currentTaskId = null;
        this.updateEventReceived = false;
    }

    /**
     * Task actions
     * @param task
     * @private
     */
    private async processTask(task: ITask): Promise<ITaskResult> {
        const result: ITaskResult = {
            id: this.currentTaskId
        }

        try {
            switch (task.type) {
                case WorkerTaskType.ADD_FILE: {
                    let fileContent = Buffer.from(task.data.payload.content, 'base64');
                    const data = await this.channel.request<any, any>(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT, task.data.payload);
                    if (data && data.body) {
                        fileContent = Buffer.from(data.body, 'base64')
                    }
                    const blob: any = new Blob([fileContent]);
                    const r = await this.ipfsClient.addFiile(blob);
                    this.channel.publish(ExternalMessageEvents.IPFS_ADDED_FILE, r);
                    result.data = r;
                }
                    break;

                case WorkerTaskType.GET_FILE: {
                    if (!task.data.payload || !task.data.payload.cid || !task.data.payload.responseType) {
                        result.error = 'Invalid CID';
                    } else {
                        let fileContent = await this.ipfsClient.getFile(task.data.payload.cid);
                        if (fileContent instanceof Buffer) {
                            const data = await this.channel.request<any, any>(ExternalMessageEvents.IPFS_AFTER_READ_CONTENT, {
                                responseType: !task.data.payload.responseType,
                                content: fileContent.toString('base64'),
                            });
                            if (data && data.body) {
                                fileContent = Buffer.from(data.body, 'base64')
                            }
                        }

                        switch (task.data.payload.responseType) {
                            case 'str':
                                result.data = Buffer.from(fileContent, 'binary').toString();
                                break;

                            case 'json':
                                result.data = Buffer.from(fileContent, 'binary').toJSON();
                                break;

                            default:
                                result.data = fileContent
                        }
                    }
                }
                    break;

                case WorkerTaskType.SEND_HEDERA:
                    Environment.setNetwork(task.data.network);
                    Environment.setLocalNodeAddress(task.data.localNodeAddress);
                    Environment.setLocalNodeProtocol(task.data.localNodeProtocol);
                    const { operatorId, operatorKey, dryRun } = task.data.clientOptions;
                    const client = new HederaSDKHelper(operatorId, operatorKey, dryRun);
                    const { topicId, buffer, submitKey, memo } = task.data;
                    result.data = await client.submitMessage(topicId, buffer, submitKey, memo);
                    break;

                default:
                    result.error = 'unknown task'
            }
            ///////
        } catch (e) {
            result.error = e.message;
        }

        return result;
    }

    /**
     * Process with timeout
     * @param task
     * @private
     */
    private processTaskWithTimeout(task: ITask): Promise<ITaskResult> {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await Promise.race([
                    this.processTask(task),
                    rejectTimeout(this.taskTimeout)
                ]);
                resolve(result as ITaskResult);
            } catch (e) {
                const error = {
                    id: this.currentTaskId,
                    error: 'Unknown error'
                }
                if (e) {
                    error.error = e.message || e;
                }
                resolve(error);
            }
        })
    }

    /**
     * Get item from queue
     */
    public async getItem(): Promise<any> {
        this.isInUse = true;

        this.logger.info(`Search task`, [this._channelName]);

        let task: any = null;
        try {
            task = await Promise.race([
                this.request(WorkerEvents.QUEUE_GET, {
                    minPriority: this.minPriority,
                    maxPriority: this.maxPriority,
                    taskTimeout: this.taskTimeout
                }),
                rejectTimeout(this.taskTimeout)
            ]);
        } catch (e) {
            this.clearState();
            return;
        }

        if (!task) {
            this.isInUse = false;

            this.logger.info(`Task not found`, [this._channelName]);

            if (this.updateEventReceived) {
                this.updateEventReceived = false;
                this.getItem().then();
            }

            return;
        }

        this.currentTaskId = task.id;

        this.logger.info(`Task started: ${task.id}, ${task.type}`, [this._channelName]);

        const result = await this.processTaskWithTimeout(task);

        try {
            await this.request(WorkerEvents.TASK_COMPLETE, result);
            this.logger.info(`Task completed: ${this.currentTaskId}`, [this._channelName]);
        } catch (error) {
            this.logger.error(error.message, [this._channelName]);
            this.clearState();

        }

        this.getItem().then();
    }
}

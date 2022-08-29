import { MessageBrokerChannel } from '@guardian/common';
import {
    IAddFileMessage,
    ITask,
    ITaskResult,
    IWorkerRequest,
    WorkerEvents,
    WorkerTaskType
} from '@guardian/interfaces';
import { HederaSDKHelper } from './helpers/hedera-sdk-helper';
import { Environment } from './helpers/environment';

/**
 * Sleep helper
 * @param t
 */
function sleep(t: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, t);
    })
}

/**
 * Worker class
 */
export class Worker {
    /**
     * Worker in use
     * @private
     */
    private isInUse: boolean = false;

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

    constructor(
        private readonly channel: MessageBrokerChannel
    ) {
        this.minPriority = parseInt(process.env.MIN_PRIORITY, 10);
        this.maxPriority = parseInt(process.env.MAX_PRIORITY, 10);
        this.taskTimeout = parseInt(process.env.TASK_TIMEOUT, 10) * 1000; // env in seconds

        setInterval(async () => {
            if (!this.isInUse) {
                await this.getItem();
            }
        }, parseInt(process.env.REFRESH_INTERVAL, 10) * 1000)

        this.channel.subscribe(WorkerEvents.QUEUE_UPDATED, async (data: unknown) => {
            if (!this.isInUse) {
                await this.getItem();
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
     * Get item from queue
     */
    public async getItem(): Promise<any> {
        this.isInUse = true;
        const task: any = await this.request(WorkerEvents.QUEUE_GET, {
            minPriority: this.minPriority,
            maxPriority: this.maxPriority,
            taskTimeout: this.taskTimeout
        });
        if (!task) {
            this.isInUse = false;
            return;
        }

        const result: ITaskResult = {
            id: task.id
        }

        /**
         * Actions
         */
        try {
            switch (task.type) {
                case WorkerTaskType.GET_FILE:
                case WorkerTaskType.ADD_FILE:
                    result.data = await this.channel.request<IAddFileMessage, any>(task.data.target, task.data.payload);
                    break;

                case WorkerTaskType.SEND_HEDERA:
                    Environment.setNetwork(task.data.network);
                    Environment.setLocalNodeAddress(task.data.localNodeAddress);
                    Environment.setLocalNodeProtocol(task.data.localNodeProtocol);
                    const {operatorId, operatorKey, dryRun} = task.data.clientOptions;
                    const client = new HederaSDKHelper(operatorId, operatorKey, dryRun);
                    const {topicId, buffer, submitKey} = task.data;
                    result.data = await client.submitMessage(topicId, buffer, submitKey);
                    break;

                default:
                    result.error = 'unknown task'
            }
            ///////
        } catch (e) {
            result.error = e.message;
        }

        await this.request(WorkerEvents.TASK_COMPLETE, result);

        await this.getItem();
    }
}

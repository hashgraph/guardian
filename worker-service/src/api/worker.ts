import { MessageBrokerChannel, MessageResponse } from '@guardian/common';

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

    constructor(
        private readonly channel: MessageBrokerChannel
    ) {
        this.minPriority = parseInt(process.env.MIN_PRIORITY, 10);
        this.maxPriority = parseInt(process.env.MAX_PRIORITY, 10)

        this.channel.subscribe('queue-updated', async (data: unknown) => {
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
    private async request<T extends any>(entity: string, params?: any, type?: string): Promise<T> {
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
        const task: any = await this.request('queue-get', {
            minPriority: this.minPriority,
            maxPriority: this.maxPriority
        });
        if (!task) {
            this.isInUse = false;
            return;
        }

        await sleep(10000);
        await this.request('complete-task', {
            taskId: task.id,
            data: {
                complete: true
            }
        })

        /**
         * Actions
         */
        this.isInUse = false;
        await this.getItem();
    }
}

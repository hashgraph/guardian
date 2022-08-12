import { MessageBrokerChannel, MessageResponse } from '@guardian/common';

/**
 * Worker class
 */
export class Worker {
    /**
     * Worker in use
     * @private
     */
    private isInUse: boolean = false;

    constructor(
        private readonly channel: MessageBrokerChannel
    ) {
        this.channel.response('queue-updated', async (msg) => {
            if (!this.isInUse) {
                await this.getItem();
            }
            return new MessageResponse(null);
        })
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
        const task = await this.request('queue-get');
        console.log(task);
        if (!task) {
            this.isInUse = false;
            return;
        }
        /**
         * Actions
         */
        this.isInUse = false;
        await this.getItem();
    }
}

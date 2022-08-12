import { Singleton } from '@helpers/decorators/singleton';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
import { MessageResponse } from '@guardian/common';

/**
 * Workers helper
 */
@Singleton
export class Workers extends ServiceRequestsBase {
    /**
     * Target
     */
    public target: string = 'worker'

    /**
     * Queue
     * @private
     */
    private queue = [];

    /**
     * Add task
     * @param task
     */
    public async addTask(task: any): Promise<void> {
        task.id = GenerateUUIDv4();
        this.queue.push(task);

        await this.request('queue-updated');
    }

    /**
     * Init listeners
     */
    public initListeners() {
        this.channel.response('queue-get', async (msg) => {
            const item = this.queue.shift();

            return new MessageResponse(item);
        });
    }
}

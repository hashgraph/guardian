import { Singleton } from '@helpers/decorators/singleton';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { ServiceRequestsBase } from '@helpers/service-requests-base';

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
    private queue = new Set<unknown>();

    /**
     * Add task
     * @param task
     */
    public async addTask(task: any): Promise<void> {
        task.id = GenerateUUIDv4();
        this.queue.add(task);
    }
}

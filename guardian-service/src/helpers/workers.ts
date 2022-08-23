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
     * Tasks sended to work
     * @private
     */
    private tasksCallbacks: Map<string, (data: any) => void> = new Map();

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
    public addTask(task: any, priority: number): Promise<any> {
        const taskId = GenerateUUIDv4()
        task.id = taskId;
        task.priority = priority;
        this.queue.push(task);
        this.channel.publish('queue-updated', null)

        return new Promise(resolve => {
            this.tasksCallbacks.set(taskId, (data) => {
                resolve(data);
                this.tasksCallbacks.delete(taskId);
            });
        });

    }

    /**
     * Init listeners
     */
    public initListeners() {
        this.channel.response('queue-get', async (msg: any) => {
            const itemIndex = this.queue.findIndex(_item => {
                return (_item.priority >= msg.minPriority) && (_item.priority <= msg.maxPriority)
            })
            const item = this.queue[itemIndex];
            this.queue.splice(itemIndex, 1);

            return new MessageResponse(item);
        });

        this.channel.response('complete-task', async (msg: any) => {
            const fn = this.tasksCallbacks.get(msg.taskId);
            fn(msg.data);
            return new MessageResponse(null);
        });
    }
}

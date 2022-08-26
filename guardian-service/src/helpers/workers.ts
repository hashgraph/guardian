import { Singleton } from '@helpers/decorators/singleton';
import { GenerateUUIDv4, IActiveTask, ITask, IWorkerRequest, WorkerEvents } from '@guardian/interfaces';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
import { MessageResponse } from '@guardian/common';

/**
 * Workers helper
 */
@Singleton
export class Workers extends ServiceRequestsBase {

    /**
     * Getting task
     * @private
     */
    private gettingTask = true;

    /**
     * Tasks sended to work
     * @private
     */
    private tasksCallbacks: Map<string, IActiveTask> = new Map();

    /**
     * Target
     */
    public target: string = 'worker.*';

    /**
     * Queue
     * @private
     */
    private queue: ITask[] = [];

    /**
     * Add task
     * @param task
     */
    public addTask(task: ITask, priority: number): Promise<any> {
        const taskId = GenerateUUIDv4()
        task.id = taskId;
        task.priority = priority;
        this.queue.push(task);
        this.channel.publish(WorkerEvents.QUEUE_UPDATED, null)

        return new Promise((resolve, reject) => {
            this.tasksCallbacks.set(taskId, {
                task,
                callback: (data, error) => {
                    if (error) {
                        this.queue.push(task);
                        reject(error);
                    } else {
                        resolve(data);
                    }
                    this.tasksCallbacks.delete(taskId);
                }
            });
        });

    }

    /**
     * Init listeners
     */
    public initListeners() {
        this.channel.response(WorkerEvents.QUEUE_GET, async (msg: IWorkerRequest) => {
            const itemIndex = this.queue.findIndex(_item => {
                return (_item.priority >= msg.minPriority) && (_item.priority <= msg.maxPriority)
            })
            const item = this.queue[itemIndex];
            this.queue.splice(itemIndex, 1);

            return new MessageResponse(item || null);
        });

        this.channel.response(WorkerEvents.TASK_COMPLETE, async (msg: any) => {
            const activeTask = this.tasksCallbacks.get(msg.id);
            activeTask.callback(msg.data, msg.error);
            this.tasksCallbacks.delete(msg.id);
            return new MessageResponse(null);
        });
    }
}

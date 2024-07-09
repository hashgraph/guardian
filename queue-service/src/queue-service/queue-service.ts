import { DataBaseHelper, MessageError, MessageResponse, NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4, ITask, OrderDirection, QueueEvents, WorkerEvents } from '@guardian/interfaces';
import { TaskEntity } from '../entity/task';

@Singleton
export class QueueService extends NatsService{
    public messageQueueName = 'queue-service';
    public replySubject = 'reply-queue-service-' + GenerateUUIDv4();

    private refreshInterval = 1 * 1000; // 1s

    public async init() {
        await super.init();

        // worker job
        setInterval(async () => {
            await this.refreshAndReassignTasks();
            await this.clearOldTasks();
            await this.clearLongPendingTasks();
        }, this.refreshInterval);

        this.getMessages(QueueEvents.ADD_TASK_TO_QUEUE, (task: ITask) => {
            try {
                this.addTaskToQueue(task);
                return new MessageResponse({
                    ok: true
                });
            } catch (error) {
                return new MessageResponse({
                    ok: false,
                    reason: error.message,
                })
            }
        });

        this.getMessages(WorkerEvents.TASK_COMPLETE, async (data: any) => {
            const task = await new DataBaseHelper(TaskEntity).findOne({taskId: data.id});
            if (!data.error || !task.isRetryableTask) {
                await this.completeTaskInQueue(data.id, data.data, data.error);
                return;
            }
            if (task.isRetryableTask && (task.attempts > 0)) {
                if (task.attempts > task.attempt) {
                    task.processedTime = null;
                    task.sent = false;
                    task.attempt = task.attempt + 1;
                } else {
                    if (!task.userId) {
                        await this.completeTaskInQueue(data.id, data.data, data.error);
                    }
                }
            } else {
                task.attempt = 0;
                task.isError = true;
                task.errorReason = data.error;

                if (!task.userId) {
                    await this.completeTaskInQueue(data.id, data.data, data.error);
                }
            }

            await new DataBaseHelper(TaskEntity).save(task);
        });

        this.getMessages(QueueEvents.GET_TASKS_BY_USER, async (data: { userId: string, pageIndex: number, pageSize: number }) => {
            const {userId, pageSize, pageIndex} = data;
            const options: any =
                typeof pageIndex === 'number' && typeof pageSize === 'number'
                    ? {
                        orderBy: {
                            createDate: OrderDirection.DESC,
                        },
                        limit: pageSize,
                        offset: pageIndex * pageSize,
                    }
                    : {
                        orderBy: {
                            processedTime: OrderDirection.DESC,
                        },
                    };
            const result = await new DataBaseHelper(TaskEntity).findAndCount({userId}, options);
            for (const task of result[0]) {
                if (task.data) {
                    delete task.data;
                    delete task.userId;
                    delete task.priority;
                    delete task.attempt;
                    delete task.attempts;
                    delete task._id;
                }
            }
            return new MessageResponse(result);
        })

        this.getMessages(QueueEvents.RESTART_TASK, async (data: { taskId: string, userId: string }) => {
            const task = await new DataBaseHelper(TaskEntity).findOne({taskId: data.taskId});
            if (data.userId !== task.userId) {
                throw new MessageError('Wrong user')
            }
            task.isError = false;
            task.attempt = 0;
            task.sent = false;
            task.processedTime = null;
            task.errorReason = undefined;
            await new DataBaseHelper(TaskEntity).save(task);
        });

        this.getMessages(QueueEvents.DELETE_TASK, async (data: { taskId: string, userId: string }) => {
            const task = await new DataBaseHelper(TaskEntity).findOne({taskId: data.taskId});
            if (data.userId !== task.userId) {
                throw new MessageError('Wrong user')
            }
            await this.completeTaskInQueue(data.taskId, null, task.errorReason);
            await new DataBaseHelper(TaskEntity).delete({taskId: data.taskId});
        });
    }

    async addTaskToQueue(task: ITask): Promise<void> {
        const te = new DataBaseHelper(TaskEntity).create(this.iTaskToTaskEntity(task));
        te.processedTime = null;
        await new DataBaseHelper(TaskEntity).save(te);
    }

    async completeTaskInQueue(taskId: string, data: any, error: any): Promise<void> {
        const task = await new DataBaseHelper(TaskEntity).findOne({taskId});
        if (!task) {
            return;
        }
        if (error) {
            task.isError = true;
            task.errorReason = error;
        } else {
            task.done = true;
        }
        await new DataBaseHelper(TaskEntity).save(task);

        await this.publish(QueueEvents.TASK_COMPLETE, {
            id: taskId,
            data,
            error
        });
    }

    private iTaskToTaskEntity(task: ITask): ITask {
        task.taskId = task.id;
        task.attempt = 0;
        delete task.id;
        return task;
    }

    private taskEntityToITask(task: TaskEntity): ITask {
        return {
            id: task.taskId,
            priority: task.priority,
            type: task.type,
            data: task.data,
        };
    }

    private async refreshAndReassignTasks() {
        const workers = await this.getFreeWorkers();
        for (const worker of workers) {
            const task = await new DataBaseHelper(TaskEntity).findOne({
                priority: {
                    $gte: worker.minPriority,
                    $lte: worker.maxPriority
                },
                processedTime: null
            });
            if (!task) {
                continue;
            }
            const r = await this.sendMessage(worker.subject, this.taskEntityToITask(task)) as any;
            if (r?.result) {
                task.processedTime = new Date();
                task.sent = true;
                await new DataBaseHelper(TaskEntity).save(task);
            } else {
                console.log('task sent error')
            }
        }
    }

    private async clearOldTasks() {
        await new DataBaseHelper(TaskEntity).delete({
            processedTime: {
                $lte: new Date(new Date().getTime() - 30 * 60000)
            },
            done: true
        });
    }

    private async clearLongPendingTasks() {
        const tasks = await new DataBaseHelper(TaskEntity).find({
            $where: '(this.processedTime - this.createDate) > ( 1 * 60 * 60000)',
            sent: true,
            done: {$ne: true}
        });
        for (const task of tasks) {
            task.processedTime = null;
            task.sent = false;
            await new DataBaseHelper(TaskEntity).save(task);
        }
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

}

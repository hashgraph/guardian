import { DatabaseServer, IAuthUser, MAP_TASKS_AGGREGATION_FILTERS, MessageError, MessageResponse, NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4, ITask, OrderDirection, QueueEvents, WorkerEvents } from '@guardian/interfaces';
import { TaskEntity } from '../entity/task.js';

@Singleton
export class QueueService extends NatsService {
    public messageQueueName = 'queue-service';
    public replySubject = 'reply-queue-service-' + GenerateUUIDv4();

    private readonly clearInterval = parseInt(process.env.CLEAR_INTERVAL, 10) || 30 * 1000; // 1m
    private readonly refreshInterval = parseInt(process.env.REFRESH_INTERVAL, 10) || 1 * 1000; // 1s
    private readonly processTimeout = parseInt(process.env.PROCESS_TIMEOUT, 10) || 1 * 60 * 60000; // 1 hour

    private trigger: boolean = false;

    public async init() {
        await super.init();

        // worker jobs
        setInterval(async () => {
            await this.refreshAndReassignTasks();
        }, this.refreshInterval);
        setInterval(async () => {
            await this.clearOldTasks();
            await this.clearLongPendingTasks();
        }, this.clearInterval);

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
            const dataBaseServer = new DatabaseServer();

            const task = await dataBaseServer.findOne(TaskEntity, { taskId: data.id });
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
                    task.isError = true;
                    task.errorReason = data.error;
                    if (!task.interception) {
                        await this.completeTaskInQueue(data.id, data.data, data.error);
                    }
                }
            } else {
                task.attempt = 0;
                task.isError = true;
                task.errorReason = data.error;

                if (!task.interception) {
                    await this.completeTaskInQueue(data.id, data.data, data.error);
                }
            }

            await dataBaseServer.save(TaskEntity, task);
        });

        this.getMessages(QueueEvents.GET_TASKS_BY_USER, async (data: {
            user: IAuthUser,
            pageIndex: number,
            pageSize: number,
            status: string
        }) => {
            const { user, pageSize, pageIndex, status } = data;
            const userId = user?.id?.toString();
            const options: any =
                (typeof pageIndex === 'number' && typeof pageSize === 'number')
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
            const filters: any = { userId, interception: { $ne: null } };
            if (status) {
                if (status === 'COMPLETE') {
                    filters.done = true;
                }
                if (status === 'ERROR') {
                    filters.isError = true;
                }
                if (status === 'PROCESSING') {
                    filters.sent = true;
                    filters.done = false;
                }
                if (status === 'IN QUEUE') {
                    filters.done = false;
                    filters.isError = false;
                    filters.sent = false;
                }
            }
            const result = await new DatabaseServer().findAndCount(TaskEntity, filters, options);
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
            const dataBaseServer = new DatabaseServer();

            const task = await dataBaseServer.findOne(TaskEntity, { taskId: data.taskId });
            if (data.userId !== task.userId) {
                throw new MessageError('Wrong user')
            }
            task.isError = false;
            task.attempt = 0;
            task.sent = false;
            task.processedTime = null;
            task.errorReason = undefined;
            await dataBaseServer.save(TaskEntity, task);
        });

        this.getMessages(QueueEvents.DELETE_TASK, async (data: { taskId: string, userId: string }) => {
            const dataBaseServer = new DatabaseServer();

            const task = await dataBaseServer.findOne(TaskEntity, { taskId: data.taskId });
            if (data.userId !== task.userId) {
                throw new MessageError('Wrong user')
            }
            await this.completeTaskInQueue(data.taskId, null, task.errorReason);
            await dataBaseServer.deleteEntity(TaskEntity, { taskId: data.taskId });
        });
    }

    async addTaskToQueue(task: ITask): Promise<void> {
        const dataBaseServer = new DatabaseServer();

        const te = dataBaseServer.create(TaskEntity, this.iTaskToTaskEntity(task));
        te.processedTime = null;
        await dataBaseServer.save(TaskEntity, te);
    }

    async completeTaskInQueue(taskId: string, data: any, error: any): Promise<void> {
        const dataBaseServer = new DatabaseServer();

        const task = await dataBaseServer.findOne(TaskEntity, { taskId });
        if (!task) {
            return;
        }
        if (error) {
            task.isError = true;
            task.errorReason = error;
        } else {
            task.done = true;
        }
        await dataBaseServer.save(TaskEntity, task);

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
        if (!this.trigger) {
            this.trigger = true;
            const workers = await this.getFreeWorkers();

            const dataBaseServer = new DatabaseServer();

            for (const worker of workers) {
                const task = await dataBaseServer.findOne(TaskEntity, {
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
                    await dataBaseServer.save(TaskEntity, task);
                } else {
                    console.log('task sent error')
                }
            }
            this.trigger = false;
        }
    }

    private async clearOldTasks() {
        await new DatabaseServer().deleteEntity(TaskEntity, {
            processedTime: {
                $lte: new Date(new Date().getTime() - 30 * 60000)
            },
            done: true
        });
    }

    private async clearLongPendingTasks() {
        const dataBaseServer = new DatabaseServer();

        const filters = dataBaseServer.getTasksAggregationFilters(MAP_TASKS_AGGREGATION_FILTERS.RESULT, this.processTimeout);
        const tasks = await dataBaseServer.aggregate(TaskEntity, filters);

        for (const task of tasks) {
            task.processedTime = null;
            task.sent = false;
        }

        await dataBaseServer.save(TaskEntity, tasks);
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

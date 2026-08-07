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

    private readonly workerSendTaskTimeout = parseInt(process.env.WORKER_SEND_TASK_TIMEOUT, 10) || 5 * 1000; // 5s

    /**
     * The flat ack timeout above is only correct for payloads that travel inline over NATS.
     * Anything above MQ_MAX_PAYLOAD is shipped as a `directLink` (see ZipCodec.encode) and the
     * worker only acks *after* it has HTTP-fetched and parsed the whole payload - which for tens
     * of MB is inherently slower than a few seconds. Scale the timeout with the payload size so a
     * large but perfectly valid task is not declared failed while the worker is still downloading
     * it.
     */
    private readonly workerSendTaskTimeoutPerMb = parseInt(process.env.WORKER_SEND_TASK_TIMEOUT_PER_MB, 10) || 2 * 1000; // 2s per MB
    private readonly workerSendTaskTimeoutMax = parseInt(process.env.WORKER_SEND_TASK_TIMEOUT_MAX, 10) || 5 * 60 * 1000; // 5m

    /**
     * How many times a task may fail *dispatch* before it is dead-lettered.
     * See TaskEntity.dispatchAttempt for why this is not `attempts`.
     */
    private readonly dispatchMaxAttempts = parseInt(process.env.WORKER_DISPATCH_MAX_ATTEMPTS, 10) || 3;

    private trigger: boolean = false;

    /**
     * Worker subjects with a dispatch currently in flight. GET_FREE_WORKERS can report a worker
     * free while it is still mid-decode of a large out-of-band payload - the worker only sets
     * `isInUse` once its SEND_TASK_TO_WORKER handler actually runs, which is after that decode
     * (an HTTP fetch for tens of MB) completes. Without this, a slow decode lets the same worker
     * get claimed again on the next refresh tick, and the second task is then invisible to
     * genuinely free workers. Tracking our own in-flight dispatches lets the loop below trust
     * this over a stale free-worker report.
     */
    private readonly inFlightWorkers = new Set<string>();

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

        this.getMessages(QueueEvents.ADD_TASK_TO_QUEUE, async (task: ITask) => {
            try {
                await this.addTaskToQueue(task);
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
                await this.refreshAndReassignTasks();
                return;
            }
            if (task.isRetryableTask && (task.attempts > 0)) {
                if (task.attempts > task.attempt) {
                    task.processedTime = null;
                    task.sent = false;
                    task.attempt = task.attempt + 1;
                    task.dispatchAttempt = 0; // the task reached a worker, so the dispatch budget is fresh
                } else {
                    task.isError = true;
                    task.errorReason = data.error;
                    await this.completeTaskInQueue(data.id, data.data, data.error);
                }
            } else {
                task.attempt = 0;
                task.isError = true;
                task.errorReason = data.error;

                await this.completeTaskInQueue(data.id, data.data, data.error);
            }

            await dataBaseServer.save(TaskEntity, task);
            await this.refreshAndReassignTasks();
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
                        exclude: ['data', 'dataFileId'],
                    }
                    : {
                        orderBy: {
                            processedTime: OrderDirection.DESC,
                        },
                        exclude: ['data', 'dataFileId'],
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
                delete task.data;
                delete task.dataFileId;
                delete task.userId;
                delete task.priority;
                delete task.attempt;
                delete task.attempts;
                delete task.dispatchAttempt; // internal dispatch bookkeeping, not user-facing
                delete task.dataSize;
                delete task._id;
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
            task.dispatchAttempt = 0; // a dead-lettered task must get a fresh dispatch budget
            task.done = false;
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
        task.dispatchAttempt = 0;
        delete task.id;
        return task;
    }

    private taskEntityToITask(task: TaskEntity): ITask {
        return {
            id: task.taskId,
            priority: task.priority,
            dryRun: task.dryRun,
            mockId: task.mockId,
            type: task.type,
            data: task.data,
        };
    }

    private async refreshAndReassignTasks() {
        if (this.trigger) {
            return;
        }
        this.trigger = true;
        try {
            const workers = await this.getFreeWorkers();

            const dataBaseServer = new DatabaseServer();

            for (const worker of workers) {
                if (this.inFlightWorkers.has(worker.subject)) {
                    // Trust our own bookkeeping over this free-worker report - see
                    // inFlightWorkers above for why the report can be stale.
                    continue;
                }

                const task = await dataBaseServer.findOne(TaskEntity, {
                    priority: {
                        $gte: worker.minPriority,
                        $lte: worker.maxPriority
                    },
                    processedTime: null,
                    // Never re-pick a task that has already finished or was dead-lettered.
                    done: { $ne: true },
                    isError: { $ne: true }
                }, {
                    // FIFO. Without an explicit order, a task that could not be dispatched stayed
                    // at the head of the (unordered) result and was retried forever while
                    // everything behind it starved.
                    orderBy: { createDate: OrderDirection.ASC }
                });
                if (!task) {
                    continue;
                }

                // Snapshot the payload and timeout before claiming: BeforeUpdate/AfterUpdate on an
                // offloaded task clears `data` and re-reads it from GridFS on every save, and
                // relying on that round trip to still hold the payload by the time we send would
                // be fragile - an empty payload would be far worse than a slow one.
                const payload = this.taskEntityToITask(task);
                const timeout = this.getSendTaskTimeout(task);

                // Claim the task before attempting to send it, and dispatch without awaiting
                // here: refreshAndReassignTasks is single-flight (guarded by `this.trigger`), so a
                // single slow or undeliverable payload would otherwise hold up every other worker
                // in this batch - and, on the next tick, the whole queue.
                task.processedTime = new Date();
                task.sent = true;
                await dataBaseServer.save(TaskEntity, task);

                this.inFlightWorkers.add(worker.subject);
                this.dispatchClaimedTask(worker, task, payload, timeout)
                    .catch((error) => {
                        console.error('Error while sending task to worker:', error);
                    })
                    .finally(() => {
                        this.inFlightWorkers.delete(worker.subject);
                    });
            }
        } finally {
            this.trigger = false;
        }
    }

    /**
     * Hand a claimed task to a worker and account for the outcome. `payload` and `timeout` are
     * computed by the caller from the task as claimed, before any GridFS offload round trip.
     */
    private async dispatchClaimedTask(worker: any, task: TaskEntity, payload: ITask, timeout: number): Promise<void> {
        try {
            const r = await this.sendMessageWithTimeout(worker.subject, timeout, payload) as any;
            if (r?.result) {
                // The task is already claimed; only the dispatch retry budget needs resetting so
                // a task that survived a transport hiccup starts fresh next time.
                if (task.dispatchAttempt) {
                    await this.resetDispatchAttempt(task.taskId);
                }
                return;
            }
            if (r && r.result === false) {
                // `{ result: false }` means the worker's SEND_TASK_TO_WORKER handler found
                // `isInUse` true - it was busy, not a failed hand-off. This happens routinely:
                // a worker reported free by getFreeWorkers() (up to 300ms + one refresh tick
                // earlier) can already be occupied by the time the send actually reaches it.
                // Routing this through releaseOrParkTask would burn the dead-letter budget on
                // healthy tasks under normal load, so just release the claim.
                await this.releaseClaim(task.taskId);
                return;
            }
            console.log('task sent error');
            await this.releaseOrParkTask(task, `Task was rejected by the worker: ${JSON.stringify(r)}`);
        } catch (error) {
            if (error?.code === 'DISPATCH_TIMEOUT') {
                // An ack timeout does not prove the task was never delivered - a worker only acks
                // an out-of-band payload after fetching and parsing it in full, and a genuinely
                // hung worker times out on every attempt regardless of whether it received the
                // task. Re-queueing here (as releaseOrParkTask does for provably-undelivered
                // transport errors) could run a Hedera mint/transfer a second time while the first
                // attempt is still in flight. Leave the claim in place instead: clearLongPendingTasks
                // reclaims it once processTimeout is reached, same as it did before dispatch had a
                // timeout at all.
                console.warn(
                    `[Queue] dispatch ack timed out, leaving claim in place for clearLongPendingTasks. ` +
                    `taskId: ${task.taskId}, type: ${task.type}, size: ${task.dataSize ?? 'n/a'}`
                );
                return;
            }
            await this.releaseOrParkTask(task, error?.message || String(error));
        }
    }

    /**
     * Reset the dispatch budget by re-reading the task instead of writing back the snapshot
     * `dispatchClaimedTask` claimed before the send - see `releaseOrParkTask` for why a stale
     * snapshot write can revert a task that finished while the send was in flight.
     */
    private async resetDispatchAttempt(taskId: string): Promise<void> {
        const dataBaseServer = new DatabaseServer();
        const current = await dataBaseServer.findOne(TaskEntity, { taskId });
        if (!current || current.done || current.isError) {
            return;
        }
        current.dispatchAttempt = 0;
        await dataBaseServer.save(TaskEntity, current);
    }

    /**
     * Release a claim without touching the dispatch budget - for outcomes that are not the
     * worker's fault (busy). Re-reads the task instead of writing back the caller's snapshot,
     * for the same reason as resetDispatchAttempt/releaseOrParkTask: dispatchClaimedTask can
     * hold that snapshot across an await lasting up to workerSendTaskTimeoutMax.
     */
    private async releaseClaim(taskId: string): Promise<void> {
        const dataBaseServer = new DatabaseServer();
        const current = await dataBaseServer.findOne(TaskEntity, { taskId });
        if (!current || current.done || current.isError) {
            return;
        }
        current.processedTime = null;
        current.sent = false;
        await dataBaseServer.save(TaskEntity, current);
    }

    /**
     * Roll a failed hand-off back into the queue, or dead-letter the task once it has exhausted
     * its dispatch budget.
     *
     * `attempt` is only ever incremented in the WorkerEvents.TASK_COMPLETE handler, i.e. only on
     * errors *reported by a worker*. A task that never reaches a worker at all - a transport
     * error such as an encode/publish/no-responders failure - would otherwise retry forever
     * without ever being marked failed. `dispatchAttempt` gives that case its own bounded budget.
     *
     * Only reached for errors that prove the task was never handed to a worker. An ack *timeout*
     * does not prove that - see dispatchClaimedTask's catch block, which handles it separately
     * (leaving the claim for clearLongPendingTasks) precisely because re-queueing an ambiguous
     * outcome here could run the task twice.
     */
    private async releaseOrParkTask(task: TaskEntity, reason: string): Promise<void> {
        const dataBaseServer = new DatabaseServer();

        // Re-read the task instead of writing back the snapshot the caller claimed before the
        // send. dispatchClaimedTask can now legitimately hold that snapshot across an await that
        // lasts up to workerSendTaskTimeoutMax (5m, scaled for large payloads). If the ack raced
        // that timeout, the worker may still have run the task to completion and already saved
        // done/isError via WorkerEvents.TASK_COMPLETE - a full-object overwrite here with the
        // stale snapshot would revert a completed task back to pending/errored and publish a
        // spurious dead-letter TASK_COMPLETE on top of the real result. Bail out if the worker
        // already got there first.
        const current = await dataBaseServer.findOne(TaskEntity, { taskId: task.taskId });
        if (!current || current.done || current.isError) {
            return;
        }

        current.dispatchAttempt = (current.dispatchAttempt || 0) + 1;
        current.sent = false;

        if (current.dispatchAttempt < this.dispatchMaxAttempts) {
            current.processedTime = null;
            await dataBaseServer.save(TaskEntity, current);
            console.warn(
                `[Queue] dispatch failed, re-queued. taskId: ${current.taskId}, type: ${current.type}, ` +
                `attempt: ${current.dispatchAttempt}/${this.dispatchMaxAttempts}, ` +
                `size: ${current.dataSize ?? 'n/a'}, reason: ${reason}`
            );
            return;
        }

        // Dead-letter. `processedTime` and `isError` both keep the task out of the dispatch
        // query above, so one undeliverable task degrades to one failed task instead of blocking
        // the whole queue. `done` is left false on purpose: that is how an errored task is already
        // represented (see completeTaskInQueue), so the task list keeps showing it under ERROR and
        // RESTART_TASK can still revive it.
        current.processedTime = new Date();
        current.isError = true;
        current.errorReason = reason;
        await dataBaseServer.save(TaskEntity, current);

        console.error(
            `[Queue] task dead-lettered after ${current.dispatchAttempt} failed dispatch attempts. ` +
            `taskId: ${current.taskId}, type: ${current.type}, size: ${current.dataSize ?? 'n/a'}, reason: ${reason}`
        );

        // Tell the caller instead of letting it hang until its own deadline.
        await this.publish(QueueEvents.TASK_COMPLETE, {
            id: current.taskId,
            data: null,
            error: reason
        });
    }

    /**
     * Ack timeout scaled to the payload size, capped.
     */
    private getSendTaskTimeout(task: TaskEntity): number {
        const megabyte = 1024 * 1024;
        // Tasks created before dataSize existed fall back to a one-off measurement.
        const size = task.dataSize ?? (task.data ? Buffer.byteLength(JSON.stringify(task.data)) : 0);
        if (size <= megabyte) {
            return this.workerSendTaskTimeout;
        }
        const scaled = this.workerSendTaskTimeout + Math.ceil(size / megabyte) * this.workerSendTaskTimeoutPerMb;
        return Math.min(scaled, this.workerSendTaskTimeoutMax);
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

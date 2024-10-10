import {
    DataBaseHelper,
    SynchronizationTask as SyncTaskEntity,
} from '@indexer/common';
import { CronJob } from 'cron';
import { safetyRunning } from '../utils/safety-running.js';

/**
 * Synchronization task
 */
export class SynchronizationTask {
    /**
     * Cron job
     */
    private _job?: CronJob;

    /**
     * Create synchronization task
     * @param name Name
     * @param fn Function
     * @param mask Mask
     * @param channel Channel
     */
    constructor(
        private readonly _name: string,
        private readonly _fn: () => void,
        private readonly _mask: string
    ) {}

    /**
     * Start synchronization task
     */
    public start(firstExecution: boolean = false) {
        const taskExecution = async () => {
            try {
                const em = await DataBaseHelper.getEntityManager();
                const runningTask = await em.create(SyncTaskEntity, {
                    taskName: this._name,
                    date: new Date(),
                });
                await em.persistAndFlush(runningTask);
                console.log(`${this._name} task is started`);
                try {
                    await this._fn();
                } catch (error) {
                    console.log(error);
                } finally {
                    await em.removeAndFlush(runningTask);
                }
                console.log(`${this._name} task is finished`);
            } catch (error) {
                console.log(error);
                await safetyRunning(async () => {
                    const em = await DataBaseHelper.getEntityManager();
                    const runningTask = await em.findOne(SyncTaskEntity, {
                        taskName: this._name,
                    });
                    if (!runningTask) {
                        return;
                    }
                    const now = new Date();
                    if (
                        runningTask.date.getTime() < now.addDays(-1).getTime()
                    ) {
                        await em.removeAndFlush(runningTask);
                    }
                });
            }
        };
        this._job = new CronJob(this._mask, taskExecution);
        this._job.start();
        if (firstExecution) {
            taskExecution();
        }
    }

    public stop() {
        this._job?.stop();
    }
}

import {
    DataBaseHelper,
    SynchronizationTask as SyncTaskEntity,
} from '@indexer/common';
import { CronJob } from 'cron';
import { safetyRunning } from '../utils/safety-running.js';

/**
 * Synchronization task
 */
export abstract class SynchronizationTask {
    /**
     * Cron job
     */
    private _job?: CronJob;

    /**
     * Create synchronization task
     * @param name Name
     * @param mask Mask
     */
    constructor(
        private readonly _name: string,
        private readonly _mask: string
    ) { }

    /**
     * Name
     */
    public get taskName(): string {
        return this._name;
    }

    /**
     * Start synchronization task
     */
    public start(firstExecution: boolean = false) {
        const taskExecution = async () => {
            try {
                const em = DataBaseHelper.getEntityManager();

                //Check task already started
                const exists = await em.findOne(SyncTaskEntity, { taskName: this._name });
                if (exists) {
                    console.log(`Tried to start the “${this._name}” task, but it’s already marked as started.` )
                    await this.cleanOldTask();
                    return;
                }

                const runningTask = em.create(SyncTaskEntity, {
                    taskName: this._name,
                    date: new Date(),
                });
                await em.persistAndFlush(runningTask);
                console.log(`${this._name} task is started`);
                try {
                    console.time(`----- sync ${this._name} -----`);
                    await this.sync();
                    console.timeEnd(`----- sync ${this._name} -----`);
                } catch (error) {
                    console.log(error);
                } finally {
                    await em.removeAndFlush(runningTask);
                }
                console.log(`${this._name} task is finished`);
            } catch (error) {
                console.log(error);
                await this.cleanOldTask();
            }
        };
        this._job = new CronJob(this._mask, taskExecution);
        this._job.start();
        if (firstExecution) {
            taskExecution();
        }
    }

    private async cleanOldTask() {
        await safetyRunning(async () => {
            const em = DataBaseHelper.getEntityManager();
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

    public stop() {
        this._job?.stop();
    }

    public abstract sync(): Promise<void>;
}

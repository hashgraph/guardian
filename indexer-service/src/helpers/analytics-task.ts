import { CronJob } from 'cron';
import { SynchronizationPolicy } from './synchronizers/synchronize-policy.js';
import { SynchronizationVCs } from './synchronizers/synchronize-vcs.js';
import { SynchronizationVPs } from './synchronizers/synchronize-vp.js';
import { SynchronizationTask } from './synchronization-task.js';
import { IPFS_CID_PATTERN, MessageAction, MessageType } from '@indexer/interfaces';
import { DataBaseHelper, Message } from '@indexer/common';
import { textSearch } from './text-search-options.js';
import { loadFiles } from './load-files.js';

function getMask(mask: string | undefined): string {
    return (mask || '0 * * * *');
}

/**
 * Synchronization task
 */
export class AnalyticsTask {

    /**
     * Cron job
     */
    private _job?: CronJob;

    public static EVENTS_SET: Set<number> = new Set();
    public static EVENTS_QUEUE: number[] = [];

    private static MASK: string = '* * * * *';

    private readonly synchronizationVCs: SynchronizationVCs;
    private readonly synchronizationVPs: SynchronizationVPs;
    private readonly synchronizationPolicy: SynchronizationPolicy;

    private isSyncRunning = new Map<string, boolean>();

    constructor() {
        this.synchronizationVCs = (new SynchronizationVCs(""));
        this.synchronizationVPs = (new SynchronizationVPs(""));
        this.synchronizationPolicy = (new SynchronizationPolicy(""));

        this.isSyncRunning.set(this.synchronizationVCs.name, false);
        this.isSyncRunning.set(this.synchronizationVPs.name, false);
        this.isSyncRunning.set(this.synchronizationPolicy.name, false);
    }

    public static create() {
        AnalyticsTask.EVENTS_SET = new Set<number>();
        AnalyticsTask.EVENTS_QUEUE = [];
        (new AnalyticsTask()).start();
    }

    public start() { 
        const taskExecution = async () => {
            try {
                console.log('started');
                this.startSync()
            } catch (error) {
                console.error('Analytic synchronization failed:', error);
            }
        };
        
        this._job = new CronJob(AnalyticsTask.MASK, taskExecution);
        this._job.start();

        taskExecution();
    }

    public stop() {
        this._job?.stop();
    }

    public static onAddEvent(timestamp: number) {
        if (!AnalyticsTask.EVENTS_SET.has(timestamp)) {
            AnalyticsTask.EVENTS_SET.add(timestamp);
            AnalyticsTask.EVENTS_QUEUE.push(timestamp);
        }
    }

    public async startSync() {
        if (AnalyticsTask.EVENTS_QUEUE.length > 0 &&
            !this.isSyncRunning.get(this.synchronizationVCs.name) &&
            !this.isSyncRunning.get(this.synchronizationVPs.name) &&
                !this.isSyncRunning.get(this.synchronizationPolicy.name)) {
            
            const event = AnalyticsTask.EVENTS_QUEUE.shift();
            AnalyticsTask.EVENTS_SET.delete(event);

            console.log(AnalyticsTask.EVENTS_QUEUE, AnalyticsTask.EVENTS_SET);
            console.log(`Processing event (timestamp): ${event}`);

            await this.runTask(this.synchronizationVCs);
            await this.runTask(this.synchronizationVPs);
            await this.runTask(this.synchronizationPolicy);
        } else if (AnalyticsTask.EVENTS_QUEUE.length > 0) {
            console.log(`Already running analytic synchronization`);
        }
    };

    private async runTask(task: SynchronizationTask) {

        this.isSyncRunning.set(task.taskName, true);

        console.log(`${task.taskName} task is started`);
        try {
            console.time(`----- sync ${task.taskName} -----`);
            await task.sync();
            console.timeEnd(`----- sync ${task.taskName} -----`);
        } catch (error) {
            console.log(error);
        }
        console.log(`${task.taskName} task is finished`);

        this.isSyncRunning.set(task.taskName, false);
    }
}

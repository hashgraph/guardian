import { Logger } from '@guardian/common';
import { CronJob } from 'cron';

/**
 * Synchronization task
 */
export class SynchronizationTask {
    /**
     * Start synchronization task
     * @param name Name
     * @param fn Function
     * @param interval Interval
     * @param channel Channel
     */
    public static start(
        name: string,
        fn: () => void,
        mask: string,
        channel: any
    ): void {
        let exists = false;
        channel.subscribe(`synchronization-task-${name}-exists`, async () => {
            exists = true;
        });
        channel.publish(`synchronization-task-${name}`, {});
        setTimeout(() => {
            if (
                !exists ||
                process.env.PRIMARY_INSTANCE?.toLowerCase() === 'true'
            ) {
                channel.subscribe(`synchronization-task-${name}`, async () => {
                    channel.publish(`synchronization-task-${name}-exists`, {});
                });
                let isTaskRunning = false;
                const job = new CronJob(mask, async () => {
                    try {
                        if (!isTaskRunning) {
                            isTaskRunning = true;
                            await fn();
                            isTaskRunning = false;
                        }
                    } catch (error) {
                        new Logger().error(error, ['GUARDIAN_SERVICE']);
                    }
                });
                job.start();
            }
        }, 200);
    }
}

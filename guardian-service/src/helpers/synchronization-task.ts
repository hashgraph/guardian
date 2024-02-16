import { Logger, MessageBrokerChannel } from '@guardian/common';
import { CronJob } from 'cron';

/**
 * Synchronization task
 */
export class SynchronizationTask {
    /**
     * Cron job
     */
    private _job?: CronJob;

    /**
     * Subscription
     */
    private _subscriptions: { unsubscribe: Function }[] = [];

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
        private readonly _mask: string,
        private readonly _channel: MessageBrokerChannel
    ) {}

    /**
     * Start synchronization task
     */
    public start(firstExecution: boolean = false) {
        this.remove();
        let exists = false;
        this._subscriptions.push(
            this._channel.subscribe(
                `synchronization-task-${this._name}-exists`,
                async () => {
                    exists = true;
                }
            )
        );
        this._channel.publish(`synchronization-task-${this._name}`, {});
        setTimeout(() => {
            if (
                !exists ||
                process.env.PRIMARY_INSTANCE?.toLowerCase() === 'true'
            ) {
                this._subscriptions.push(
                    this._channel.subscribe(
                        `synchronization-task-${this._name}`,
                        async () => {
                            this._channel.publish(
                                `synchronization-task-${this._name}-exists`,
                                {}
                            );
                        }
                    )
                );
                let isTaskRunning = false;
                const taskExecution = async () => {
                    try {
                        if (!isTaskRunning) {
                            isTaskRunning = true;
                            console.log(`${this._name} task started`);
                            await this._fn();
                            isTaskRunning = false;
                        }
                    } catch (error) {
                        isTaskRunning = false;
                        new Logger().error(error, ['GUARDIAN_SERVICE']);
                    }
                }
                this._job = new CronJob(this._mask, taskExecution);
                this._job.start();
                if (firstExecution) {
                    taskExecution();
                }
            } else {
                this.remove();
            }
        }, 200);
    }

    public remove() {
        this._job?.stop();
        delete this._job;
        this._subscriptions.forEach((subscription) => {
            subscription.unsubscribe();
        });
        this._subscriptions = [];
    }
}

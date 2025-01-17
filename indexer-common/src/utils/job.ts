import { Utils } from './utils.js';

export class Job {
    public readonly delay: number;
    public readonly timeout: number;
    public readonly callback: (job?: Job) => Promise<void>;
    public active: boolean;
    public processing: boolean;
    public interval: any;
    public status: string;

    constructor(option: {
        timeout?: number;
        delay?: number;
        callback: (job?: Job) => Promise<void>;
    }) {
        this.timeout = option.timeout || 30 * 1000;
        this.delay = option.delay || 1000;
        this.callback = option.callback;
        this.active = true;
        this.processing = false;
        this.interval = null;
        this.status = 'INITIALIZING';
    }

    public start(): boolean {
        this.status = 'STARTED';
        if (this.interval) {
            return false;
        }
        this.active = true;
        this.processing = false;
        this.interval = setInterval(async () => {
            if (!this.active || this.processing) {
                return;
            }
            this.processing = true;
            await Promise.race([
                this.callback(this),
                Utils.wait(this.timeout)
            ]);
            this.processing = false;
        }, this.delay);
        return true;
    }

    public stop(): boolean {
        this.status = 'STOPPED';
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            return true;
        }
        return false;
    }

    public sleep(): void {
        this.active = false;
    }

    public resume(): void {
        this.active = true;
    }

    /**
     * Get status
     */
    public getStatus(): any {
        return {
            status: this.status,
            active: this.active,
            processing: this.processing,
        }
    }
}

export class Jobs {
    public readonly delay: number;
    public readonly timeout: number;
    public readonly refresh: number;
    public readonly count: number;
    public readonly callback: (job?: Job) => Promise<void>;
    public readonly jobs: Job[];
    private interval: any;

    constructor(option: {
        timeout?: number;
        delay?: number;
        refresh?: number;
        count: number;
        callback: (job?: Job) => Promise<void>;
    }) {
        this.timeout = option.timeout || 30 * 1000;
        this.delay = option.delay || 1000;
        this.refresh = option.refresh || 60000;
        this.count = option.count;
        this.callback = option.callback;

        this.jobs = new Array(this.count);
        for (let index = 0; index < this.count; index++) {
            this.jobs[index] = new Job(this);
        }
    }

    public async start() {
        for (const job of this.jobs) {
            job.start();
            await Utils.wait(Math.ceil(this.delay / this.count));
        }
        this.interval = setInterval(async () => {
            for (const job of this.jobs) {
                job.resume();
            }
        }, this.refresh);
    }

    public async stop() {
        for (const job of this.jobs) {
            job.stop();
        }
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Get statuses
     */
    public getStatuses(): any[] {
        return this.jobs.map((job) => job.getStatus())
    }
}
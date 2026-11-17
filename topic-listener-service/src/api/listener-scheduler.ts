/**
 * Listener as seen by the scheduler
 */
export interface ISchedulable {
    readonly name: string;
    /**
     * Latency-sensitive listeners are polled by their own fast loop
     */
    readonly latencySensitive: boolean;
    isPollDue(): boolean;
    /**
     * Returns true when the mirror node was actually called
     */
    search(): Promise<boolean>;
}

export interface ISchedulerOptions {
    /**
     * Max listeners searching at the same time
     */
    concurrency: number;
    /**
     * Min spacing between mirror node calls, shared by every listener
     */
    callDelay: number;
    /**
     * Pause between passes over the regular listeners
     */
    passDelay: number;
    /**
     * Pause between passes over the latency-sensitive listeners
     */
    fastTick: number;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Polls listeners with bounded concurrency. A listener never runs two searches at once,
 * mirror node calls are paced globally, and latency-sensitive listeners are polled on
 * their own loop, so neither the pass delay nor a slow topic holds them back.
 */
export class ListenerScheduler {
    private readonly running = new Set<ISchedulable>();
    private readonly fastQueue: (() => void)[] = [];
    private readonly queue: (() => void)[] = [];
    private active = 0;
    private nextSlot = 0;
    private stopped = true;

    constructor(
        private readonly getListeners: () => Iterable<ISchedulable>,
        private readonly options: ISchedulerOptions
    ) {
    }

    public start(): void {
        if (!this.stopped) {
            return;
        }
        this.stopped = false;
        this.loop(false, this.options.passDelay).then();
        this.loop(true, this.options.fastTick).then();
    }

    public stop(): void {
        this.stopped = true;
    }

    /**
     * One pass over the regular (fast = false) or latency-sensitive listeners.
     * Resolves when every listener it started has finished. Listeners still busy from
     * an earlier pass are skipped, not awaited.
     */
    public async runPass(fast: boolean): Promise<void> {
        const tasks: Promise<void>[] = [];
        for (const listener of Array.from(this.getListeners())) {
            if (!!listener.latencySensitive !== fast || this.running.has(listener)) {
                continue;
            }
            //a fast loop ticks often, so it only touches listeners that are due
            if (fast && !listener.isPollDue()) {
                continue;
            }
            tasks.push(this.runOne(listener, fast));
        }
        await Promise.all(tasks);
    }

    private async loop(fast: boolean, pause: number): Promise<void> {
        while (!this.stopped) {
            try {
                await this.runPass(fast);
            } catch (error) {
                console.error('[ListenerScheduler]', error);
            }
            await sleep(pause);
        }
    }

    private async runOne(listener: ISchedulable, fast: boolean): Promise<void> {
        this.running.add(listener);
        try {
            if (!listener.isPollDue()) {
                //no mirror node call: it only re-publishes pending messages
                await listener.search();
                return;
            }
            await this.acquire(fast);
            try {
                if (listener.isPollDue()) {
                    await this.reserveSlot();
                }
                await listener.search();
            } finally {
                this.release();
            }
        } catch (error) {
            console.error(`[ListenerScheduler] ${listener.name}`, error);
        } finally {
            this.running.delete(listener);
        }
    }

    private acquire(fast: boolean): Promise<void> {
        if (this.active < this.options.concurrency) {
            this.active++;
            return Promise.resolve();
        }
        return new Promise<void>(resolve => (fast ? this.fastQueue : this.queue).push(resolve));
    }

    private release(): void {
        const next = this.fastQueue.shift() || this.queue.shift();
        if (next) {
            //the permit is handed over
            next();
        } else {
            this.active--;
        }
    }

    /**
     * Global mirror node pacing: each call gets its own slot
     */
    private async reserveSlot(): Promise<void> {
        const now = Date.now();
        const at = Math.max(now, this.nextSlot);
        this.nextSlot = at + this.options.callDelay;
        if (at > now) {
            await sleep(at - now);
        }
    }
}

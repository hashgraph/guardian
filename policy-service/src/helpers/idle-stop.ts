/**
 * Default idle time before a discontinued policy process stops itself
 */
const DEFAULT_IDLE_MS = 15 * 60 * 1000;

/**
 * Idle time (ms) of a discontinued policy process, `POLICY_DISCONTINUED_IDLE_MS`
 */
export function getDiscontinuedIdleMs(): number {
    return parseInt(process.env.POLICY_DISCONTINUED_IDLE_MS, 10) || DEFAULT_IDLE_MS;
}

/**
 * Calls back once the policy process has had no requests for the idle time
 */
export class IdleStop {
    private lastActivity = Date.now();
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private readonly idleMs: number,
        private readonly onIdle: () => void,
        private readonly checkMs: number = Math.min(60 * 1000, idleMs)
    ) { }

    /**
     * Record a request
     */
    public touch(): void {
        this.lastActivity = Date.now();
    }

    /**
     * Start watching
     */
    public start(): void {
        this.timer = setInterval(() => {
            if (Date.now() - this.lastActivity >= this.idleMs) {
                this.stop();
                this.onIdle();
            }
        }, this.checkMs);
        this.timer.unref?.();
    }

    /**
     * Stop watching
     */
    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

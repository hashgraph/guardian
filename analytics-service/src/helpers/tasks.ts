/**
 * Tasks helper
 */
export class Tasks<T> {
    /**
     * Data
     */
    private readonly items: T[];
    /**
     * Callback
     */
    private readonly callback: (item: T) => Promise<void>;
    /**
     * Progress
     */
    private progress: number;

    constructor(items: T[], callback: (item: T) => Promise<void>) {
        this.items = items;
        this.callback = callback;
        this.progress = 0;
    }

    /**
     * Create promise
     */
    public async start(): Promise<void> {
        for (let item = this.next(); item; item = this.next()) {
            await this.callback(item);
        }
    }

    /**
     * Run tasks
     * @param count - number of processes
     */
    public async run(count: number): Promise<void> {
        const tasks = new Array(count);
        for (let index = 0; index < count; index++) {
            tasks[index] = this.start();
        }
        await Promise.all(tasks);
    }

    /**
     * Get next task
     */
    private next(): T {
        return this.items[this.progress++];
    }
}
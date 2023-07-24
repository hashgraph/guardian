export class Tasks<T> {
    private readonly items: T[];
    private readonly callback: (item: T) => Promise<void>;
    private progress: number;

    constructor(items: T[], callback: (item: T) => Promise<void>) {
        this.items = items;
        this.callback = callback;
        this.progress = 0;
    }

    public async start(index?: number): Promise<void> {
        for (let item = this.next(); item; item = this.next()) {
            await this.callback(item);
        }
    }

    public async run(count: number): Promise<void> {
        const tasks = new Array(count);
        for (let index = 0; index < count; index++) {
            tasks[index] = this.start(index);
        }
        await Promise.all(tasks);
    }

    private next(): T {
        return this.items[this.progress++];
    }
}
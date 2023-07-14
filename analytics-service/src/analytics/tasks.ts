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
        // console.log('start', index);
        for (let item = this.next(); item; item = this.next()) {
            // console.log('next', index);
            await this.callback(item);
        }
        // console.log('end', index);
    }

    public async run(count: number): Promise<void> {
        const tasks = new Array(count);
        for (let index = 0; index < count; index++) {
            tasks[index] = this.start(index); 
        }
        // console.log('--- run ---');
        await Promise.all(tasks);
        // console.log(' -- run --');
    }

    private next(): T {
        return this.items[this.progress++];
    }
}
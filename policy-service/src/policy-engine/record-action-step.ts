import { GenerateUUIDv4 } from '@guardian/interfaces';

type Callback = (id: string, timestamp: number) => void;

export class RecordActionStep {
    public readonly id: string;
    public readonly timestemp: number;
    public readonly syncActions: boolean;
    private results: any[] = [];
    public counter: number;
    private callbackFired = false;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private readonly callback: Callback;

    constructor(callback: Callback, initialCounter = 0, syncActions = false) {
        this.id = GenerateUUIDv4();
        this.timestemp = Date.now();
        this.callback = callback;
        this.counter = initialCounter;
        this.callbackFired = false;
        this.syncActions = syncActions;
    }

    public pushResult(res: any) {
        this.results.push(res);
    }

    public getResults() {
        return this.results;
    }

    public inc(): void {
        this.counter += 1;
        this.clearTimer();
    }

    public dec(): void {
        this.counter = Math.max(0, this.counter - 1);

        this.finish();
    }

    private clearTimer(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    public finish(): void {
        this.clearTimer();
        if (this.callbackFired) {
            return;
        }
        if (this.counter === 0) {
            this.timer = setTimeout(() => {
                this.timer = null;
                if (!this.callbackFired && this.counter === 0) {
                    this.callbackFired = true;
                    this.callback(this.id, this.timestemp);
                }
            }, 1000);
        }
    }
}

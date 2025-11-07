import { performance } from 'perf_hooks';

export class PerfHelper {
    public static start(): PerfHelper {
        return new PerfHelper();
    }

    private readonly steps: { name: string, time: any }[] = [];


    public step(name: string) {
        this.steps.push({ name, time: performance.now() })
    }

    public stop() {
        this.steps.push({ name: 'stop', time: performance.now() })
    }

    public print(title: string) {
        const texts: any[] = [];        
        console.debug('[Perf]', title);
        for (let i = 0; i <= this.steps.length - 2; i++) {
            const curr = this.steps[i];
            const next = this.steps[i + 1]
            console.debug('[Perf] ', `Step "${curr.name}"`, `${Math.round(next.time - curr.time).toLocaleString('uk')} ms`);
        }
    }
}
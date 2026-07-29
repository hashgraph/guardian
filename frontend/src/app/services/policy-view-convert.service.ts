import { Injectable } from '@angular/core';

export type PolicyViewConvertOp = 'jsonToYaml' | 'yamlToJson';

interface ConvertJob {
    id: string;
    resolve: (code: string) => void;
    reject: (error: any) => void;
    timer: any;
}

@Injectable({ providedIn: 'root' })
export class PolicyViewConvertService {
    private worker?: Worker;
    private jobs = new Map<string, ConvertJob>();
    private timeoutMs = 5 * 60 * 1000;

    private ensure(): void {
        if (this.worker) {
            return;
        }
        this.worker = new Worker(
            new URL('../workers/policy-view.worker.ts', import.meta.url),
            { type: 'module' }
        );
        this.worker.onmessage = (e: MessageEvent) => {
            const { id, ok, code, error } = e.data || {};
            const job = this.jobs.get(id);
            if (!job) {
                return;
            }
            this.jobs.delete(id);
            clearTimeout(job.timer);
            if (ok) {
                job.resolve(code ?? '');
            } else {
                job.reject(new Error(error || 'policy view convert error'));
            }
        };
    }

    public convert(op: PolicyViewConvertOp, code: string): Promise<string> {
        this.ensure();
        return new Promise<string>((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);
            const timer = setTimeout(() => {
                this.jobs.delete(id);
                reject(new Error('policy view convert timeout'));
            }, this.timeoutMs);
            this.jobs.set(id, { id, resolve, reject, timer });
            this.worker!.postMessage({ id, op, code });
        });
    }
}

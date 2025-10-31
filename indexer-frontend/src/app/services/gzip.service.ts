import { Injectable } from '@angular/core';

type Job =
    | {
    id: string;
    op: 'gzip';
    file: File;
    name: string;
    type: string;
    resolve: (f: File) => void;
    reject: (e: any) => void;
    timer?: any;
}
    | {
    id: string;
    op: 'gunzipText';
    bytes?: ArrayBuffer;
    file?: File;
    name: string;
    type: string;
    resolve: (text: string) => void;
    reject: (e: any) => void;
    timer?: any;
}
    | {
    id: string;
    op: 'gzipSortLex';
    file: File;
    name: string;
    type: string;
    resolve: (f: File) => void;
    reject: (e: any) => void;
    timer?: any;
};

@Injectable({ providedIn: 'root' })
export class GzipService {
    private worker?: Worker;
    private queue: Job[] = [];
    private busy = false;
    private timeoutMs = 5 * 60 * 1000;

    private ensure(): void {
        if (this.worker) return;
        this.worker = new Worker(new URL('../workers/gzip.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e: MessageEvent) => {
            const { id, ok, file, text, error } = e.data || {};
            const index = this.queue.findIndex(job => job.id === id);
            if (index < 0) return;
            const job = this.queue.splice(index, 1)[0];
            if (job.timer) clearTimeout(job.timer);
            this.busy = false;
            if (ok) {
                if (job.op === 'gunzipText') {
                    (job as Extract<Job, { op: 'gunzipText' }>).resolve(String(text || ''));
                } else {
                    (job as Extract<Job, { op: 'gzip' | 'gzipSortLex' }>).resolve(file as File);
                }
            } else {
                job.reject(new Error(error || 'worker error'));
            }
            this.next();
        };
    }

    private next(): void {
        if (this.busy) return;
        const job = this.queue[0];
        if (!job || !this.worker) return;
        this.busy = true;
        job.timer = setTimeout(() => {
            this.busy = false;
            this.queue.shift();
            job.reject(new Error('gzip timeout'));
            this.next();
        }, this.timeoutMs);
        if (job.op === 'gzip') {
            this.worker.postMessage({
                id: job.id,
                op: 'gzip',
                file: job.file,
                name: job.name,
                type: job.type
            });
            return;
        }
        if (job.op === 'gunzipText') {
            this.worker.postMessage({
                id: job.id,
                op: 'gunzipText',
                bytes: job.bytes,
                file: job.file,
                name: job.name,
                type: job.type
            });
            return;
        }
        if (job.op === 'gzipSortLex') {
            this.worker.postMessage({
                id: job.id,
                op: 'gzipSortLex',
                file: job.file,
                name: job.name,
                type: job.type
            });
            return;
        }
    }

    gzip(file: File): Promise<File> {
        this.ensure();
        return new Promise<File>((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);
            this.queue.push({
                id,
                op: 'gzip',
                file,
                name: file.name || 'file.csv',
                type: file.type || 'text/csv',
                resolve,
                reject
            });
            this.next();
        });
    }

    gzipSortLexicographic(file: File): Promise<File> {
        this.ensure();
        return new Promise<File>((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);
            this.queue.push({
                id,
                op: 'gzipSortLex',
                file,
                name: file.name || 'file.csv',
                type: file.type || 'text/csv',
                resolve,
                reject
            });
            this.next();
        });
    }

    async gunzipToText(input: Blob | ArrayBuffer | Uint8Array): Promise<string> {
        this.ensure();
        let bytes: ArrayBuffer | undefined;
        if (input instanceof Blob) {
            bytes = await input.arrayBuffer();
        } else if (input instanceof Uint8Array) {
            bytes = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
        } else {
            bytes = input;
        }
        return new Promise<string>((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);
            this.queue.push({
                id,
                op: 'gunzipText',
                bytes,
                name: 'file.csv.gz',
                type: 'application/gzip',
                resolve,
                reject
            });
            this.next();
        });
    }
}

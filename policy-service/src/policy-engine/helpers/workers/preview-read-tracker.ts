import { Session } from 'node:inspector';

export interface IPreviewReadRecord {
    schema: string | null;
    path: string;
    fullPath?: string;
}

export interface IPreviewWriteRecord extends IPreviewReadRecord {
    document: number | null;
}

export interface IPreviewReadSite extends IPreviewReadRecord {
    site: number;
    listed: boolean;
    nested?: boolean;
}

export const PREVIEW_SCRIPT_FILE = 'calculation-preview.js';

export const PREVIEW_EXPLICIT_SITE = -2;

function withoutIndexes(path: string): string {
    return path.split('.').filter((part) => part !== '' && !/^\d+$/.test(part)).join('.');
}

export class PreviewReadTracker {
    private readonly reads = new Map<string, IPreviewReadRecord>();
    private readonly sites = new Map<string, IPreviewReadSite>();
    private readonly writes = new Map<string, IPreviewWriteRecord>();
    private readonly proxies = new WeakMap<object, unknown>();
    private readonly targets = new WeakMap<object, object>();
    private readonly sources = new WeakMap<object, number>();
    private readonly listed = new WeakSet<object>();
    private lines: number[] | null = null;
    private session: Session | null = null;

    public configure(source: string): void {
        this.lines = [0];
        for (let index = source.indexOf('\n'); index >= 0; index = source.indexOf('\n', index + 1)) {
            this.lines.push(index + 1);
        }
    }

    public startCoverage(): void {
        this.session = new Session();
        this.session.connect();
        this.session.post('Profiler.enable');
        this.session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    }

    public takeUnexecuted(): [number, number][] {
        const ranges: [number, number][] = [];
        this.session?.post('Profiler.takePreciseCoverage', (error, coverage) => {
            for (const script of error ? [] : coverage.result) {
                if (script.url !== PREVIEW_SCRIPT_FILE) {
                    continue;
                }
                for (const item of script.functions) {
                    for (const range of item.ranges) {
                        if (range.count === 0) {
                            ranges.push([range.startOffset, range.endOffset]);
                        }
                    }
                }
            }
        });
        return ranges;
    }

    public site(): number {
        if (!this.lines) {
            return -1;
        }
        const limit = Error.stackTraceLimit;
        const prepare = Error.prepareStackTrace;
        Error.stackTraceLimit = 3;
        Error.prepareStackTrace = (_error, frames) => frames;
        const holder: { stack?: unknown } = {};
        Error.captureStackTrace(holder);
        const frames = holder.stack;
        Error.stackTraceLimit = limit;
        Error.prepareStackTrace = prepare;
        const caller = Array.isArray(frames) ? frames[2] : undefined;
        return caller?.getFileName() === PREVIEW_SCRIPT_FILE
            ? (this.lines[(caller.getLineNumber() ?? 1) - 1] ?? 0) + (caller.getColumnNumber() ?? 1) - 1
            : -1;
    }

    public add(
        schema: string | null,
        path: string,
        writePath: string = path,
        document: number | null = null,
        site: number = -1,
        listed: boolean = false,
        nested: boolean = false
    ): void {
        if (!path || this.isWritten(schema, writePath, document)) {
            return;
        }
        const key = `${schema ?? ''}\u0000${this.lines ? writePath : path}`;
        if (!this.reads.has(key)) {
            this.reads.set(key, this.lines ? { schema, path, fullPath: writePath } : { schema, path });
        }
        const siteKey = `${key}\u0000${site}\u0000${listed}`;
        if (this.lines && !this.sites.has(siteKey)) {
            this.sites.set(siteKey, { schema, path, fullPath: writePath, site, listed, nested });
        }
    }

    public take(): IPreviewReadRecord[] {
        const reads = [...this.reads.values()];
        this.reads.clear();
        return reads;
    }

    public takeSites(): IPreviewReadSite[] {
        const sites = [...this.sites.values()];
        this.sites.clear();
        return sites;
    }

    private isWritten(schema: string | null, path: string, document: number | null): boolean {
        const parts = path.split('.');
        return parts.some((_part, index) => this.writes.has(`${schema ?? ''}\u0000${parts.slice(0, index + 1).join('.')}\u0000${document ?? ''}`));
    }

    public addWrite(schema: string | null, path: string, document: number | null = null): void {
        const key = `${schema ?? ''}\u0000${path}\u0000${document ?? ''}`;
        if (!this.writes.has(key)) {
            this.writes.set(key, { schema, path, document });
        }
    }

    public takeWrites(): IPreviewWriteRecord[] {
        const writes = [...this.writes.values()];
        this.writes.clear();
        return writes;
    }

    public track(
        value: unknown,
        schema: string | null,
        prefix: string = '',
        writePrefix: string = prefix,
        document: number | null = null
    ): unknown {
        if (!value || typeof value !== 'object' || this.targets.has(value)) {
            return value;
        }
        const cached = this.proxies.get(value);
        if (cached) {
            return cached;
        }
        const tracker = this;
        const isList = Array.isArray(value);
        const proxy = new Proxy(value, {
            get(target, key, receiver) {
                const result = Reflect.get(target, key, receiver);
                if (typeof key !== 'string') {
                    return result;
                }
                const writePath = writePrefix ? `${writePrefix}.${key}` : key;
                const nested = !!result && typeof result === 'object';
                if (isList) {
                    if (/^\d+$/.test(key) && !nested && prefix) {
                        tracker.add(schema, prefix, writePrefix, document, tracker.site(), tracker.listed.has(target));
                    }
                    return /^\d+$/.test(key) ? tracker.track(result, schema, prefix, writePath, document) : result;
                }
                const path = prefix ? `${prefix}.${key}` : key;
                tracker.add(schema, path, writePath, document, tracker.site(), tracker.listed.has(target), nested);
                return tracker.track(result, schema, path, writePath, document);
            },
            ownKeys(target) {
                tracker.listed.add(target);
                return Reflect.ownKeys(target);
            },
            set(target, key, newValue, receiver) {
                const carried = tracker.targets.has(newValue) || Array.isArray(newValue) && newValue.some((item) => tracker.targets.has(item));
                if (typeof key === 'string' && (!isList || /^\d+$/.test(key)) && !carried) {
                    tracker.addWrite(schema, writePrefix ? `${writePrefix}.${key}` : key, document);
                }
                return Reflect.set(target, key, newValue, receiver);
            }
        });
        this.proxies.set(value, proxy);
        this.targets.set(proxy, value);
        return proxy;
    }

    public trackField(value: unknown, path: string): unknown {
        this.add(null, withoutIndexes(path), path, null, PREVIEW_EXPLICIT_SITE);
        return this.track(value, null, withoutIndexes(path), path);
    }

    public trackPolicyDocuments(documents: unknown, schemas: (string | null)[] = []): unknown {
        if (!Array.isArray(documents)) {
            return documents;
        }
        return documents.map((item: unknown, index: number) => {
            if (!item || typeof item !== 'object') {
                return item;
            }
            const document = Reflect.get(item, 'document');
            if (!document || typeof document !== 'object') {
                return item;
            }
            const subject = Reflect.get(document, 'credentialSubject');
            if (!subject || typeof subject !== 'object') {
                return item;
            }
            const schema = Reflect.get(item, 'schema');
            const schemaId = typeof schema === 'string' ? schema : schemas[index] ?? null;
            const first = Array.isArray(subject) ? subject[0] : subject;
            if (first && typeof first === 'object') {
                this.sources.set(first, index);
            }
            const tracked = Array.isArray(subject)
                ? subject.map((element: unknown) => this.track(element, schemaId, '', '', index))
                : this.track(subject, schemaId, '', '', index);
            return { ...item, document: { ...document, credentialSubject: tracked } };
        });
    }

    public findSources(result: unknown): number[] {
        return (Array.isArray(result) ? result : [result]).map((item: unknown) => {
            const document = item && typeof item === 'object' ? Reflect.get(item, 'document') : undefined;
            const subject = document && typeof document === 'object' ? Reflect.get(document, 'credentialSubject') : undefined;
            const first = document && typeof document === 'object' ? (Array.isArray(subject) ? subject[0] : subject) : item;
            const target = first && typeof first === 'object' ? this.targets.get(first) ?? first : undefined;
            return target ? this.sources.get(target) ?? -1 : -1;
        });
    }

    public unwrap(value: unknown, seen: Set<object> = new Set<object>()): unknown {
        if (!value || typeof value !== 'object') {
            return value;
        }
        const target = this.targets.get(value) ?? value;
        if (seen.has(target)) {
            return target;
        }
        seen.add(target);
        for (const key of Object.keys(target)) {
            const child = Reflect.get(target, key);
            const unwrapped = this.unwrap(child, seen);
            if (unwrapped !== child) {
                Reflect.set(target, key, unwrapped);
            }
        }
        return target;
    }
}

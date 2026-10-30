import { createRequire } from 'node:module';
import { types } from 'node:util';
import type { Session } from 'node:inspector';

export interface IPreviewReadRecord {
    schema: string | null;
    path: string;
    fullPath?: string;
    document?: number | null;
}

export interface IPreviewWriteRecord extends IPreviewReadRecord {
    document: number | null;
}

export interface IPreviewReadSite extends IPreviewReadRecord {
    site: number;
    listed: boolean;
    nested?: boolean;
    call?: number;
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
    private readonly written = new Set<string>();
    private readonly proxies = new WeakMap<object, unknown>();
    private readonly targets = new WeakMap<object, object>();
    private readonly sources = new WeakMap<object, number>();
    private readonly listed = new WeakSet<object>();
    private readonly assigned = new WeakSet<object>();
    private readonly enumerated = new Map<string, IPreviewWriteRecord>();
    private lines: number[] | null = null;
    private session: Session | null = null;
    private executed: Uint8Array | null = null;
    private readonly uncovered = new Map<string, [number, number]>();

    public configure(source: string): void {
        this.lines = [0];
        const breaks = /\r\n|[\n\r\u2028\u2029]/g;
        for (let match = breaks.exec(source); match; match = breaks.exec(source)) {
            this.lines.push(match.index + match[0].length);
        }
    }

    public startCoverage(): void {
        const inspector: typeof import('node:inspector') = createRequire(import.meta.url)('node:inspector');
        this.session = new inspector.Session();
        this.session.connect();
        this.session.post('Profiler.enable');
        this.session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    }

    public takeUnexecuted(): [number, number][] {
        const result = new Map<string, [number, number]>();
        this.session?.post('Profiler.takePreciseCoverage', (error, coverage) => {
            const ranges = (error ? [] : coverage.result)
                .filter((script) => script.url === PREVIEW_SCRIPT_FILE)
                .flatMap((script) => script.functions.flatMap((item) => item.ranges))
                .sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
            const size = ranges.reduce((max, range) => Math.max(max, range.endOffset), this.executed?.length ?? 0);
            const executed = new Uint8Array(size);
            executed.set(this.executed ?? []);
            const run = new Uint8Array(size);
            for (const range of ranges) {
                run.fill(range.count > 0 ? 1 : 0, range.startOffset, range.endOffset);
                if (range.count === 0) {
                    this.uncovered.set(`${range.startOffset}:${range.endOffset}`, [range.startOffset, range.endOffset]);
                }
            }
            run.forEach((value, index) => {
                executed[index] = Math.max(executed[index], value);
            });
            this.executed = executed;
            for (const [start, end] of this.uncovered.values()) {
                for (let index = start; index < end;) {
                    if (executed[index]) {
                        index++;
                        continue;
                    }
                    const from = index;
                    while (index < end && !executed[index]) {
                        index++;
                    }
                    result.set(`${from}:${index}`, [from, index]);
                }
            }
        });
        return [...result.values()];
    }

    public site(depth: number = 2): number {
        if (!this.lines) {
            return -1;
        }
        const limit = Error.stackTraceLimit;
        const prepare = Error.prepareStackTrace;
        Error.stackTraceLimit = depth + 1;
        Error.prepareStackTrace = (_error, stackFrames) => stackFrames;
        const holder: { stack?: unknown } = {};
        Error.captureStackTrace(holder);
        const frames = holder.stack;
        Error.stackTraceLimit = limit;
        Error.prepareStackTrace = prepare;
        const caller = Array.isArray(frames) ? frames[depth] : undefined;
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
        nested: boolean = false,
        call?: number
    ): void {
        if (!path || this.isWritten(schema, writePath, document)) {
            return;
        }
        const key = `${schema ?? ''}\u0000${this.lines ? writePath : path}`;
        if (!this.reads.has(key)) {
            this.reads.set(key, this.lines ? { schema, path, fullPath: writePath } : { schema, path });
        }
        const siteKey = `${key}\u0000${site}\u0000${listed}\u0000${call ?? ''}\u0000${document ?? ''}`;
        if (this.lines && !this.sites.has(siteKey)) {
            const read: IPreviewReadSite = call === undefined
                ? { schema, path, fullPath: writePath, site, listed, nested }
                : { schema, path, fullPath: writePath, site, listed, nested, call };
            this.sites.set(siteKey, document === null ? read : { ...read, document });
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
        return parts.some((_part, index) => this.written.has(`${schema ?? ''}\u0000${parts.slice(0, index + 1).join('.')}\u0000${document ?? ''}`));
    }

    public addWrite(schema: string | null, path: string, document: number | null = null): void {
        const key = `${schema ?? ''}\u0000${path}\u0000${document ?? ''}`;
        this.written.add(key);
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
        if (!value || typeof value !== 'object' || this.targets.has(value) || this.assigned.has(value)) {
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
                const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
                const frozen = !!descriptor && descriptor.configurable === false && descriptor.writable === false;
                if (isList) {
                    if (/^\d+$/.test(key) && !nested && prefix) {
                        tracker.add(schema, prefix, writePrefix, document, tracker.site(), tracker.listed.has(target));
                    }
                    return /^\d+$/.test(key) && !frozen ? tracker.track(result, schema, prefix, writePath, document) : result;
                }
                const path = prefix ? `${prefix}.${key}` : key;
                tracker.add(schema, path, writePath, document, tracker.site(), tracker.listed.has(target), nested);
                return frozen ? result : tracker.track(result, schema, path, writePath, document);
            },
            ownKeys(target) {
                tracker.listed.add(target);
                tracker.enumerated.set(`${schema ?? ''}\u0000${writePrefix}\u0000${document ?? ''}`, { schema, path: writePrefix, document });
                return Reflect.ownKeys(target);
            },
            set(target, key, newValue, receiver) {
                if (newValue && typeof newValue === 'object' && !tracker.proxies.has(newValue) && !tracker.targets.has(newValue)) {
                    tracker.assigned.add(newValue);
                }
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

    public takeEnumerated(): IPreviewWriteRecord[] {
        const enumerated = [...this.enumerated.values()];
        this.enumerated.clear();
        return enumerated;
    }

    public isTracked(value: unknown): boolean {
        return !!value && typeof value === 'object' && this.targets.has(value);
    }

    public trackField(value: unknown, path: string): unknown {
        this.add(null, withoutIndexes(path), path, null, PREVIEW_EXPLICIT_SITE, false, false, this.lines ? this.site(3) : undefined);
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

    public original(value: unknown): unknown {
        return value && typeof value === 'object' ? this.targets.get(value) ?? value : value;
    }

    public unwrap(value: unknown, seen: Map<object, object> = new Map<object, object>()): unknown {
        if (!value || typeof value !== 'object') {
            return value;
        }
        const target = this.targets.get(value) ?? value;
        const copied = seen.get(target);
        if (copied) {
            return copied;
        }
        if (types.isDate(target) || types.isRegExp(target) || types.isMap(target) || types.isSet(target)
            || types.isAnyArrayBuffer(target) || ArrayBuffer.isView(target) || types.isNativeError(target)
            || types.isBoxedPrimitive(target) || types.isPromise(target) || types.isWeakMap(target)
            || types.isWeakSet(target) || types.isGeneratorObject(target) || types.isModuleNamespaceObject(target)
            || types.isProxy(target)) {
            seen.set(target, target);
            return target;
        }
        const copy: Record<string, unknown> | unknown[] = Array.isArray(target) ? new Array(target.length) : {};
        seen.set(target, copy);
        this.targets.set(copy, target);
        for (const key of Object.keys(target)) {
            Object.defineProperty(copy, key, {
                value: this.unwrap(Reflect.get(target, key), seen),
                enumerable: true,
                configurable: true,
                writable: true
            });
        }
        return copy;
    }
}

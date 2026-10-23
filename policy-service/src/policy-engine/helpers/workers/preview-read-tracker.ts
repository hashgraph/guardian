export interface IPreviewReadRecord {
    schema: string | null;
    path: string;
}

export interface IPreviewWriteRecord extends IPreviewReadRecord {
    document: number | null;
}

function withoutIndexes(path: string): string {
    return path.split('.').filter((part) => part !== '' && !/^\d+$/.test(part)).join('.');
}

export class PreviewReadTracker {
    private readonly reads = new Map<string, IPreviewReadRecord>();
    private readonly writes = new Map<string, IPreviewWriteRecord>();
    private readonly proxies = new WeakMap<object, unknown>();
    private readonly targets = new WeakMap<object, object>();
    private readonly sources = new WeakMap<object, number>();

    public add(schema: string | null, path: string, writePath: string = path, document: number | null = null): void {
        if (!path || this.isWritten(schema, writePath, document)) {
            return;
        }
        const key = `${schema ?? ''}\u0000${path}`;
        if (!this.reads.has(key)) {
            this.reads.set(key, { schema, path });
        }
    }

    public take(): IPreviewReadRecord[] {
        const reads = [...this.reads.values()];
        this.reads.clear();
        return reads;
    }

    private isWritten(schema: string | null, path: string, document: number | null): boolean {
        for (const write of this.writes.values()) {
            if (write.schema === schema && write.document === document && (path === write.path || path.startsWith(`${write.path}.`))) {
                return true;
            }
        }
        return false;
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
        if (!value || typeof value !== 'object') {
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
                if (isList) {
                    return /^\d+$/.test(key) ? tracker.track(result, schema, prefix, writePath, document) : result;
                }
                const path = prefix ? `${prefix}.${key}` : key;
                tracker.add(schema, path, writePath, document);
                return tracker.track(result, schema, path, writePath, document);
            },
            has(target, key) {
                if (typeof key === 'string' && !isList) {
                    tracker.add(schema, prefix ? `${prefix}.${key}` : key, writePrefix ? `${writePrefix}.${key}` : key, document);
                }
                return Reflect.has(target, key);
            },
            getOwnPropertyDescriptor(target, key) {
                if (typeof key === 'string' && !isList) {
                    tracker.add(schema, prefix ? `${prefix}.${key}` : key, writePrefix ? `${writePrefix}.${key}` : key, document);
                }
                return Reflect.getOwnPropertyDescriptor(target, key);
            },
            set(target, key, newValue, receiver) {
                if (typeof key === 'string' && (!isList || /^\d+$/.test(key))) {
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
        this.add(null, path);
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

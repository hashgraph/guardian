export interface IPreviewReadRecord {
    schema: string | null;
    path: string;
}

export class PreviewReadTracker {
    private readonly reads = new Map<string, IPreviewReadRecord>();
    private readonly proxies = new WeakMap<object, unknown>();
    private readonly targets = new WeakMap<object, object>();

    public add(schema: string | null, path: string): void {
        if (!path) {
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

    public track(value: unknown, schema: string | null, prefix: string = ''): unknown {
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
                if (isList) {
                    return /^\d+$/.test(key) ? tracker.track(result, schema, prefix) : result;
                }
                const path = prefix ? `${prefix}.${key}` : key;
                tracker.add(schema, path);
                return tracker.track(result, schema, path);
            }
        });
        this.proxies.set(value, proxy);
        this.targets.set(proxy, value);
        return proxy;
    }

    public trackPolicyDocuments(documents: unknown): unknown {
        if (!Array.isArray(documents)) {
            return documents;
        }
        return documents.map((item: unknown) => {
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
            const schemaId = typeof schema === 'string' ? schema : null;
            const tracked = Array.isArray(subject)
                ? subject.map((element: unknown) => this.track(element, schemaId))
                : this.track(subject, schemaId);
            return { ...item, document: { ...document, credentialSubject: tracked } };
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

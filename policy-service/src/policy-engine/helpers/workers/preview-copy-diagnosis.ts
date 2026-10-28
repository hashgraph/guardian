import { parse } from 'acorn';
import type { IPreviewReadSite, PreviewReadTracker } from './preview-read-tracker.js';

export interface IPreviewCopyTarget {
    schema: string | null;
    document: number | null;
    path: string;
    names: string[];
}

export interface IPreviewCopyDiagnosis {
    sites: IPreviewReadSite[];
    trusted: boolean;
    failed: boolean;
    error?: string | null;
    written?: string[];
    read?: string[];
}

export interface IPreviewCopyRealm {
    objectPrototype: object;
    objectConstructor: object;
    reflect: object;
    global: object;
}

const REFLECTIVE_OBJECT = [
    'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertySymbols', 'getOwnPropertyNames',
    'getPrototypeOf', 'setPrototypeOf', 'preventExtensions', 'freeze', 'seal', 'isExtensible', 'isFrozen',
    'isSealed', 'defineProperty', 'defineProperties'
];

const REFLECTIVE_REFLECT = [
    'apply', 'construct', 'defineProperty', 'deleteProperty', 'get', 'getOwnPropertyDescriptor', 'getPrototypeOf',
    'has', 'isExtensible', 'ownKeys', 'preventExtensions', 'set', 'setPrototypeOf'
];

const REFLECTIVE_PROTOTYPE = ['__lookupGetter__', '__lookupSetter__', '__defineGetter__', '__defineSetter__', 'isPrototypeOf'];

export function hasPreviewPresenceCheck(source: string): boolean {
    let tree: unknown;
    try {
        tree = parse(source, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
    } catch {
        return true;
    }
    const pending = [tree];
    while (pending.length) {
        const node = pending.pop();
        if (!node || typeof node !== 'object') {
            continue;
        }
        const type = Reflect.get(node, 'type');
        if (type === 'WithStatement' || (type === 'BinaryExpression' && Reflect.get(node, 'operator') === 'in')) {
            return true;
        }
        for (const child of Object.values(node)) {
            if (child && typeof child === 'object') {
                pending.push(child);
            }
        }
    }
    return false;
}

export function isPreviewFieldFailure(errorName: unknown, message: unknown = ''): boolean {
    return errorName === 'TypeError' || /Undefined symbol /.test(String(message ?? ''));
}

export function collectPreviewNonFiniteNames(value: unknown, names: Set<string> = new Set<string>(), seen: WeakSet<object> = new WeakSet<object>()): string[] {
    if (value && typeof value === 'object' && !seen.has(value)) {
        seen.add(value);
        for (const [key, child] of Object.entries(value)) {
            if (typeof child === 'number' && !Number.isFinite(child)) {
                names.add(key);
            }
            collectPreviewNonFiniteNames(child, names, seen);
        }
    }
    return [...names];
}

export function isPreviewFiniteResult(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): boolean {
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (!value || typeof value !== 'object' || seen.has(value)) {
        return true;
    }
    seen.add(value);
    return Object.values(value).every((child) => isPreviewFiniteResult(child, seen));
}

function findPreviewCopyObject(subject: unknown, path: string): unknown {
    let current = subject;
    for (const part of path ? path.split('.') : []) {
        current = current && typeof current === 'object' ? Reflect.get(current, part) : undefined;
    }
    return current;
}

export function startPreviewCopyDiagnosis(
    tracker: PreviewReadTracker,
    realms: IPreviewCopyRealm[],
    targets: IPreviewCopyTarget[],
    subjects: unknown[]
): (failed: boolean, error?: string | null) => IPreviewCopyDiagnosis {
    const define = Object.defineProperty;
    const symbols = Object.getOwnPropertySymbols;
    const extensible = Object.isExtensible;
    const apply = Reflect.apply;
    const construct = Reflect.construct;
    const sites: IPreviewReadSite[] = [];
    const reads = new Set<string>();
    const writes = new Set<string>();
    let trusted = true;

    const origins = new Map<symbol, IPreviewCopyTarget>();
    for (const target of targets) {
        const subject = subjects[target.document ?? 0];
        for (const element of Array.isArray(subject) ? subject : [subject]) {
            const value = findPreviewCopyObject(element, target.path);
            if (value && typeof value === 'object') {
                const origin = Symbol(target.path);
                define(value, origin, { value: true, enumerable: true, configurable: true, writable: true });
                origins.set(origin, target);
            }
        }
    }

    const names = new Set(targets.flatMap((target) => target.names));
    const prototypes = new Set<unknown>(realms.map((realm) => realm.objectPrototype));
    const detect = (owner: object, key: string, inspects?: (receiver: unknown, args: unknown[]) => boolean) => {
        const native = Reflect.get(owner, key);
        if (typeof native !== 'function') {
            return;
        }
        define(owner, key, {
            configurable: true,
            writable: true,
            value: function (this: unknown, ...args: unknown[]) {
                if ((!inspects || inspects(this, args)) && tracker.site() >= 0) {
                    trusted = false;
                }
                return new.target ? construct(native, args, new.target) : apply(native, this, args);
            }
        });
    };

    for (const realm of realms) {
        for (const key of REFLECTIVE_OBJECT) {
            detect(realm.objectConstructor, key);
        }
        for (const key of REFLECTIVE_REFLECT) {
            detect(realm.reflect, key);
        }
        for (const key of REFLECTIVE_PROTOTYPE) {
            detect(realm.objectPrototype, key);
        }
        for (const key of ['hasOwnProperty', 'propertyIsEnumerable']) {
            detect(realm.objectPrototype, key, (receiver) => prototypes.has(receiver));
        }
        detect(realm.objectConstructor, 'hasOwn', (_receiver, args) => prototypes.has(args[0]));
        const nativeProxy = Reflect.get(realm.global, 'Proxy');
        if (typeof nativeProxy === 'function') {
            define(realm.global, 'Proxy', {
                configurable: true,
                writable: true,
                value: function (...args: unknown[]) {
                    if (tracker.site() >= 0) {
                        trusted = false;
                    }
                    return construct(nativeProxy, args);
                }
            });
        }
        for (const name of names) {
            define(realm.objectPrototype, name, {
                configurable: true,
                enumerable: false,
                get(this: unknown) {
                    const site = tracker.site();
                    if (site < 0) {
                        return undefined;
                    }
                    reads.add(name);
                    if (tracker.isTracked(this)) {
                        return undefined;
                    }
                    const owners = this && typeof this === 'object'
                        ? symbols(this).map((key) => origins.get(key)).filter((target) => target?.names.includes(name))
                        : [];
                    if (owners.length !== 1) {
                        trusted = false;
                        return undefined;
                    }
                    const fullPath = owners[0].path ? `${owners[0].path}.${name}` : name;
                    sites.push({
                        schema: owners[0].schema,
                        path: fullPath.split('.').filter((part) => !/^\d+$/.test(part)).join('.'),
                        fullPath,
                        site,
                        listed: false
                    });
                    return undefined;
                },
                set(this: unknown, value: unknown) {
                    if (tracker.site() >= 0) {
                        writes.add(name);
                    }
                    if (!this || typeof this !== 'object' || !extensible(this)) {
                        trusted = false;
                        return;
                    }
                    define(this, name, { value, writable: true, enumerable: true, configurable: true });
                }
            });
        }
    }

    return (failed: boolean, error: string | null = null) => ({
        sites,
        trusted,
        failed,
        error,
        written: [...writes].filter((name) => !reads.has(name)),
        read: [...reads]
    });
}

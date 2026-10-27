import { parse } from 'acorn';
import { isAccessorNode, isAssignmentNode, isConditionalNode, isConstantNode, isFunctionAssignmentNode, isFunctionNode, isOperatorNode, isParenthesisNode, isSymbolNode, parse as parseFormula, type FunctionAssignmentNode, type MathNode } from 'mathjs';
import type { IPreviewReadRecord, IPreviewReadSite } from './workers/preview-read-tracker.js';

type Node = { type: string; start: number; end: number; [key: string]: any };

type Usage = 'use' | 'check' | 'write' | 'path';

interface IOccurrence {
    node: Node;
    key: string;
    keys: string[];
    next: string | null;
    start: number;
    usage: Usage;
    dynamic: boolean;
}

interface IScript {
    parents: Map<Node, Node | null>;
    occurrences: IOccurrence[];
    references: { name: string; start: number }[];
    functions: { name: string; start: number; end: number; body: number }[];
    calls: Map<string, Node[]>;
    scopes: Map<Node, Map<string, Node>>;
}

const ITERATORS = new Set(['map', 'forEach', 'filter', 'find', 'findLast', 'some', 'every', 'reduce', 'reduceRight', 'flatMap', 'sort', 'findIndex']);

const FOREIGN = new Set(['sources', 'artifacts', 'user']);

const OTHER = '\u0000';

function isNode(value: unknown): value is Node {
    return !!value && typeof value === 'object' && typeof Reflect.get(value, 'type') === 'string';
}

function isFunction(node: Node | null | undefined): boolean {
    return !!node && /Function/.test(node.type);
}

function keyOf(node: Node): string | null {
    const key = node.type === 'MemberExpression' ? node.property : node.key;
    if (!node.computed && key.type === 'Identifier') {
        return key.name;
    }
    if (key.type === 'Literal' && typeof key.value === 'string') {
        return key.value;
    }
    if (key.type === 'TemplateLiteral' && !key.expressions.length) {
        return key.quasis[0].value.cooked;
    }
    return null;
}

function isNothing(node: Node): boolean {
    return node.type === 'Literal' && node.raw === 'null'
        || node.type === 'Identifier' && node.name === 'undefined'
        || node.type === 'UnaryExpression' && node.operator === 'void';
}

function usageOf(node: Node, parents: Map<Node, Node | null>): Usage {
    let current = node;
    let parent = parents.get(current);
    while (parent?.type === 'ChainExpression') {
        current = parent;
        parent = parents.get(current);
    }
    if (!parent) {
        return 'use';
    }
    switch (parent.type) {
        case 'MemberExpression':
            return parent.object === current ? 'path' : 'use';
        case 'ForOfStatement':
        case 'ForInStatement':
            return parent.right === current ? 'path' : 'write';
        case 'AssignmentExpression':
            if (parent.left !== current) {
                return 'use';
            }
            return parent.operator === '=' ? 'write' : parent.operator === '||=' || parent.operator === '??=' ? 'check' : 'use';
        case 'ArrayPattern':
        case 'RestElement':
            return 'write';
        case 'AssignmentPattern':
            return parent.left === current ? 'write' : 'use';
        case 'Property':
            return parents.get(parent)?.type === 'ObjectPattern' && parent.value === current ? 'write' : 'use';
        case 'UnaryExpression':
            return parent.operator === 'typeof' ? 'check' : parent.operator === 'delete' ? 'write' : 'use';
        case 'LogicalExpression':
            if (parent.operator === '&&') {
                return 'use';
            }
            return parent.left === current || usageOf(parent, parents) === 'check' ? 'check' : 'use';
        case 'BinaryExpression':
            return ['==', '===', '!=', '!=='].includes(parent.operator) && isNothing(parent.left === current ? parent.right : parent.left)
                ? 'check' : 'use';
        default:
            return 'use';
    }
}

function chainOf(node: Node): { keys: string[]; base: Node | null } {
    const keys: string[] = [];
    let current: Node = node;
    for (;;) {
        if (current.type === 'ChainExpression') {
            current = current.expression;
        } else if (current.type === 'MemberExpression') {
            const key = keyOf(current);
            if (key !== null && !/^\d+$/.test(key)) {
                keys.unshift(key);
            }
            current = current.object;
        } else if (current.type === 'CallExpression' && current.callee.type === 'MemberExpression') {
            current = current.callee.object;
        } else {
            return { keys, base: current.type === 'Identifier' ? current : null };
        }
    }
}

function functionName(node: Node, parent: Node | null): string | null {
    if (node.type === 'FunctionDeclaration') {
        return node.id?.name ?? null;
    }
    if (parent?.type === 'VariableDeclarator' && parent.init === node && parent.id.type === 'Identifier') {
        return parent.id.name;
    }
    if ((parent?.type === 'Property' || parent?.type === 'MethodDefinition') && parent.value === node) {
        return keyOf(parent);
    }
    if (parent?.type === 'AssignmentExpression' && parent.right === node) {
        return parent.left.type === 'Identifier' ? parent.left.name : parent.left.type === 'MemberExpression' ? keyOf(parent.left) : null;
    }
    return null;
}

function scopeOf(node: Node, parents: Map<Node, Node | null>): Node {
    let current = parents.get(node) ?? null;
    while (current && current.type !== 'Program' && !isFunction(current)) {
        current = parents.get(current) ?? null;
    }
    return current ?? node;
}

function collect(source: string, expression: boolean): IScript {
    const program: unknown = parse(source, {
        ecmaVersion: 'latest',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        allowHashBang: true
    });
    if (!isNode(program)) {
        throw new Error('Invalid script');
    }
    const parents = new Map<Node, Node | null>();
    const visit = (node: Node, parent: Node | null) => {
        parents.set(node, parent);
        for (const key of Object.keys(node)) {
            for (const item of Array.isArray(node[key]) ? node[key] : [node[key]]) {
                if (isNode(item)) {
                    visit(item, node);
                }
            }
        }
    };
    visit(program, null);
    const script: IScript = { parents, occurrences: [], references: [], functions: [], calls: new Map(), scopes: new Map() };
    const declare = (scope: Node, name: string, node: Node) => {
        const names = script.scopes.get(scope) || new Map<string, Node>();
        if (!names.has(name)) {
            names.set(name, node);
        }
        script.scopes.set(scope, names);
    };
    const add = (node: Node, key: string, keys: string[], start: number, usage: Usage, dynamic = false, next: string | null = null) => {
        script.occurrences.push({ node, key, keys, next, start, usage, dynamic });
    };
    for (const [node, parent] of parents) {
        if (node.type === 'MemberExpression') {
            const key = keyOf(node);
            if (key !== null) {
                script.references.push({ name: key, start: node.property.start });
            }
            if (key !== null && !/^\d+$/.test(key) || node.computed) {
                const start = node.optional ? source.lastIndexOf('?.', node.property.start)
                    : node.computed ? source.indexOf('[', node.object.end) : node.property.start;
                const next = parent?.type === 'MemberExpression' && parent.object === node ? keyOf(parent) : null;
                add(node, key ?? '', chainOf(node).keys, start, usageOf(node, parents), key === null || /^\d+$/.test(key), next);
            }
        } else if (node.type === 'Property' && parent?.type === 'ObjectPattern') {
            const key = keyOf(node);
            if (key !== null) {
                add(node, key, [key], node.key.start, node.value.type === 'AssignmentPattern' ? 'check' : 'use');
            }
        } else if (node.type === 'Identifier') {
            const declared = parent && (parent.type === 'MemberExpression' && parent.property === node && !parent.computed
                || (parent.type === 'Property' || parent.type === 'MethodDefinition') && parent.key === node && !parent.computed
                || parent.type === 'VariableDeclarator' && parent.id === node
                || isFunction(parent) && (parent.id === node || parent.params.includes(node)));
            if (parent?.type === 'VariableDeclarator' && parent.id === node) {
                declare(scopeOf(parent, parents), node.name, parent);
            }
            if (isFunction(parent) && parent.params.includes(node)) {
                declare(parent, node.name, node);
            }
            if (!declared) {
                script.references.push({ name: node.name, start: node.start });
                if (expression) {
                    add(node, node.name, [node.name], node.start, usageOf(node, parents));
                }
            }
        } else if (node.type === 'CallExpression') {
            const callee = node.callee.type === 'Identifier' ? node.callee.name : node.callee.type === 'MemberExpression' ? keyOf(node.callee) : null;
            if (callee) {
                script.calls.set(callee, [...(script.calls.get(callee) || []), node]);
            }
            const argument = node.arguments[0];
            if (callee === 'getField' && argument?.type === 'Literal' && typeof argument.value === 'string') {
                const keys = argument.value.split('.').filter((part: string) => part && !/^\d+$/.test(part));
                if (keys.length) {
                    add(node, keys[keys.length - 1], keys, node.start, usageOf(node, parents));
                }
            }
        }
        if (isFunction(node)) {
            const name = functionName(node, parent);
            if (name) {
                script.functions.push({ name, start: node.start, end: node.end, body: node.body.start });
            }
        }
    }
    const text = (node: Node) => source.slice(node.start, node.end);
    const byNode = new Map(script.occurrences.map((occurrence) => [occurrence.node, occurrence]));
    const ors = [...parents.keys()].filter((node) => node.type === 'LogicalExpression' && node.operator === '||');
    const guards = (test: Node, value: string): boolean => {
        if (ors.some((node) => node.start >= test.start && node.end <= test.end)) {
            return false;
        }
        const bare = test.type === 'UnaryExpression' && test.operator === '!' ? test.argument : test;
        if (byNode.has(bare) && text(bare) === value) {
            byNode.get(bare).usage = 'check';
            return true;
        }
        return script.occurrences.some((item) => item.usage === 'check' && item.start >= test.start && item.start < test.end && text(item.node) === value);
    };
    for (const occurrence of script.occurrences) {
        if (occurrence.usage !== 'use' || !['MemberExpression', 'Identifier'].includes(occurrence.node.type)) {
            continue;
        }
        const value = text(occurrence.node);
        let child = occurrence.node;
        let parent = parents.get(child);
        while (parent) {
            const test = (parent.type === 'IfStatement' || parent.type === 'ConditionalExpression') && parent.test !== child ? parent.test
                : parent.type === 'LogicalExpression' && parent.operator === '&&' && parent.right === child ? parent.left : null;
            if (test && guards(test, value)) {
                occurrence.usage = 'check';
                break;
            }
            child = parent;
            parent = parents.get(parent);
        }
    }
    return script;
}

class Resolver {
    private readonly script: IScript;
    private readonly prefix: string;
    private readonly expression: boolean;
    private readonly roots: string[];
    private readonly known: Set<string>;
    private readonly learned = new Map<Node, Set<string>>();
    private readonly cache = new Map<Node, Set<string>>();

    constructor(script: IScript, prefix: string, expression: boolean, roots: string[], known: Set<string>) {
        this.script = script;
        this.prefix = prefix.replace(/\.$/, '');
        this.expression = expression;
        this.roots = roots;
        this.known = known;
    }

    public declaration(identifier: Node): Node | null {
        let scope: Node | null = scopeOf(identifier, this.script.parents);
        while (scope) {
            const found = this.script.scopes.get(scope)?.get(identifier.name);
            if (found) {
                return found;
            }
            scope = scope.type === 'Program' ? null : scopeOf(scope, this.script.parents);
        }
        return null;
    }

    private base(node: Node): Node | null {
        if (node.type === 'MemberExpression' || node.type === 'CallExpression') {
            return chainOf(node).base;
        }
        return null;
    }

    public learn(occurrence: IOccurrence, path: string): void {
        const base = this.base(occurrence.node);
        const declaration = base ? this.declaration(base) : null;
        const tail = chainOf(occurrence.node).keys.join('.');
        if (!declaration || !(path === tail || path.endsWith(`.${tail}`))) {
            return;
        }
        const prefixes = this.learned.get(declaration) || new Set<string>();
        prefixes.add(path.slice(0, Math.max(0, path.length - tail.length - 1)));
        this.learned.set(declaration, prefixes);
    }

    public paths(occurrence: IOccurrence): Set<string> {
        const { node } = occurrence;
        if (node.type === 'Property') {
            const pattern = this.script.parents.get(node);
            const declarator = pattern ? this.script.parents.get(pattern) : null;
            const from = declarator?.type === 'VariableDeclarator' && declarator.id === pattern ? declarator.init : null;
            return this.join(from ? this.value(from, new Set<Node>()) : new Set<string>(), [occurrence.key]);
        }
        if (node.type === 'CallExpression' || node.type === 'Identifier') {
            return this.join(new Set([this.prefix]), occurrence.keys);
        }
        return this.value(node, new Set<Node>());
    }

    private join(prefixes: Set<string>, keys: string[]): Set<string> {
        return new Set([...prefixes].map((prefix) => prefix === OTHER ? OTHER : [prefix, ...keys].filter(Boolean).join('.')));
    }

    private value(node: Node | undefined, seen: Set<Node>): Set<string> {
        if (!node) {
            return new Set<string>();
        }
        if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'getField') {
            const argument = node.arguments[0];
            if (argument?.type === 'Literal' && typeof argument.value === 'string') {
                const fieldKeys = argument.value.split('.').filter((part: string) => part && !/^\d+$/.test(part));
                return this.join(new Set([this.prefix]), fieldKeys);
            }
        }
        if (node.type === 'LogicalExpression' && (node.operator === '||' || node.operator === '??')) {
            return new Set([...this.value(node.left, seen), ...this.value(node.right, seen)]);
        }
        const { keys, base } = chainOf(node);
        const subject = keys.lastIndexOf('credentialSubject');
        const declaration = base ? this.declaration(base) : null;
        let prefixes: Set<string>;
        if (declaration) {
            prefixes = this.resolve(declaration, seen);
        } else if (base && FOREIGN.has(base.name)) {
            prefixes = new Set([OTHER]);
        } else if (base && this.expression) {
            const field = [this.prefix, base.name].filter(Boolean).join('.');
            prefixes = new Set([[...this.known].some((path) => path === field || path.startsWith(`${field}.`)) ? field : this.prefix]);
        } else {
            prefixes = base && this.roots.includes(base.name) ? new Set([this.prefix]) : new Set<string>();
        }
        if (subject >= 0) {
            return prefixes.size === 1 && prefixes.has(OTHER) ? prefixes : this.join(new Set([this.prefix]), keys.slice(subject + 1));
        }
        return this.join(prefixes, keys);
    }

    private resolve(declaration: Node, seen: Set<Node>): Set<string> {
        const cached = this.learned.get(declaration) ?? this.cache.get(declaration);
        if (cached) {
            return cached;
        }
        if (seen.has(declaration)) {
            return new Set<string>();
        }
        seen.add(declaration);
        const result = new Set<string>();
        if (declaration.type === 'VariableDeclarator') {
            this.value(declaration.init, seen).forEach((path) => result.add(path));
        } else {
            const owner = this.script.parents.get(declaration);
            const index = owner?.params.indexOf(declaration) ?? -1;
            const name = owner ? functionName(owner, this.script.parents.get(owner) ?? null) : null;
            for (const ownerCall of name ? this.script.calls.get(name) || [] : []) {
                this.value(ownerCall.arguments[index], seen).forEach((path) => result.add(path));
            }
            const call = owner ? this.script.parents.get(owner) : null;
            if (call?.type === 'CallExpression' && call.arguments.includes(owner) && call.callee.type === 'MemberExpression'
                && ITERATORS.has(keyOf(call.callee) ?? '')) {
                this.value(call.callee.object, seen).forEach((path) => result.add(path));
            }
        }
        seen.delete(declaration);
        this.cache.set(declaration, result);
        return result;
    }
}

function deadRanges(script: IScript, unexecuted: [number, number][]): { reachable: [number, number][]; skipped: [number, number][] } {
    const uncalled = unexecuted.map(([start, end]) => ({
        start,
        end,
        name: script.functions.find((item) => item.end === end && start >= item.start && start <= item.body)?.name ?? null
    }));
    const inside = (position: number, ranges: { start: number; end: number }[]) => ranges.some((range) => position >= range.start && position < range.end);
    let skipped = uncalled.filter((range) => range.name !== null);
    for (let changed = true; changed;) {
        changed = false;
        for (const range of skipped) {
            if (script.references.some((reference) => reference.name === range.name
                && !(reference.start >= range.start && reference.start < range.end)
                && !inside(reference.start, skipped))) {
                skipped = skipped.filter((item) => item !== range);
                changed = true;
                break;
            }
        }
    }
    return {
        reachable: uncalled.filter((range) => !skipped.includes(range) && !inside(range.start, skipped)).map((range): [number, number] => [range.start, range.end]),
        skipped: skipped.map((range): [number, number] => [range.start, range.end])
    };
}

export function findPreviewScriptFields(
    source: string,
    sites: IPreviewReadSite[],
    unexecuted: [number, number][],
    schema: string | null,
    paths: string[],
    expression: boolean = false,
    prefix: string = '',
    roots: string[] = [],
    language: 'javascript' | 'mathjs' = 'javascript'
): IPreviewReadRecord[] {
    if (language === 'mathjs') {
        return findPreviewFormulaFields(source, sites, schema, paths);
    }
    let script: IScript;
    try {
        script = collect(source, expression);
    } catch {
        return sites.map(({ schema: readSchema, path, fullPath }) => ({ schema: readSchema, path, fullPath }));
    }
    const known = new Set(paths);
    const sections = new Set(paths.map((path) => path.split('.').slice(0, -1).join('.')).filter(Boolean));
    const byKey = new Map<string, string[]>();
    for (const path of paths) {
        const key = path.split('.').pop() || '';
        byKey.set(key, [...(byKey.get(key) || []), path]);
    }
    const own = (read: IPreviewReadRecord) => read.schema === schema || read.schema === null;
    const bySite = new Map<number, IOccurrence[]>();
    for (const occurrence of script.occurrences) {
        bySite.set(occurrence.start, [...(bySite.get(occurrence.start) || []), occurrence]);
    }
    const resolver = new Resolver(script, prefix, expression, roots, known);
    const named = new Set<string>();
    const evidence = new Set<string>();
    const siteOf = (read: IPreviewReadSite) => {
        const key = read.path.split('.').pop() || '';
        return bySite.get(read.site)?.find((item) => item.key === key || item.dynamic && !read.listed);
    };
    for (const read of sites) {
        const occurrence = siteOf(read);
        if (occurrence && !occurrence.dynamic && own(read)) {
            resolver.learn(occurrence, read.path);
            named.add(read.path);
            read.path.split('.').forEach((_part, index, parts) => evidence.add(parts.slice(0, index + 1).join('.')));
        }
    }
    const suffixes = new Map<string, string[]>();
    const candidates = (occurrence: IOccurrence): string[] => {
        const resolved = resolver.paths(occurrence);
        if (resolved.has(OTHER) && resolved.size === 1) {
            return [];
        }
        const exact = [...resolved].filter((path) => known.has(path));
        if (exact.length || resolved.size) {
            return exact;
        }
        const id = occurrence.keys.join('.');
        if (!suffixes.has(id)) {
            const keyed = byKey.get(occurrence.key) || [];
            let matches: string[] = [];
            for (let length = occurrence.keys.length; length > 0 && !matches.length; length--) {
                const suffix = occurrence.keys.slice(-length).join('.');
                matches = keyed.filter((path) => path === suffix || path.endsWith(`.${suffix}`));
            }
            const evidenced = matches.filter((path) => {
                const parent = path.slice(0, path.lastIndexOf('.'));
                return parent ? evidence.has(parent) : named.size > 0;
            });
            suffixes.set(id, evidenced.length ? evidenced : matches);
        }
        return suffixes.get(id) || [];
    };
    const { reachable, skipped } = expression ? { reachable: [[0, source.length] as [number, number]], skipped: [] } : deadRanges(script, unexecuted);
    const within = (position: number, ranges: [number, number][]) => ranges.some(([start, end]) => position >= start && position < end);
    const usedKeys = new Set<string>();
    const usedPaths = new Set<string>();
    const result = new Map<string, IPreviewReadRecord>();
    const add = (read: IPreviewReadRecord) => result.set(`${read.schema ?? ''}\u0000${read.fullPath ?? read.path}`, read);
    for (const occurrence of script.occurrences) {
        if (occurrence.dynamic || within(occurrence.start, skipped)
            || occurrence.node.type === 'Identifier' && resolver.declaration(occurrence.node)) {
            continue;
        }
        const matches = candidates(occurrence);
        if (occurrence.usage === 'path' && occurrence.next !== null && !/^\d+$/.test(occurrence.next)
            && !ITERATORS.has(occurrence.next) && occurrence.next !== 'length'
            && !matches.some((path) => known.has(`${path}.${occurrence.next}`))) {
            occurrence.usage = 'use';
        }
        if (occurrence.usage !== 'use') {
            continue;
        }
        usedKeys.add(occurrence.key);
        matches.forEach((path) => usedPaths.add(path));
        if (within(occurrence.start, reachable)) {
            matches.filter((path) => !sections.has(path)).forEach((path) => add({ schema, path }));
        }
    }
    const callers = new Map<number, Node>();
    for (const node of script.parents.keys()) {
        if (node.type === 'CallExpression') {
            if (node.callee.type === 'Identifier') {
                callers.set(node.callee.start, node);
            } else if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
                callers.set(node.callee.property.start, node);
            }
            callers.set(source.indexOf('(', node.callee.end), node);
        }
    }
    const explicit = (read: IPreviewReadSite) => {
        const call = read.call === undefined ? undefined : callers.get(read.call);
        return !call || usageOf(call, script.parents) !== 'check';
    };
    for (const read of sites) {
        const occurrence = siteOf(read);
        const required = read.site === -2 ? explicit(read) : (occurrence
            ? occurrence.usage === 'use' || occurrence.usage === 'path' && !read.nested
            : own(read) ? usedPaths.has(read.path) : usedKeys.has(read.path.split('.').pop() || ''));
        if (required) {
            add({ schema: read.schema, path: read.path, fullPath: read.fullPath });
        }
    }
    return [...result.values()];
}

function findPreviewFormulaFields(
    source: string,
    sites: IPreviewReadSite[],
    schema: string | null,
    paths: string[]
): IPreviewReadRecord[] {
    const known = new Set(paths);
    const result = new Map<string, IPreviewReadRecord>();
    const add = (read: IPreviewReadRecord) => {
        if (known.has(read.path) && (read.schema === null || read.schema === schema)) {
            result.set(`${read.schema ?? ''}\u0000${read.fullPath ?? read.path}`, read);
        }
    };
    sites.forEach(({ schema: readSchema, path, fullPath }) => add({ schema: readSchema, path, fullPath }));
    let root: MathNode;
    try {
        root = parseFormula(source);
    } catch {
        return [...result.values()];
    }
    const functions = new Map<string, FunctionAssignmentNode>();
    root.traverse((node) => {
        if (isFunctionAssignmentNode(node)) {
            functions.set(node.name, node);
        }
    });
    const append = (bases: Set<string>, keys: (string | null)[]): Set<string> => {
        let current = bases;
        for (const key of keys) {
            current = new Set([...current].flatMap((base) => key === null
                ? paths.filter((path) => path.startsWith(`${base}.`)).map((path) => `${base}.${path.slice(base.length + 1).split('.')[0]}`)
                : [key ? `${base}.${key}` : base]));
        }
        return current;
    };
    const uncertain = new WeakSet<Set<string>>();
    const mergeBindings = (target: Map<string, Set<string>>, left: Map<string, Set<string>>, right: Map<string, Set<string>>) => {
        for (const name of new Set([...left.keys(), ...right.keys()])) {
            const first = left.get(name);
            const second = right.get(name);
            const merged = new Set([...(first ?? [name]), ...(second ?? [name])]);
            if (first && uncertain.has(first) || second && uncertain.has(second)) {
                uncertain.add(merged);
            }
            target.set(name, merged);
        }
    };
    const isWritten = (path: string, written: Set<string>) => [...written].some((value) => path === value || path.startsWith(`${value}.`));
    const visit = (
        node: MathNode,
        parameters: Map<string, Set<string>>,
        seen: Set<MathNode>,
        written: Set<string>,
        recordWrites: boolean = true
    ): Set<string> => {
        if (seen.has(node)) {
            return new Set();
        }
        const active = new Set([...seen, node]);
        let uncertainResult = false;
        const child = (value: MathNode) => {
            const childResult = visit(value, parameters, active, written, recordWrites);
            uncertainResult ||= uncertain.has(childResult);
            return childResult;
        };
        let origins = new Set<string>();
        if (isParenthesisNode(node)) {
            origins = child(node.content);
        } else if (isSymbolNode(node)) {
            origins = parameters.get(node.name) ?? new Set([node.name]);
        } else if (isAccessorNode(node)) {
            const bases = child(node.object);
            const keys = node.index.dimensions.map((dimension): string | null => {
                let value = dimension;
                while (isParenthesisNode(value)) {
                    value = value.content;
                }
                if (isConstantNode(value)) {
                    return typeof value.value === 'string' ? value.value : '';
                }
                child(dimension);
                return null;
            });
            origins = append(bases, keys);
            uncertainResult ||= keys.some((key) => key === null || key === '');
        } else if (isConditionalNode(node)) {
            child(node.condition);
            const leftBindings = new Map(parameters);
            const rightBindings = new Map(parameters);
            const leftWrites = new Set(written);
            const rightWrites = new Set(written);
            const left = visit(node.trueExpr, leftBindings, active, leftWrites, recordWrites);
            const right = visit(node.falseExpr, rightBindings, active, rightWrites, recordWrites);
            origins = new Set([...left, ...right]);
            uncertainResult ||= uncertain.has(left) || uncertain.has(right);
            mergeBindings(parameters, leftBindings, rightBindings);
            leftWrites.forEach((path) => {
                if (rightWrites.has(path)) {
                    written.add(path);
                }
            });
        } else if (isOperatorNode(node) && (node.fn === 'and' || node.fn === 'or')) {
            for (const [index, argument] of node.args.entries()) {
                if (index === 0) {
                    child(argument).forEach((path) => origins.add(path));
                } else {
                    const before = new Map(parameters);
                    const optional = new Map(parameters);
                    const argumentResult = visit(argument, optional, active, new Set(written), recordWrites);
                    argumentResult.forEach((path) => origins.add(path));
                    uncertainResult ||= uncertain.has(argumentResult);
                    mergeBindings(parameters, before, optional);
                }
            }
        } else if (isAssignmentNode(node)) {
            origins = child(node.value);
            if (!node.index && isSymbolNode(node.object)) {
                parameters.set(node.object.name, origins);
                if (recordWrites) {
                    written.add(node.object.name);
                }
            } else if (node.index) {
                const bases = child(node.object);
                const keys = node.index.dimensions.map((dimension): string | null => {
                    child(dimension);
                    let value = dimension;
                    while (isParenthesisNode(value)) {
                        value = value.content;
                    }
                    return isConstantNode(value) && typeof value.value === 'string' && !/^\d+$/.test(value.value) ? value.value : null;
                });
                if (recordWrites && !uncertain.has(bases) && keys.every((key) => key !== null)) {
                    append(bases, keys).forEach((path) => written.add(path));
                }
            }
        } else if (isFunctionAssignmentNode(node)) {
            return origins;
        } else if (isFunctionNode(node)) {
            uncertainResult = true;
            const args = node.args.map(child);
            const definition = isSymbolNode(node.fn) ? functions.get(node.fn.name) : undefined;
            if (definition) {
                const bound = new Map(parameters);
                definition.params.forEach((name, index) => bound.set(name, args[index] || new Set()));
                origins = visit(definition.expr, bound, active, new Set(written), false);
            } else {
                origins = new Set(args.flatMap((value) => [...value]));
            }
        } else {
            node.forEach((value) => child(value).forEach((path) => origins.add(path)));
        }
        const inputs = new Set([...origins].filter((path) => !isWritten(path, written)));
        if (uncertainResult || uncertain.has(origins)) {
            uncertain.add(inputs);
        }
        inputs.forEach((path) => add({ schema, path }));
        return inputs;
    };
    visit(root, new Map(), new Set(), new Set());
    const reads = [...result.values()];
    return reads.filter((read) => !reads.some((other) => other.schema === read.schema && other.path.startsWith(`${read.path}.`)));
}

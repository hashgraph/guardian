import { compileFunction, createContext, runInContext } from 'node:vm';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as mathjs from 'mathjs';
import { LocationType, SchemaCondition, SchemaField, SchemaHelper, } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { Message } from '@guardian/hedera/message/message';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import { IPolicyEvent } from '../interfaces/policy-event.js';
import { IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { IPreviewCalculation, IPreviewDocument, IPreviewRead, IPreviewSource, RecordActionStep } from '../record-action-step.js';
import { PolicyUtils } from './utils.js';
import { getDocumentValueByPath, MathEngine, MathItemType } from './math-model/index.js';
import { IPreviewWriteRecord, PREVIEW_SCRIPT_FILE, PreviewReadTracker } from './workers/preview-read-tracker.js';
import { hasPreviewPresenceCheck, IPreviewCopyDiagnosis, IPreviewCopyTarget, isPreviewFieldFailure, isPreviewFiniteResult, startPreviewCopyDiagnosis } from './workers/preview-copy-diagnosis.js';
import { findPreviewScriptFields } from './preview-script-fields.js';
import { buildTableHelper } from './table-field-core.js';
import { getPreviewIncomplete } from './preview-database.js';
import { BlockActionError } from '../errors/index.js';

export const PREVIEW_SKIPPED_INPUTS: ReadonlySet<string> = new Set<string>([
    PolicyInputEventType.TimerEvent,
    PolicyInputEventType.StartTimerEvent,
    PolicyInputEventType.StopTimerEvent,
    PolicyInputEventType.RefreshEvent,
    PolicyInputEventType.ReleaseEvent,
    PolicyInputEventType.RestoreEvent,
    PolicyInputEventType.RetryMintEvent,
    PolicyInputEventType.GetDataEvent
]);

export function isPreviewInputAllowed(input: string): boolean {
    return !PREVIEW_SKIPPED_INPUTS.has(input);
}

export function isPreviewResultOutput(output: string): boolean {
    return output !== PolicyOutputEventType.RefreshEvent && output !== PolicyOutputEventType.ReleaseEvent;
}

export function recordPreviewWait(
    event: Pick<IPolicyEvent<unknown>, 'actionStatus' | 'source' | 'outputType' | 'data'>,
    block: { tag?: string | null; blockType?: string | null }
): void {
    if (event.actionStatus?.preview && isPreviewResultOutput(event.outputType)) {
        event.actionStatus.addPreviewDocument(event.source ?? null, block, event.data);
    }
}

export function toPreviewFormPath(path: unknown): string | null {
    const match = /^(?:document\.)?credentialSubject(?:\.\d+)?\.(.+)$/.exec(String(path ?? ''));
    return match ? match[1] : null;
}

const previewStorage = new AsyncLocalStorage<RecordActionStep>();

const previewBlockStates = new WeakMap<RecordActionStep, Map<string, any>>();

export class PreviewScope {
    public static run<T>(actionStatus: RecordActionStep, callback: () => Promise<T>): Promise<T> {
        return previewStorage.run(actionStatus, callback);
    }

    public static current(): RecordActionStep | undefined {
        return previewStorage.getStore();
    }
}

const previewMessages = new WeakMap<RecordActionStep, Message[]>();
const previewRelayerAccounts = new WeakMap<RecordActionStep, Map<string, string>>();

let lastPreviewEntity = 0;

export function createPreviewEntityId(): string {
    lastPreviewEntity = Math.max(Date.now() * 1000, lastPreviewEntity + 1);
    return `0.0.${lastPreviewEntity}`;
}

export function createPreviewRelayerAccount(owner: string): string {
    const account = createPreviewEntityId();
    const actionStatus = PreviewScope.current();
    if (actionStatus?.preview) {
        const accounts = previewRelayerAccounts.get(actionStatus) || new Map<string, string>();
        accounts.set(account, owner);
        previewRelayerAccounts.set(actionStatus, accounts);
    }
    return account;
}

export function isPreviewRelayerAccount(owner: string, account: string): boolean {
    const actionStatus = PreviewScope.current();
    return !!actionStatus?.preview && previewRelayerAccounts.get(actionStatus)?.get(account) === owner;
}

export function registerPreviewMessage<T extends Message>(actionStatus: RecordActionStep, message: T, topicId: string | null | undefined): T {
    message.setId(createPreviewMessageId());
    if (topicId) {
        message.setTopicId(topicId);
    }
    const messages = previewMessages.get(actionStatus) || [];
    messages.push(message);
    previewMessages.set(actionStatus, messages);
    return message;
}

export function getPreviewMessages(actionStatus: RecordActionStep | undefined, topicId: string): Message[] {
    if (!actionStatus) {
        return [];
    }
    return (previewMessages.get(actionStatus) || []).filter((message) => message.getTopicId() === topicId);
}

const lastPreviewMessage = { time: 0, sequence: 0 };

export function createPreviewMessageId(): string {
    const time = Date.now();
    lastPreviewMessage.sequence = time === lastPreviewMessage.time ? lastPreviewMessage.sequence + 1 : 0;
    lastPreviewMessage.time = time;
    const nanos = (time % 1000) * 1000000 + lastPreviewMessage.sequence;
    return `${Math.floor(time / 1000)}.${String(nanos).padStart(9, '0')}`;
}

export function getPreviewBlockState<T>(actionStatus: RecordActionStep, key: string, create: () => T): T {
    let states = previewBlockStates.get(actionStatus);
    if (!states) {
        states = new Map();
        previewBlockStates.set(actionStatus, states);
    }
    if (!states.has(key)) {
        states.set(key, structuredClone(create()));
    }
    return states.get(key);
}

export function buildMathPreviewCalculation(
    source: string | null,
    expression: unknown,
    scope: Record<string, unknown>,
    result: unknown
): IPreviewCalculation {
    const calculation: IPreviewCalculation = {
        source,
        blockType: 'mathBlock',
        inputs: [],
        values: [],
        outputs: []
    };
    const engine = MathEngine.from(expression);
    if (!engine) {
        return calculation;
    }
    engine.validate();
    for (const link of engine.variables.getItems()) {
        if (link.name) {
            calculation.inputs.push({
                name: link.name,
                path: link.path,
                value: scope[link.name] ?? null
            });
        }
    }
    for (const formula of engine.formulas.getItems()) {
        if (formula.type === MathItemType.VARIABLE) {
            calculation.values.push({
                name: formula.functionName,
                description: formula.description || '',
                formula: formula.functionBodyText || '',
                value: scope[formula.functionName] ?? null
            });
        }
    }
    for (const link of engine.outputs.getItems()) {
        calculation.outputs.push({
            name: link.name,
            path: link.path,
            value: getDocumentValueByPath(result, link.path) ?? null
        });
    }
    return calculation;
}

export function buildCalculatePreviewCalculation(
    source: string | null,
    inputFields: { name: string; value: string }[] | undefined,
    outputFields: { name: string; value: string }[] | undefined,
    formulas: Record<string, unknown>,
    inputScope: Record<string, unknown>,
    scope: Record<string, unknown>,
    result: Record<string, unknown>
): IPreviewCalculation {
    return {
        source,
        blockType: 'calculateContainerBlock',
        inputs: (inputFields || []).map((field) => ({
            name: field.value,
            path: field.name,
            value: inputScope[field.value] ?? null
        })),
        values: Object.keys(formulas).map((name) => ({
            name,
            description: '',
            formula: String(formulas[name] ?? ''),
            value: scope[name] ?? null
        })),
        outputs: (outputFields || []).map((field) => ({
            name: field.value,
            path: field.name,
            value: result[field.name] ?? null
        }))
    };
}

export function isEmptyPreviewValue(value: unknown): boolean {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

export function normalizePreviewPath(path: string): string {
    return path
        .split('.')
        .filter((part) => part !== '' && !/^\d+$/.test(part))
        .join('.');
}

function collectPreviewValues(node: unknown, parts: string[], values: unknown[]): void {
    if (Array.isArray(node)) {
        for (const item of node) {
            collectPreviewValues(item, parts, values);
        }
        return;
    }
    if (!parts.length) {
        values.push(node);
        return;
    }
    if (node && typeof node === 'object') {
        collectPreviewValues(Reflect.get(node, parts[0]), parts.slice(1), values);
        return;
    }
    values.push(undefined);
}

export function isMissingPreviewValue(document: unknown, path: string): boolean {
    const values: unknown[] = [];
    collectPreviewValues(document, path.split('.'), values);
    return values.every((value) => isEmptyPreviewValue(value));
}

export function collectPreviewPaths(fields: SchemaField[] | undefined, prefix: string = ''): string[] {
    const paths: string[] = [];
    for (const field of fields || []) {
        const path = `${prefix}${field.name}`;
        paths.push(path);
        if (field.isRef) {
            paths.push(...collectPreviewPaths(field.fields, `${path}.`));
        }
    }
    return paths;
}

function getPreviewPlaceholder(field: SchemaField): unknown {
    if (field.isRef) {
        const child: Record<string, unknown> = {};
        fillPreviewPlaceholders(field.fields, child);
        return child;
    }
    if (field.customType) {
        return undefined;
    }
    if (Array.isArray(field.enum) && field.enum.length) {
        return field.enum[0];
    }
    if (field.type === 'number' || field.type === 'integer') {
        return 0;
    }
    if (field.type === 'boolean') {
        return false;
    }
    if (field.type === 'string') {
        return '';
    }
    return undefined;
}

export function fillPreviewPlaceholders(fields: SchemaField[] | undefined, document: unknown): void {
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
        return;
    }
    for (const field of fields || []) {
        if (field.autocalculate) {
            continue;
        }
        const current = Reflect.get(document, field.name);
        if (field.isRef && !field.isArray && current && typeof current === 'object' && !Array.isArray(current)) {
            fillPreviewPlaceholders(field.fields, current);
            continue;
        }
        if (!isEmptyPreviewValue(current)) {
            continue;
        }
        const placeholder = getPreviewPlaceholder(field);
        if (placeholder === undefined) {
            continue;
        }
        Reflect.set(document, field.name, field.isArray ? [placeholder] : placeholder);
    }
}

export function collectPreviewHiddenPaths(fields: SchemaField[] | undefined, prefix: string = ''): string[] {
    return (fields || []).flatMap((field) => field.hidden
        ? [`${prefix}${field.name}`]
        : field.isRef ? collectPreviewHiddenPaths(field.fields, `${prefix}${field.name}.`) : []);
}

export function collectPreviewNullPaths(fields: SchemaField[] | undefined, prefix: string = ''): string[] {
    return (fields || []).flatMap((field) => field.type === 'null'
        ? [`${prefix}${field.name}`]
        : field.isRef ? collectPreviewNullPaths(field.fields, `${prefix}${field.name}.`) : []);
}

export function collectPreviewUnavailablePaths(
    fields: SchemaField[] | undefined,
    conditions: SchemaCondition[] | undefined,
    document: unknown,
    prefix: string = ''
): string[] {
    const unavailable = new Set<string>();
    const evaluate = (condition: SchemaCondition) => SchemaHelper.evaluateIfCondition(condition.ifCondition, document);
    const revealMap = SchemaHelper.buildRevealMap(conditions || []);
    for (const condition of conditions || []) {
        const reachable = SchemaHelper.isConditionReachable(condition, revealMap, evaluate);
        const matches = reachable && evaluate(condition);
        const active = new Set((reachable ? matches ? condition.thenFields : condition.elseFields : []).map((field) => field.name));
        for (const field of [...condition.thenFields, ...condition.elseFields]) {
            if (!active.has(field.name)) {
                unavailable.add(`${prefix}${field.name}`);
            }
        }
        for (const branch of ['then', 'else']) {
            const targets = branch === 'then' ? condition.thenTargets : condition.elseTargets;
            for (const target of targets || []) {
                for (const path of expandPreviewPath(document, target.fieldPath, [])) {
                    const entries: Record<string, number> = {};
                    const parts = path.split('.');
                    for (const [index, part] of parts.entries()) {
                        if (/^\d+$/.test(part)) {
                            entries[normalizePreviewPath(parts.slice(0, index).join('.'))] = Number(part);
                        }
                    }
                    const test = (item: SchemaCondition) => SchemaHelper.evaluateIfCondition(
                        item.ifCondition, document, SchemaHelper.valuesEqual, { entries }
                    );
                    if (!SchemaHelper.isConditionReachable(condition, revealMap, test) || test(condition) !== (branch === 'then')) {
                        unavailable.add(`${prefix}${path}`);
                    }
                }
            }
        }
    }
    for (const field of fields || []) {
        if (!field.isRef) {
            continue;
        }
        const value = document && typeof document === 'object' ? Reflect.get(document, field.name) : undefined;
        const entries = field.isArray ? Array.isArray(value) ? value : [] : [value];
        for (const [index, entry] of entries.entries()) {
            const path = `${prefix}${field.name}.${field.isArray ? index + '.' : ''}`;
            for (const unavailablePath of collectPreviewUnavailablePaths(field.fields, field.conditions, entry, path)) {
                unavailable.add(unavailablePath);
            }
        }
    }
    return [...unavailable].sort();
}

export function calculatePreviewAutoFields(
    fields: SchemaField[] | undefined,
    document: unknown,
    dependencies: Record<string, string[]>,
    errors: string[],
    prefix: string = '',
    discovery: boolean = false,
    fullPrefix: string = prefix
): void {
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
        return;
    }
    const names = new Set((fields || []).map((field) => field.name));
    const paths = collectPreviewPaths(fields, prefix);
    for (const field of fields || []) {
        const value = Reflect.get(document, field.name);
        if (field.isRef) {
            const children = Array.isArray(value) ? value : [value];
            for (const [index, child] of children.entries()) {
                const childPrefix = `${fullPrefix}${field.name}.${Array.isArray(value) ? index + '.' : ''}`;
                calculatePreviewAutoFields(field.fields, child, dependencies, errors, `${prefix}${field.name}.`, discovery, childPrefix);
            }
            continue;
        }
        if (!field.autocalculate) {
            continue;
        }
        const path = `${prefix}${field.name}`;
        const tracker = new PreviewReadTracker();
        const described = new Set<string>();
        let listed = false;
        let written = false;
        const scope = new Proxy(document, {
            ownKeys(target) {
                listed = true;
                return Reflect.ownKeys(target);
            },
            set(target, key, assigned, receiver) {
                written = true;
                return Reflect.set(target, key, assigned, receiver);
            },
            deleteProperty(target, key) {
                written = true;
                return Reflect.deleteProperty(target, key);
            },
            getOwnPropertyDescriptor(target, key) {
                if (typeof key === 'string') {
                    described.add(key);
                }
                return Reflect.getOwnPropertyDescriptor(target, key);
            },
            has(target, key) {
                if (typeof key === 'string' && names.has(key) && !Reflect.has(target, key)) {
                    tracker.add(null, `${prefix}${key}`, `${fullPrefix}${key}`, null, tracker.site());
                    return discovery;
                }
                return Reflect.has(target, key);
            },
            get(target, key, receiver) {
                const propertyValue = Reflect.get(target, key, receiver);
                if (typeof key !== 'string' || !names.has(key)) {
                    return propertyValue;
                }
                tracker.add(null, `${prefix}${key}`, `${fullPrefix}${key}`, null, tracker.site(), described.delete(key), !!propertyValue && typeof propertyValue === 'object');
                return tracker.track(propertyValue, null, `${prefix}${key}`, `${fullPrefix}${key}`);
            }
        });
        let source = `(${field.expression || ''})`;
        let failed = false;
        let thrown: Error | null = null;
        try {
            const result = tracker.unwrap(PolicyUtils.autoCalculateField(field, scope, (name: string, body: string) => {
                source = body;
                tracker.configure(body);
                const compiled = compileFunction(body, [name], { filename: PREVIEW_SCRIPT_FILE });
                return function (this: unknown, ...args: unknown[]) {
                    try {
                        return compiled.apply(this, args);
                    } catch (error) {
                        thrown = error && typeof error === 'object' ? error as Error : null;
                        throw error;
                    }
                };
            }));
            if (!discovery) {
                failed = !isPreviewFiniteResult(result);
                assertPreviewCalculationResult(result);
            }
            if (result === undefined) {
                Reflect.deleteProperty(document, field.name);
            } else {
                Reflect.set(document, field.name, result);
            }
        } catch (error) {
            Reflect.deleteProperty(document, field.name);
            errors.push(`Invalid expression: ${path}`);
            failed = failed || isPreviewFieldFailure(thrown?.name, thrown?.message);
        }
        const required = findPreviewScriptFields(source, tracker.takeSites(), [], null, paths, true, prefix);
        if (failed && !discovery) {
            const enumerated = tracker.takeEnumerated();
            if (listed) {
                enumerated.push({ schema: null, document: null, path: fullPrefix.replace(/\.$/, '') });
            }
            const targets: IPreviewCopyTarget[] = [];
            for (const record of enumerated) {
                const relative = fullPrefix && record.path.startsWith(fullPrefix)
                    ? record.path.slice(fullPrefix.length) : record.path === fullPrefix.replace(/\.$/, '') ? '' : record.path;
                let entry = document;
                let nestedFields = fields;
                for (const part of relative ? relative.split('.') : []) {
                    entry = entry && typeof entry === 'object' ? Reflect.get(entry, part) : undefined;
                    if (!isPreviewIndex(part)) {
                        nestedFields = nestedFields?.find((item) => item.name === part)?.fields;
                    }
                }
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    continue;
                }
                const empty = (nestedFields || [])
                    .filter((item) => !item.autocalculate && !item.isRef && isEmptyPreviewValue(Reflect.get(entry, item.name)))
                    .map((item) => item.name);
                if (empty.length) {
                    targets.push({ schema: null, document: 0, path: relative, names: empty });
                }
            }
            if (targets.length) {
                const found = written || tracker.takeWrites().length ? [] : diagnosePreviewAutoField(field, document, targets, paths, prefix, fullPrefix);
                required.push(...(found.length ? found : targets.flatMap((target) => target.names.map((name) => {
                    const relative = target.path ? `${target.path}.${name}` : name;
                    return { schema: null, path: `${prefix}${normalizePreviewPath(relative)}`, fullPath: `${fullPrefix}${relative}` };
                }))));
            }
        }
        const fullPath = `${fullPrefix}${field.name}`;
        dependencies[fullPath] = [...new Set([...(dependencies[fullPath] || []), ...required.map((read) => read.fullPath ?? read.path)])].filter((read) => read !== fullPath);
    }
}

function diagnosePreviewAutoField(
    field: SchemaField,
    document: object,
    targets: IPreviewCopyTarget[],
    paths: string[],
    prefix: string,
    fullPrefix: string
): IPreviewRead[] {
    if (hasPreviewPresenceCheck(`(${field.expression || ''})`)) {
        return [];
    }
    let subject: object;
    try {
        subject = structuredClone(document);
    } catch {
        return [];
    }
    const context = createContext(Object.create(null));
    const tracker = new PreviewReadTracker();
    const body = `with (this) { return ${field.expression} }`;
    let failed = false;
    let finish: ((failed: boolean) => IPreviewCopyDiagnosis) | null = null;
    try {
        finish = startPreviewCopyDiagnosis(tracker, [{
            objectPrototype: runInContext('Object.getPrototypeOf({})', context),
            objectConstructor: runInContext('Object', context),
            reflect: runInContext('Reflect', context),
            global: runInContext('globalThis', context)
        }], targets, [subject]);
        tracker.configure(body);
        const func = compileFunction(body, ['table'], { filename: PREVIEW_SCRIPT_FILE, parsingContext: context });
        Reflect.set(context, '__previewAutoField', () => func.apply(subject, [buildTableHelper()]));
        failed = !isPreviewFiniteResult(runInContext('__previewAutoField()', context, { timeout: 1000 }));
    } catch {
        failed = true;
    }
    const diagnosis = finish?.(failed);
    if (!diagnosis?.trusted || !diagnosis.failed || !diagnosis.sites.length) {
        return [];
    }
    const sites = diagnosis.sites.map((site) => ({ ...site, path: `${prefix}${site.path}`, fullPath: `${fullPrefix}${site.fullPath}` }));
    return findPreviewScriptFields(body, sites, [], null, paths, true, prefix);
}

export function getMathPreviewReads(expression: unknown, currentSchema: string | null): (IPreviewRead & { link: string | null })[] {
    const engine = MathEngine.from(expression);
    if (!engine) {
        return [];
    }
    engine.validate();
    return engine.variables
        .getItems()
        .filter((link) => !!link.path)
        .map((link) => ({ schema: link.schema || currentSchema, path: link.path, link: link.schema || null }));
}

export function getMathPreviewOutputPaths(expression: unknown): string[] {
    const engine = MathEngine.from(expression);
    if (!engine) {
        return [];
    }
    engine.validate();
    return engine.outputs
        .getItems()
        .filter((link) => !!link.path)
        .map((link) => normalizePreviewPath(link.path));
}

export function isPreviewOutputRead(path: string, outputPaths: string[]): boolean {
    const normalized = normalizePreviewPath(path);
    return outputPaths.some((output) => normalized === output
        || normalized.startsWith(`${output}.`)
        || output.startsWith(`${normalized}.`));
}

const previewComputed = new WeakMap<object, string[]>();

export function getPreviewComputed(document: unknown): string[] {
    return document && typeof document === 'object' ? previewComputed.get(document) ?? [] : [];
}

export function setPreviewComputed<T>(document: T, paths: string[]): T {
    if (document && typeof document === 'object') {
        previewComputed.set(document, [...new Set(paths.filter((path) => !!path))]);
    }
    return document;
}

const previewSchemas = new WeakMap<object, string>();

export function getPreviewDocumentSchema(document: unknown): string | null {
    if (!document || typeof document !== 'object') {
        return null;
    }
    const schema = Reflect.get(document, 'schema');
    return typeof schema === 'string' ? schema : previewSchemas.get(document) ?? null;
}

export function setPreviewDocumentSchema<T>(document: T, schema: string | null | undefined): T {
    if (document && typeof document === 'object' && schema) {
        previewSchemas.set(document, schema);
    }
    return document;
}

function isPreviewIndex(part: string): boolean {
    return /^\d+$/.test(part);
}

export function isPreviewPathCovered(path: string, computed: string): boolean {
    const read = path.split('.').filter((part) => part !== '');
    const written = computed.split('.').filter((part) => part !== '');
    let readIndex = 0;
    let writtenIndex = 0;
    while (readIndex < read.length && writtenIndex < written.length) {
        if (read[readIndex] === written[writtenIndex]) {
            readIndex++;
            writtenIndex++;
        } else if (isPreviewIndex(read[readIndex]) && !isPreviewIndex(written[writtenIndex])) {
            readIndex++;
        } else {
            return false;
        }
    }
    return true;
}

function expandPreviewPath(node: unknown, parts: string[], prefix: string[]): string[] {
    if (!parts.length) {
        return [prefix.join('.')];
    }
    if (Array.isArray(node)) {
        if (isPreviewIndex(parts[0])) {
            return expandPreviewPath(node[Number(parts[0])], parts.slice(1), [...prefix, parts[0]]);
        }
        return node.flatMap((item, index) => expandPreviewPath(item, parts, [...prefix, String(index)]));
    }
    if (node && typeof node === 'object') {
        return expandPreviewPath(Reflect.get(node, parts[0]), parts.slice(1), [...prefix, parts[0]]);
    }
    return [[...prefix, ...parts].join('.')];
}

export function isPreviewComputedRead(documents: unknown, schema: string | null, path: string): boolean {
    const items = (Array.isArray(documents) ? documents : [documents])
        .filter((document) => getPreviewDocumentSchema(document) === schema);
    return items.length > 0 && items.every((document) => {
        const computed = getPreviewComputed(document);
        const paths = expandPreviewPath(getPreviewSubject(document), path.split('.').filter((part) => part !== ''), []);
        return (paths.length ? paths : [path]).every((item) => computed.some((written) => isPreviewPathCovered(item, written)));
    });
}

const previewResultDocuments = new WeakMap<RecordActionStep, WeakSet<object>>();

export function markPreviewResultDocument<T>(document: T): T {
    const step = PreviewScope.current();
    if (step?.preview && document && typeof document === 'object') {
        let results = previewResultDocuments.get(step);
        if (!results) {
            results = new WeakSet<object>();
            previewResultDocuments.set(step, results);
        }
        results.add(document);
    }
    return document;
}

function isPreviewResultDocument(document: unknown): boolean {
    const step = PreviewScope.current();
    return !!step && !!document && typeof document === 'object' && !!previewResultDocuments.get(step)?.has(document);
}

const previewStoredDocuments = new WeakMap<RecordActionStep, WeakSet<object>>();

export function markPreviewStoredDocuments<T>(value: T): T {
    const actionStatus = PreviewScope.current();
    if (actionStatus?.preview) {
        let stored = previewStoredDocuments.get(actionStatus);
        if (!stored) {
            stored = new WeakSet<object>();
            previewStoredDocuments.set(actionStatus, stored);
        }
        for (const item of Array.isArray(value) ? value : [value]) {
            if (item && typeof item === 'object') {
                stored.add(item);
                const nested = Reflect.get(item, 'document');
                if (nested && typeof nested === 'object' && Reflect.has(nested, 'document')) {
                    stored.add(nested);
                }
            }
        }
    }
    return value;
}

export function isPreviewStoredDocument(document: unknown): boolean {
    const actionStatus = PreviewScope.current();
    return !!actionStatus && !!document && typeof document === 'object' && !!previewStoredDocuments.get(actionStatus)?.has(document);
}

const previewExtractedDocuments = new WeakMap<RecordActionStep, WeakMap<object, { document: unknown; path: string }>>();

export function markPreviewExtractedDocument<T>(document: T, source: unknown, path: string): T {
    const actionStatus = PreviewScope.current();
    if (actionStatus?.preview && document && typeof document === 'object') {
        let extracted = previewExtractedDocuments.get(actionStatus);
        if (!extracted) {
            extracted = new WeakMap<object, { document: unknown; path: string }>();
            previewExtractedDocuments.set(actionStatus, extracted);
        }
        extracted.set(document, { document: source, path });
    }
    return document;
}

function getPreviewExtractedOrigin(document: unknown): { document: unknown; path: string } | null {
    const actionStatus = PreviewScope.current();
    return actionStatus && document && typeof document === 'object'
        ? previewExtractedDocuments.get(actionStatus)?.get(document) ?? null
        : null;
}

export function resolvePreviewDocumentRead(document: unknown, path: string): IPreviewRead | null {
    const schema = getPreviewDocumentSchema(document);
    if (isPreviewStoredDocument(document) || isPreviewResultDocument(document) || isPreviewComputedRead(document, schema, path)) {
        return null;
    }
    const origin = getPreviewExtractedOrigin(document);
    if (origin) {
        return resolvePreviewDocumentRead(origin.document, origin.path ? `${origin.path}.${path}` : path);
    }
    return { schema, path };
}

export function getPreviewDocumentPaths(document: unknown, paths: string[]): string[] {
    const origin = getPreviewExtractedOrigin(document);
    if (!origin) {
        return paths;
    }
    const prefix = normalizePreviewPath(origin.path);
    return getPreviewDocumentPaths(origin.document, paths)
        .filter((path) => !prefix || path.startsWith(`${prefix}.`))
        .map((path) => prefix ? path.slice(prefix.length + 1) : path);
}

export function evaluatePreviewSwitchFormula(formula: string, scope: any, record: (key: string, index: number | null) => void, ready?: () => void): unknown {
    let name = 'previewReadElement';
    while (formula.includes(name) || Object.prototype.hasOwnProperty.call(scope, name)) {
        name += '_';
    }
    const values = new Map(Object.entries(scope));
    const read = (value: any, key: string, object?: unknown) => {
        const source = object === undefined || object === null ? value : object;
        const origin = values.get(key) === source ? key : [...values]
            .find(([, original]) => original && typeof original === 'object' && original === source)?.[0];
        if (!origin) {
            return value;
        }
        if (object === null) {
            record(origin, NaN);
        } else if (object === undefined) {
            record(origin, null);
        } else {
            const indexes = mathjs.isMatrix(value) ? value.toArray() : value;
            for (const index of Array.isArray(indexes) ? indexes : [indexes]) {
                record(origin, Number.isInteger(index) ? index - 1 : null);
            }
        }
        return value;
    };
    try {
        const tree = mathjs.parse(formula);
        const functions = new Set<string>();
        tree.traverse((node) => {
            if (node.type === 'FunctionAssignmentNode' && typeof Reflect.get(node, 'name') === 'string') {
                functions.add(Reflect.get(node, 'name'));
            }
        });
        const visit = (node: mathjs.MathNode, parent?: mathjs.MathNode, path?: string): mathjs.MathNode => {
            if (mathjs.isAccessorNode(node) && mathjs.isSymbolNode(node.object)
                && !(node.index.dimensions.length === 1 && mathjs.isConstantNode(node.index.dimensions[0])
                    && typeof node.index.dimensions[0].value === 'string')) {
                const key = node.object.name;
                const dimensions = node.index.dimensions.map((dimension, index) => index === 0
                    ? new mathjs.FunctionNode(new mathjs.SymbolNode(name), [visit(dimension, node.index), new mathjs.ConstantNode(key), node.object])
                    : visit(dimension, node.index));
                return new mathjs.AccessorNode(node.object, new mathjs.IndexNode(dimensions, node.index.dotNotation));
            }
            if (mathjs.isSymbolNode(node)
                && !(parent && mathjs.isAccessorNode(parent) && path === 'object')
                && !(parent && mathjs.isFunctionNode(parent) && path === 'fn')
                && !(parent && mathjs.isAssignmentNode(parent) && path === 'object')
                && !(parent && mathjs.isFunctionNode(parent) && mathjs.isSymbolNode(parent.fn)
                    && (parent.fn.name === 'map' || parent.fn.name === 'filter')
                    && path === `args[${parent.args.length - 1}]`)) {
                const reference = parent && (mathjs.isAssignmentNode(parent) && path === 'value'
                    || mathjs.isFunctionNode(parent) && mathjs.isSymbolNode(parent.fn) && functions.has(parent.fn.name));
                const args: mathjs.MathNode[] = [node, new mathjs.ConstantNode(node.name)];
                if (reference) {
                    args.push(new mathjs.ConstantNode(null));
                }
                return new mathjs.FunctionNode(new mathjs.SymbolNode(name), args);
            }
            return node.map((child, childPath) => visit(child, node, childPath));
        };
        const expression = visit(tree).toString();
        scope[name] = read;
        ready?.();
        try {
            return PolicyUtils.evaluateCustomFormula(expression, scope);
        } finally {
            delete scope[name];
        }
    } catch {
        return PolicyUtils.evaluateCustomFormula(formula, scope);
    }
}

export function keepPreviewDocumentOrigins<T>(source: unknown, result: T): T {
    if (PreviewScope.current()?.preview) {
        setPreviewDocumentSchema(result, getPreviewDocumentSchema(source));
        setPreviewComputed(result, getPreviewComputed(source));
        if (isPreviewStoredDocument(source)) {
            markPreviewStoredDocuments(result);
        }
        if (isPreviewResultDocument(source)) {
            markPreviewResultDocument(result);
        }
        const origin = getPreviewExtractedOrigin(source);
        if (origin) {
            markPreviewExtractedDocument(result, origin.document, origin.path);
        }
    }
    return result;
}

export function addPreviewDocumentRead(document: unknown, configuredPath: unknown): void {
    const actionStatus = PreviewScope.current();
    const path = toPreviewFormPath(configuredPath);
    const read = actionStatus?.preview && path ? resolvePreviewDocumentRead(document, path) : null;
    if (read?.schema) {
        actionStatus.addPreviewRead(read.schema, read.path);
    }
}

export function assertPreviewFiniteResult(value: unknown): void {
    const actionStatus = PreviewScope.current();
    if (actionStatus?.preview && !actionStatus.getPreviewSource()?.discovery) {
        assertPreviewCalculationResult(value);
    }
}

export function throwPreviewFormulaError(block: { blockType?: string; uuid?: string }, message: string): void {
    const actionStatus = PreviewScope.current();
    if (actionStatus?.preview && !actionStatus.getPreviewSource()?.discovery) {
        throw new BlockActionError(message, block.blockType, block.uuid);
    }
}

export function removePreviewEmptyValues(data: unknown): void {
    const isEmpty = (value: unknown) => value === '' || value === null || value === undefined;
    const isContainer = (value: unknown): value is object => Array.isArray(value) || !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
    if (Array.isArray(data)) {
        for (let index = 0; index < data.length; index++) {
            if (isEmpty(data[index])) {
                data.splice(index, 1);
                index--;
            } else if (isContainer(data[index])) {
                removePreviewEmptyValues(data[index]);
            }
        }
    } else if (isContainer(data)) {
        for (const key of Object.keys(data)) {
            const value = Reflect.get(data, key);
            if (isEmpty(value)) {
                Reflect.deleteProperty(data, key);
            } else if (isContainer(value)) {
                removePreviewEmptyValues(value);
            }
        }
    }
}

export function trackPreviewFormulaScope(tracker: PreviewReadTracker, scope: unknown, schema: string, paths: string[]): unknown {
    const tracked = tracker.track(scope, schema);
    if (!tracked || typeof tracked !== 'object') {
        return tracked;
    }
    const roots = new Set(paths.map((path) => path.split('.')[0]));
    return new Proxy(tracked, {
        has(target, key) {
            const exists = Reflect.has(target, key);
            if (!exists && typeof key === 'string' && roots.has(key) && !(key in mathjs) && !mathjs.Unit.isValuelessUnit(key)) {
                tracker.add(schema, key);
            }
            return exists;
        }
    });
}

export function evaluatePreviewFormula(formula: string, scope: any, document: unknown): any {
    const actionStatus = PreviewScope.current();
    const source = actionStatus?.preview ? actionStatus.getPreviewSource() : null;
    const schema = source ? getPreviewDocumentSchema(document) : null;
    const extracted = !!source && !!getPreviewExtractedOrigin(document);
    if (!source || !extracted && (!schema || schema !== source.schema) || isPreviewStoredDocument(document)) {
        return PolicyUtils.evaluateFormula(formula, scope);
    }
    const tracker = new PreviewReadTracker();
    tracker.configure(formula);
    const paths = getPreviewDocumentPaths(document, source.paths);
    const fields = new Set(paths);
    const result = PolicyUtils.evaluateFormula(formula, trackPreviewFormulaScope(tracker, scope, schema, paths));
    for (const read of tracker.take()) {
        const path = read.fullPath ?? read.path;
        const origin = fields.has(normalizePreviewPath(path)) ? resolvePreviewDocumentRead(document, path) : null;
        if (origin && origin.schema === source.schema) {
            actionStatus.addPreviewRead(origin.schema, origin.path);
        }
    }
    return result;
}

export function getPreviewSubject(document: unknown): unknown {
    const vc = document && typeof document === 'object' ? Reflect.get(document, 'document') : undefined;
    const subject = vc && typeof vc === 'object' ? Reflect.get(vc, 'credentialSubject') : undefined;
    return Array.isArray(subject) ? subject[0] : subject;
}

function isPreviewPathRead(path: string, reads: Set<string>): boolean {
    const parts = normalizePreviewPath(path).split('.');
    return parts.some((_, index) => reads.has(parts.slice(0, index + 1).join('.')));
}

export function getPreviewChangedPaths(
    before: unknown,
    after: unknown,
    reads: Set<string> | null = null,
    prefix: string = ''
): string[] {
    if (!after || typeof after !== 'object') {
        return [];
    }
    const isList = Array.isArray(after);
    const keys = Array.isArray(after) ? after.map((_, index) => String(index)) : Object.keys(after);
    const paths: string[] = [];
    for (const key of keys) {
        const path = `${prefix}${key}`;
        const next = Reflect.get(after, key);
        const previous = before && typeof before === 'object' && Array.isArray(before) === isList
            ? Reflect.get(before, key)
            : undefined;
        if (next && typeof next === 'object' && previous && typeof previous === 'object' && Array.isArray(next) === Array.isArray(previous)) {
            paths.push(...getPreviewChangedPaths(previous, next, reads, `${path}.`));
        } else if (JSON.stringify(next) !== JSON.stringify(previous) || (reads && !isPreviewPathRead(path, reads))) {
            paths.push(path);
        }
    }
    return paths;
}

export function resolvePreviewFields(
    source: IPreviewSource | null,
    reads: IPreviewRead[],
    includeAutoFields: boolean = true
): { fields: string[]; missingFields: string[] } {
    if (!source) {
        return { fields: [], missingFields: [] };
    }
    const known = new Set(source.paths);
    const toField = (path: string): string | null => {
        const parts = path.split('.').filter((part) => part !== '');
        const schemaParts = parts.filter((part) => !isPreviewIndex(part));
        for (let length = schemaParts.length; length > 0; length--) {
            if (!known.has(schemaParts.slice(0, length).join('.'))) {
                continue;
            }
            let count = 0;
            let end = 0;
            for (; end < parts.length; end++) {
                if (!isPreviewIndex(parts[end]) && ++count > length) {
                    break;
                }
            }
            return parts.slice(0, end).join('.');
        }
        return null;
    };
    const result = new Set<string>();
    const visit = (path: string, seen: Set<string>) => {
        if (source.nulls?.includes(normalizePreviewPath(path)) || isPreviewUnavailablePath(source, path)) {
            return;
        }
        const fieldDependencies = source.dependencies[path];
        if (!fieldDependencies) {
            const indexed = Object.keys(source.dependencies).filter((key) => key !== path
                && normalizePreviewPath(key) === path);
            if (indexed.length) {
                for (const key of indexed) {
                    visit(key, new Set(seen));
                }
            } else {
                result.add(path);
            }
            return;
        }
        if (seen.has(path)) {
            return;
        }
        seen.add(path);
        for (const dependency of fieldDependencies) {
            const dependencyField = toField(dependency);
            if (dependencyField) {
                visit(dependencyField, seen);
            }
        }
    };
    for (const read of reads) {
        if (read.schema && read.schema !== source.schema) {
            continue;
        }
        const field = toField(read.path);
        if (field) {
            visit(field, new Set<string>());
        }
    }
    if (includeAutoFields) {
        for (const path of Object.keys(source.dependencies)) {
            visit(path, new Set<string>());
        }
    }
    const sorted = [...result].sort();
    const fields = sorted.filter((path) => !sorted.some((other) => other.startsWith(`${path}.`)))
        .filter((path) => {
            const candidates = expandPreviewPath(source.document, path.split('.'), []);
            return !candidates.length || candidates.some((candidate) => !isPreviewUnavailablePath(source, candidate));
        });
    const missingFields = fields.filter((path) => getMissingPreviewPaths(source, path).length > 0);
    return { fields, missingFields };
}

export function assertPreviewCalculationResult(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): void {
    if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new Error('Calculation returned a non-finite number');
    }
    if (value && typeof value === 'object' && !seen.has(value)) {
        seen.add(value);
        for (const child of Object.values(value)) {
            assertPreviewCalculationResult(child, seen);
        }
    }
}

function isPreviewUnavailablePath(source: IPreviewSource, path: string): boolean {
    return (source.unavailable || []).some((blocked) => path === blocked || path.startsWith(`${blocked}.`));
}

function getMissingPreviewPaths(source: IPreviewSource, path: string): string[] {
    return expandPreviewPath(source.document, path.split('.'), []).filter((candidate) => {
        if (isPreviewUnavailablePath(source, candidate)) {
            return false;
        }
        let current = source.document;
        for (const part of candidate.split('.')) {
            if (Array.isArray(current) && isPreviewIndex(part) && Number(part) >= current.length) {
                return false;
            }
            current = current && typeof current === 'object' ? Reflect.get(current, part) : undefined;
        }
        return isEmptyPreviewValue(current);
    });
}

function previewMissingPaths(source: IPreviewSource, reads: IPreviewRead[]): string[] {
    const missing = new Set<string>();
    for (const read of reads) {
        if (read.schema && read.schema !== source.schema) {
            continue;
        }
        const normalized = normalizePreviewPath(read.path);
        const resolved = resolvePreviewFields(source, [read], false);
        for (const path of resolved.fields) {
            const indexed = normalized === path ? read.path : path;
            for (const candidate of getMissingPreviewPaths(source, indexed)) {
                missing.add(candidate);
            }
        }
    }
    return [...missing].sort();
}

function isPreviewHiddenPath(source: IPreviewSource, path: string): boolean {
    const normalized = normalizePreviewPath(path);
    return (source.hidden || []).some((hidden) => normalized === hidden || normalized.startsWith(`${hidden}.`));
}

export function getPreviewInputError(actionStatus: RecordActionStep): MessageError<unknown> | null {
    const source = actionStatus.getPreviewSource();
    if (!source || source.discovery) {
        return null;
    }
    const reads = actionStatus.getPreviewReads();
    const missing = previewMissingPaths(source, reads).filter((path) => !isPreviewHiddenPath(source, path));
    if (!missing.length) {
        return null;
    }
    const { fields } = resolvePreviewFields(source, reads);
    return new MessageError('Missing calculation inputs', 422, {
        preview: true,
        notLogged: true,
        sticky: false,
        fields: [...new Set([...fields, ...missing])].sort(),
        missingFields: missing
    });
}

export function getPreviewCopyTargets(
    actionStatus: RecordActionStep | undefined,
    enumerated: IPreviewWriteRecord[],
    documentOf: (record: IPreviewWriteRecord) => unknown
): IPreviewCopyTarget[] {
    const source = actionStatus?.getPreviewSource();
    if (!source || source.discovery || !enumerated.length || getPreviewInputError(actionStatus)) {
        return [];
    }
    const targets = new Map<string, IPreviewCopyTarget>();
    for (const record of enumerated) {
        const document = documentOf(record);
        if (!document) {
            continue;
        }
        let value = getPreviewSubject(document);
        for (const part of record.path ? record.path.split('.') : []) {
            value = value && typeof value === 'object' ? Reflect.get(value, part) : undefined;
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            continue;
        }
        const prefix = normalizePreviewPath(record.path);
        const names = getPreviewDocumentPaths(document, source.paths)
            .filter((path) => prefix ? path.startsWith(`${prefix}.`) : true)
            .map((path) => prefix ? path.slice(prefix.length + 1) : path)
            .filter((name) => name && !name.includes('.') && isEmptyPreviewValue(Reflect.get(value, name)))
            .filter((name) => resolvePreviewDocumentRead(document, record.path ? `${record.path}.${name}` : name)?.schema === source.schema);
        if (names.length) {
            const origin = resolvePreviewDocumentRead(document, record.path ? `${record.path}.${names[0]}` : names[0]);
            if (!origin) {
                continue;
            }
            const formPath = origin.path.split('.').slice(0, -1).join('.');
            const target: IPreviewCopyTarget = { schema: source.schema, document: record.document, path: record.path, names };
            if (formPath !== record.path) {
                target.formPath = formPath;
            }
            targets.set(`${record.document ?? ''}\u0000${record.path}`, target);
        }
    }
    return [...targets.values()];
}

export async function recoverPreviewCopiedFields(
    actionStatus: RecordActionStep | undefined,
    targets: IPreviewCopyTarget[],
    script: string,
    diagnose: (targets: IPreviewCopyTarget[]) => Promise<IPreviewCopyDiagnosis | null>,
    roots: string[] = [],
    expected?: string | null,
    outputs: string[] = []
): Promise<void> {
    const source = actionStatus?.getPreviewSource();
    if (!source || !targets.length) {
        return;
    }
    let diagnosis: IPreviewCopyDiagnosis | null = null;
    if (!hasPreviewPresenceCheck(script)) {
        try {
            diagnosis = await diagnose(targets);
        } catch {
            diagnosis = null;
        }
    }
    const same = expected === undefined || (diagnosis?.error ?? null) === expected;
    const exact = diagnosis?.trusted && diagnosis.failed && same && diagnosis.sites.length
        ? findPreviewScriptFields(script, diagnosis.sites.map((site) => {
            const path = site.fullPath ?? site.path;
            const target = targets.find((item) => item.document === (site.document ?? null)
                && (path === item.path || path.startsWith(item.path ? `${item.path}.` : '')));
            if (target?.formPath === undefined) {
                return site;
            }
            const suffix = path.slice(target.path.length).replace(/^\./, '');
            const fullPath = target.formPath ? `${target.formPath}.${suffix}` : suffix;
            return { ...site, schema: source.schema, path: normalizePreviewPath(fullPath), fullPath };
        }), [], source.schema, source.paths, false, '', roots)
        : [];
    const written = new Set([
        ...(diagnosis?.written ?? []),
        ...outputs.filter((name) => !diagnosis?.read?.includes(name))
    ]);
    const fields = exact.length
        ? exact.map((read) => read.fullPath ?? read.path)
        : targets.flatMap((target) => target.names
            .filter((name) => !written.has(name))
            .map((name) => {
                const path = target.formPath ?? target.path;
                return path ? `${path}.${name}` : name;
            }));
    for (const field of fields) {
        actionStatus.addPreviewRead(source.schema, field);
    }
}

export function buildPreviewResponse(actionStatus: RecordActionStep, input: unknown, history: boolean = false) {
    const { fields, missingFields } = resolvePreviewFields(actionStatus.getPreviewSource(), actionStatus.getPreviewReads());
    let documents = actionStatus.getPreviewDocuments();
    if (!documents.length) {
        const recorded = new Map<string, IPreviewDocument>();
        for (const step of actionStatus.getResults()) {
            const data = step && typeof step === 'object' ? Reflect.get(step, 'data') : null;
            for (const item of Array.isArray(data) ? data : [data]) {
                const credential = item && typeof item === 'object' ? Reflect.get(item, 'document') : null;
                if (!credential || typeof credential !== 'object' || !Reflect.has(credential, 'credentialSubject')) {
                    continue;
                }
                const id = Reflect.get(credential, 'id');
                const tag = Reflect.get(item, 'tag');
                recorded.set(typeof id === 'string' ? id : JSON.stringify(credential), {
                    source: typeof tag === 'string' ? tag : null,
                    target: null,
                    blockType: null,
                    document: item
                });
            }
        }
        documents = [...recorded.values()];
    }
    return {
        trackingId: actionStatus.id,
        preview: true,
        input,
        documents,
        calculations: actionStatus.getPreviewCalculations(),
        fields,
        missingFields,
        steps: history ? actionStatus.getResults() : [],
        errors: actionStatus.getErrors().map((error) => ({
            message: error.message,
            blockType: error.blockType ?? null,
            errorData: error.errorData ?? null
        })),
        incomplete: getPreviewIncomplete(actionStatus)
    };
}

export type PreviewSetBlockData = (
    block: IPolicyInterfaceBlock,
    user: PolicyUser,
    data: any,
    actionStatus: RecordActionStep
) => Promise<MessageResponse<any> | MessageError<any>>;

export async function runPreview(
    block: IPolicyInterfaceBlock,
    user: PolicyUser,
    data: any,
    setBlockData: PreviewSetBlockData,
    history: boolean = false
): Promise<MessageResponse<any> | MessageError<any>> {
    if (block.blockType !== 'requestVcDocumentBlock') {
        return new MessageError('Preview is available only for a Request document block', 422);
    }
    if (block.locationType === LocationType.REMOTE) {
        return new MessageError('Preview is not available for a remote policy', 422);
    }

    let complete: () => void = () => undefined;
    const completed = new Promise<void>((resolve) => {
        complete = resolve;
    });
    const actionStatus = new RecordActionStep(() => complete(), 0, true, true, undefined, true);
    const previewData = { ...data, draft: false, draftId: null };

    let response: MessageResponse<any> | MessageError<any>;
    try {
        response = await PreviewScope.run(actionStatus, () => setBlockData(block, user, previewData, actionStatus));
    } catch (error) {
        actionStatus.cancel();
        const previewInputError = getPreviewInputError(actionStatus);
        if (previewInputError) {
            return previewInputError;
        }
        throw error;
    }

    if (response instanceof MessageError) {
        actionStatus.cancel();
        return getPreviewInputError(actionStatus) || response;
    }

    actionStatus.finish();
    await completed;

    const inputError = getPreviewInputError(actionStatus);
    if (inputError) {
        return inputError;
    }
    return new MessageResponse(buildPreviewResponse(actionStatus, response.body, history), response.code);
}

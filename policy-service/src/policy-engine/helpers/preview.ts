import { compileFunction } from 'node:vm';
import { AsyncLocalStorage } from 'node:async_hooks';
import { LocationType, SchemaField, } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { Message } from '@guardian/hedera/message/message';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import { IPolicyEvent } from '../interfaces/policy-event.js';
import { IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { IPreviewCalculation, IPreviewDocument, IPreviewRead, IPreviewSource, RecordActionStep } from '../record-action-step.js';
import { PolicyUtils } from './utils.js';
import { getDocumentValueByPath, MathEngine, MathItemType } from './math-model/index.js';
import { PREVIEW_SCRIPT_FILE, PreviewReadTracker } from './workers/preview-read-tracker.js';
import { findPreviewScriptFields } from './preview-script-fields.js';
import { getPreviewIncomplete } from './preview-database.js';

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

let lastPreviewEntity = 0;

export function createPreviewEntityId(): string {
    lastPreviewEntity = Math.max(Date.now() * 1000, lastPreviewEntity + 1);
    return `0.0.${lastPreviewEntity}`;
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
        const scope = new Proxy(document, {
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
                tracker.add(null, `${prefix}${key}`, `${fullPrefix}${key}`, null, tracker.site(), false, !!propertyValue && typeof propertyValue === 'object');
                return tracker.track(propertyValue, null, `${prefix}${key}`, `${fullPrefix}${key}`);
            }
        });
        let source = `(${field.expression || ''})`;
        try {
            const result = tracker.unwrap(PolicyUtils.autoCalculateField(field, scope, (name: string, body: string) => {
                source = body;
                tracker.configure(body);
                return compileFunction(body, [name], { filename: PREVIEW_SCRIPT_FILE });
            }));
            assertPreviewCalculationResult(result);
            if (result === undefined) {
                Reflect.deleteProperty(document, field.name);
            } else {
                Reflect.set(document, field.name, result);
            }
        } catch (error) {
            Reflect.deleteProperty(document, field.name);
            errors.push(`Invalid expression: ${path}`);
        }
        const required = findPreviewScriptFields(source, tracker.takeSites(), [], null, paths, true, prefix);
        dependencies[path] = [...new Set([...(dependencies[path] || []), ...required.map((read) => read.path)])].filter((read) => read !== path);
    }
}

export function getMathPreviewReads(expression: unknown, currentSchema: string | null): IPreviewRead[] {
    const engine = MathEngine.from(expression);
    if (!engine) {
        return [];
    }
    engine.validate();
    return engine.variables
        .getItems()
        .filter((link) => !!link.path)
        .map((link) => ({ schema: link.schema || currentSchema, path: link.path }));
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
        const parts = normalizePreviewPath(path).split('.');
        for (let length = parts.length; length > 0; length--) {
            const candidate = parts.slice(0, length).join('.');
            if (known.has(candidate)) {
                return candidate;
            }
        }
        return null;
    };
    const result = new Set<string>();
    const visit = (path: string, seen: Set<string>) => {
        if (source.nulls?.includes(path)) {
            return;
        }
        const fieldDependencies = source.dependencies[path];
        if (!fieldDependencies) {
            result.add(path);
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
    const fields = sorted.filter((path) => !sorted.some((other) => other.startsWith(`${path}.`)));
    const missingFields = fields.filter((path) => isMissingPreviewValue(source.document, path));
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

function previewMissingPaths(source: IPreviewSource, reads: IPreviewRead[]): string[] {
    const missing = new Set<string>();
    for (const read of reads) {
        if (read.schema && read.schema !== source.schema) {
            continue;
        }
        const normalized = normalizePreviewPath(read.path);
        const resolved = resolvePreviewFields(source, [{ schema: read.schema, path: normalized }], false);
        for (const path of resolved.fields) {
            const indexed = normalized === path ? read.path : path;
            for (const candidate of expandPreviewPath(source.document, indexed.split('.'), [])) {
                let current = source.document;
                for (const part of candidate.split('.')) {
                    current = current && typeof current === 'object' ? Reflect.get(current, part) : undefined;
                }
                if (isEmptyPreviewValue(current)) {
                    missing.add(candidate);
                }
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
        fields: [...new Set([...fields, ...missing.map(normalizePreviewPath)])].sort(),
        missingFields: missing
    });
}

export function buildPreviewResponse(actionStatus: RecordActionStep, input: unknown) {
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
        steps: actionStatus.getResults(),
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
    setBlockData: PreviewSetBlockData
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
    return new MessageResponse(buildPreviewResponse(actionStatus, response.body), response.code);
}

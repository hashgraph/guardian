import { AsyncLocalStorage } from 'node:async_hooks';
import { GenerateUUIDv4, ISchema, LocationType, SchemaField, SchemaHelper } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { VcHelper } from '@guardian/hedera/vc-helper';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import { AnyBlockType, IPolicyDocument, IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { IPreviewCalculation, IPreviewRead, IPreviewSource, RecordActionStep } from '../record-action-step.js';
import { PolicyUtils } from './utils.js';
import { getDocumentValueByPath, MathEngine, MathItemType } from './math-model/index.js';
import { buildTableHelper } from './table-field-core.js';
import { PreviewReadTracker } from './workers/preview-read-tracker.js';

export const PREVIEW_BLOCK_TYPES: ReadonlySet<string> = new Set([
    'mathBlock',
    'calculateContainerBlock',
    'customLogicBlock',
    'switchBlock',
    'documentValidatorBlock',
    'tool',
    'module'
]);

export const PREVIEW_SKIPPED_OUTPUTS: ReadonlySet<string> = new Set<string>([
    PolicyOutputEventType.RefreshEvent,
    PolicyOutputEventType.ReleaseEvent,
    PolicyOutputEventType.ErrorEvent,
    PolicyOutputEventType.ReferenceEvent,
    PolicyOutputEventType.DraftEvent
]);

const PREVIEW_KNOWN_INPUTS: ReadonlySet<string> = new Set<string>(Object.values(PolicyInputEventType));

export function isPreviewInputAllowed(input: string): boolean {
    return input === PolicyInputEventType.RunEvent || !PREVIEW_KNOWN_INPUTS.has(input);
}

const previewStorage = new AsyncLocalStorage<RecordActionStep>();

export class PreviewScope {
    public static run<T>(actionStatus: RecordActionStep, callback: () => Promise<T>): Promise<T> {
        return previewStorage.run(actionStatus, callback);
    }

    public static current(): RecordActionStep | undefined {
        return previewStorage.getStore();
    }
}

export function getPreviewDocumentId(idType: string, user: PolicyUser): string | undefined {
    if (idType === 'OWNER') {
        return user.did;
    }
    if (idType === 'UUID' || idType === 'DID') {
        return GenerateUUIDv4();
    }
    return undefined;
}

export function createPreviewDocument(
    ref: AnyBlockType,
    owner: PolicyUser | null,
    subject: any,
    schema: string | null,
    issuer: string | null,
    recordActionId: string | null
): IPolicyDocument {
    const item = PolicyUtils.createUnsignedVC(ref, PolicyUtils.createVcFromSubject(subject), recordActionId);
    if (issuer) {
        item.document.issuer = issuer;
    }
    if (owner) {
        item.owner = owner.did;
        item.group = owner.group;
    }
    if (schema) {
        item.schema = schema;
        item.type = schema;
    }
    return item;
}

export interface IPreviewMetadata {
    owner: PolicyUser;
    relayerAccount: string;
    id: string;
    reference: string;
    accounts: any;
    tokens: any;
    relationships: any[];
}

export function createPreviewSubject(
    ref: AnyBlockType,
    schema: ISchema,
    json: any,
    metadata: IPreviewMetadata
): any {
    const subject: any = {
        ...SchemaHelper.getContext(schema),
        ...json
    };
    subject.policyId = ref.policyId;
    subject.id = metadata.id;
    PolicyUtils.setGuardianVersion(subject, schema);
    if (metadata.reference) {
        subject.ref = metadata.reference;
    }
    if (ref.dryRun) {
        new VcHelper().addDryRunContext(subject);
    }
    return subject;
}

export function createPreviewResult(
    ref: AnyBlockType,
    subject: any,
    schema: string,
    issuer: string | null,
    recordActionId: string | null,
    metadata: IPreviewMetadata
): IPolicyDocument {
    const item = createPreviewDocument(ref, metadata.owner, subject, schema, issuer, recordActionId);
    item.relationships = metadata.relationships?.length ? metadata.relationships : null;
    item.accounts = metadata.accounts && Object.keys(metadata.accounts).length ? metadata.accounts : null;
    item.tokens = metadata.tokens && Object.keys(metadata.tokens).length ? metadata.tokens : null;
    item.relayerAccount = metadata.relayerAccount;
    return item;
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

export function calculatePreviewAutoFields(
    fields: SchemaField[] | undefined,
    document: unknown,
    dependencies: Record<string, string[]>,
    errors: string[],
    prefix: string = ''
): void {
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
        return;
    }
    const names = new Set((fields || []).map((field) => field.name));
    for (const field of fields || []) {
        const value = Reflect.get(document, field.name);
        if (field.isRef) {
            const children = Array.isArray(value) ? value : [value];
            for (const child of children) {
                calculatePreviewAutoFields(field.fields, child, dependencies, errors, `${prefix}${field.name}.`);
            }
            continue;
        }
        if (!field.autocalculate) {
            continue;
        }
        const path = `${prefix}${field.name}`;
        const reads = new Set<string>(dependencies[path] || []);
        const tracker = new PreviewReadTracker();
        const scope = new Proxy(document, {
            has(target, key) {
                if (typeof key === 'string' && names.has(key)) {
                    return true;
                }
                return Reflect.has(target, key);
            },
            get(target, key, receiver) {
                const propertyValue = Reflect.get(target, key, receiver);
                if (typeof key !== 'string' || !names.has(key)) {
                    return propertyValue;
                }
                reads.add(`${prefix}${key}`);
                return tracker.track(propertyValue, null, `${prefix}${key}`);
            }
        });
        try {
            const func = Function('table', `with (this) { return ${field.expression} }`);
            const result = tracker.unwrap(func.apply(scope, [buildTableHelper()]));
            if (result === undefined) {
                Reflect.deleteProperty(document, field.name);
            } else {
                Reflect.set(document, field.name, result);
            }
        } catch (error) {
            Reflect.deleteProperty(document, field.name);
            errors.push(`Invalid expression: ${path}`);
        }
        for (const read of tracker.take()) {
            reads.add(read.path);
        }
        reads.delete(path);
        dependencies[path] = [...reads];
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

export function findScriptFieldReads(script: string, source: IPreviewSource | null): IPreviewRead[] {
    if (!source || !script) {
        return [];
    }
    return source.paths
        .filter((path) => {
            const name = path.split('.').pop() || '';
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return !!name && new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`).test(script);
        })
        .map((path) => ({ schema: source.schema, path }));
}

export function resolvePreviewFields(
    source: IPreviewSource | null,
    reads: IPreviewRead[]
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
    for (const path of Object.keys(source.dependencies)) {
        visit(path, new Set<string>());
    }
    const sorted = [...result].sort();
    const fields = sorted.filter((path) => !sorted.some((other) => other.startsWith(`${path}.`)));
    const missingFields = fields.filter((path) => isMissingPreviewValue(source.document, path));
    return { fields, missingFields };
}

export function buildPreviewResponse(actionStatus: RecordActionStep, input: unknown) {
    const { fields, missingFields } = resolvePreviewFields(actionStatus.getPreviewSource(), actionStatus.getPreviewReads());
    return {
        trackingId: actionStatus.id,
        preview: true,
        input,
        documents: actionStatus.getPreviewDocuments(),
        calculations: actionStatus.getPreviewCalculations(),
        fields,
        missingFields,
        steps: actionStatus.getResults(),
        errors: actionStatus.getErrors().map((error) => ({
            message: error.message,
            blockType: error.blockType ?? null,
            errorData: error.errorData ?? null
        }))
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
    const previewData = { ...data, draft: false, draftId: null, relayerAccount: null };

    let response: MessageResponse<any> | MessageError<any>;
    try {
        response = await PreviewScope.run(actionStatus, () => setBlockData(block, user, previewData, actionStatus));
    } catch (error) {
        actionStatus.cancel();
        throw error;
    }

    if (response instanceof MessageError) {
        actionStatus.cancel();
        return response;
    }

    actionStatus.finish();
    await completed;

    return new MessageResponse(buildPreviewResponse(actionStatus, response.body), response.code);
}

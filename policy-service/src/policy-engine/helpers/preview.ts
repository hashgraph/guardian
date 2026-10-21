import { AsyncLocalStorage } from 'node:async_hooks';
import { GenerateUUIDv4, LocationType, SchemaField } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import { AnyBlockType, IPolicyDocument, IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { IPreviewCalculation, IPreviewRead, IPreviewSource, RecordActionStep } from '../record-action-step.js';
import { PolicyUtils } from './utils.js';
import { getDocumentValueByPath, MathEngine, MathItemType } from './math-model/index.js';
import { buildTableHelper } from './table-field-core.js';

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
    scope: Record<string, unknown>
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
            value: scope[field.value] ?? null
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
        const scope = new Proxy(document, {
            has(target, key) {
                if (typeof key === 'string' && names.has(key)) {
                    reads.add(`${prefix}${key}`);
                    return true;
                }
                return Reflect.has(target, key);
            }
        });
        try {
            const func = Function('table', `with (this) { return ${field.expression} }`);
            const result = func.apply(scope, [buildTableHelper()]);
            if (result === undefined) {
                Reflect.deleteProperty(document, field.name);
            } else {
                Reflect.set(document, field.name, result);
            }
        } catch (error) {
            Reflect.deleteProperty(document, field.name);
            errors.push(`Invalid expression: ${path}`);
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
            visit(dependency, seen);
        }
    };
    for (const read of reads) {
        if (read.schema !== source.schema) {
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
        errors: actionStatus.getErrors().map((error) => error.message)
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

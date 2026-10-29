import { compileFunction, createContext, runInContext } from 'node:vm';
import { workerData, parentPort } from 'node:worker_threads';
import { Code, DocumentMap, MathEngine, setDocumentValueByPath } from '../math-model/index.js';
import { buildTableHelper } from '../table-field-core.js';
import { PREVIEW_SCRIPT_FILE, PreviewReadTracker } from './preview-read-tracker.js';
import { isPreviewFiniteResult, startPreviewCopyDiagnosis } from './preview-copy-diagnosis.js';

function toCloneable(value: unknown, seen: Map<object, unknown>): unknown {
    if (typeof value === 'function' || typeof value === 'symbol') {
        return undefined;
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    if (seen.has(value)) {
        return seen.get(value);
    }
    try {
        const cloned = structuredClone(value);
        seen.set(value, cloned);
        return cloned;
    } catch {
        const copy: Record<string, unknown> | unknown[] = Array.isArray(value) ? [] : {};
        seen.set(value, copy);
        for (const key of Object.keys(value)) {
            const child = toCloneable(Reflect.get(value, key), seen);
            if (child !== undefined) {
                Reflect.set(copy, key, child);
            }
        }
        return copy;
    }
}

function toCloneableScope(scope: unknown): Record<string, unknown> {
    const result = toCloneable(scope, new Map<object, unknown>());
    const plain: Record<string, unknown> = {};
    if (result && typeof result === 'object') {
        Object.assign(plain, result);
    }
    return plain;
}

/**
 * Execute function
 */
function execute(): void {
    const { expression, user, documents, schema, copy, tablesPack, withScope, trackReads, diagnose } = workerData;
    const tracker = trackReads ? new PreviewReadTracker() : null;
    const group = MathEngine.from(expression);
    if (!group) {
        throw new Error('Invalid block config');
    }
    const groupContext = group.createContext();
    if (!groupContext) {
        throw new Error('Invalid block config');
    }

    //Calculate
    const documentMap = DocumentMap.from(documents)
    const document = documentMap.getCurrent();
    groupContext.setDocument(documentMap, tablesPack);
    const context = groupContext.getContext();

    let result: any;
    let body = '';
    let diagnosis: ((failed: boolean, error?: string | null) => unknown) | null = null;
    if (copy) {
        result = document;
    } else {
        result = {};
    }

    //Output
    const outputs = group.outputs.getItems();
    for (const link of outputs) {
        if (link.isTableList) {
            setDocumentValueByPath(schema, result, link.path, link.getTableList(context.scope).map((rows) => ({
                type: 'table',
                rows
            })));
        } else if (link.isTable) {
            setDocumentValueByPath(schema, result, link.path, {
                type: 'table',
                rows: link.getTableRows(context.scope)
            });
        } else {
            setDocumentValueByPath(schema, result, link.path, context.scope[link.name]);
        }
    }

    //Code
    const code = Code.from(expression);
    if (code) {
        const tracked = tracker ? tracker.track(document, null) : document;
        code.setContext({
            ...context,
            document: tracked,
            getField: tracker
                ? (path: string) => tracker.trackField(context.getField(path), path)
                : context.getField,
            result: copy ? tracked : result,
            user,
            table: buildTableHelper(tablesPack)
        });
        try {
            result = tracker ? code.run((text: string) => {
                body = text;
                tracker.configure(text);
                tracker.startCoverage();
                if (Array.isArray(diagnose)) {
                    const isolated = createContext(Object.create(null));
                    diagnosis = startPreviewCopyDiagnosis(tracker, [{
                        objectPrototype: runInContext('Object.getPrototypeOf({})', isolated),
                        objectConstructor: runInContext('Object', isolated),
                        reflect: runInContext('Reflect', isolated),
                        global: runInContext('globalThis', isolated)
                    }], diagnose, [document]);
                    return compileFunction(text, [], { filename: PREVIEW_SCRIPT_FILE, parsingContext: isolated });
                }
                return compileFunction(text, [], { filename: PREVIEW_SCRIPT_FILE });
            }) : code.run();
        } catch (error) {
            if (!tracker) {
                throw error;
            }
            if (diagnosis) {
                parentPort.postMessage({ type: 'diagnosis', diagnosis: diagnosis(true, error instanceof Error ? error.message : String(error)) });
                return;
            }
            parentPort.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.name : null,
                body,
                sites: tracker.takeSites(),
                unexecuted: tracker.takeUnexecuted(),
                enumerated: tracker.takeEnumerated()
            });
            return;
        }
    }

    if (diagnosis) {
        parentPort.postMessage({ type: 'diagnosis', diagnosis: diagnosis(!isPreviewFiniteResult(result)) });
        return;
    }
    const plain = tracker ? tracker.unwrap(result) : result;
    const writes = tracker ? tracker.takeWrites() : undefined;
    parentPort.postMessage({
        type: 'done',
        result: plain,
        warnings: groupContext.getWarnings(),
        scope: withScope ? toCloneableScope(tracker ? tracker.unwrap(context.scope) : context.scope) : undefined,
        body: tracker ? body : undefined,
        sites: tracker ? tracker.takeSites() : undefined,
        unexecuted: tracker ? tracker.takeUnexecuted() : undefined,
        enumerated: tracker ? tracker.takeEnumerated() : undefined,
        writes: copy && plain === document ? writes : undefined
    });
}

execute();

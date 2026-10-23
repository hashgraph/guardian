import { workerData, parentPort } from 'node:worker_threads';
import { Code, DocumentMap, MathEngine, setDocumentValueByPath } from '../math-model/index.js';
import { buildTableHelper } from '../table-field-core.js';
import { PreviewReadTracker } from './preview-read-tracker.js';

/**
 * Execute function
 */
function execute(): void {
    const { expression, user, documents, schema, copy, tablesPack, withScope, trackReads } = workerData;
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
            result = code.run();
        } catch (error) {
            if (!tracker) {
                throw error;
            }
            parentPort.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : String(error),
                reads: tracker.take()
            });
            return;
        }
    }

    const plain = tracker ? tracker.unwrap(result) : result;
    const reads = tracker ? tracker.take() : undefined;
    const writes = tracker ? tracker.takeWrites() : undefined;
    parentPort.postMessage({
        type: 'done',
        result: plain,
        warnings: groupContext.getWarnings(),
        scope: withScope ? context.scope : undefined,
        reads,
        writes: copy && plain === document ? writes : undefined
    });
}

execute();

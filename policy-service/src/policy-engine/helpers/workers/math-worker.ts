import { workerData, parentPort } from 'node:worker_threads';
import { Code, MathEngine, setDocumentValueByPath } from '../math-model/index.js';

/**
 * Execute function
 */
function execute(): void {
    const { expression, user, document, schema, copy } = workerData;
    const group = MathEngine.from(expression);
    if (!group) {
        throw new Error('Invalid block config');
    }
    const groupContext = group.createContext();
    if (!groupContext) {
        throw new Error('Invalid block config');
    }

    //Calculate
    groupContext.setDocument(document);
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
        setDocumentValueByPath(schema, result, link.path, context.scope[link.name]);
    }

    //Code
    const code = Code.from(expression);
    if (code) {
        context.document = document;
        context.result = result;
        context.user = user;
        code.setContext(context);
        result = code.run();
    }

    parentPort.postMessage({ type: 'done', result });
}

execute();

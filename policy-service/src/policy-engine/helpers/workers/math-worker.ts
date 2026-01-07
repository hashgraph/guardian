import { workerData, parentPort } from 'node:worker_threads';
import { Code, MathGroup, setDocumentValueByPath } from '../math-model/index.js';

/**
 * Execute function
 */
function execute(): void {
    const { expression, user, document, schema } = workerData;
    const group = MathGroup.from(expression);
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

    //Output
    let result = document;
    for (const link of group.outputs) {
        setDocumentValueByPath(schema, result, link.path, context.scope[link.name]);
    }

    //Code
    if (expression.code) {
        context.document = result;
        context.user = user;
        const code = Code.from(expression.code);
        code.setContext(context);
        result = code.run();
    }

    parentPort.postMessage({ type: 'done', result });
}

execute();

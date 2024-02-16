import { workerData, parentPort } from 'node:worker_threads';
import * as mathjs from 'mathjs';

/**
 * Execute function
 */
function execute(): void {
    const done = (result) => {
        parentPort.postMessage(result);
    }

    const { execFunc, user, documents, artifacts } = workerData;

    const func = Function(execFunc);
    func.apply(documents, [done, user, documents, mathjs, artifacts]);
}

execute();

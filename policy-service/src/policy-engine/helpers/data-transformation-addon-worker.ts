import { workerData, parentPort } from 'node:worker_threads';
import * as mathjs from 'mathjs';
import * as formulajs from '@formulajs/formulajs'

/**
 * Execute function
 */
function execute(): void {
    const done = (result, final = true) => {
        parentPort.postMessage({result, final});
    }
    const { execFunc, user, documents } = workerData;

    const func = Function(execFunc);
    func.apply(documents, [done, user, documents, mathjs, formulajs]);
}

execute();

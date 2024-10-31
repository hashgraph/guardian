import { parentPort, workerData } from 'node:worker_threads';

/**
 * Execute function
 */
function execute(): void {
    const done = (result, final = true) => {
        parentPort.postMessage({result, final});
    }

    const {execFunc, user, scopeData} = workerData;

    const func = Function(execFunc);
    // func.apply(, [done, user, documents, mathjs, artifacts, formulajs, sources]);
}

execute();

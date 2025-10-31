import { workerData, parentPort } from 'node:worker_threads';
import * as mathjs from 'mathjs';
import * as formulajs from '@formulajs/formulajs'

import { buildTableHelper } from '../helpers/table-field-core.js';

/**
 * Execute function
 */
function execute(): void {
    const done = (result: any, final: boolean = true) => {
        parentPort.postMessage({ type: 'done', result, final });
    }
    const debug = (message: any) => {
        parentPort.postMessage({ type: 'debug', message });
    }

    const { execFunc, user, documents, artifacts, sources, tablesPack } = workerData;
    const importCode = `const [done, user, documents, mathjs, artifacts, formulajs, sources, debug, table] = arguments;\r\n`;
    const code = `${importCode}${execFunc}`;

    const func = Function(code);
    func.apply(documents, [
        done,
        user,
        documents,
        mathjs,
        artifacts,
        formulajs,
        sources,
        debug,
        buildTableHelper(tablesPack)
    ]);
}

execute();

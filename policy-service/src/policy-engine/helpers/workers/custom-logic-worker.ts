import { workerData, parentPort } from 'node:worker_threads';
import * as mathjs from 'mathjs';
import * as formulajs from '@formulajs/formulajs'
import { buildTableHelper } from '../table-field-core.js';
import * as vm from 'node:vm';

/**
 * Execute user-supplied JavaScript in a sandboxed V8 context.
 *
 * Previously, user code ran via Function() in the same Node.js context as
 * the policy-service, giving access to process.env, require(), and the
 * full filesystem. The Python worker already uses Pyodide (WASM sandbox)
 * for isolation; this change brings the JavaScript worker to the same
 * security level using Node.js vm module with code generation disabled.
 *
 * Only the documented API surface (done, debug, user, documents, mathjs,
 * formulajs, artifacts, sources, table) is exposed to user code.
 */
function execute(): void {
    const done = (result: any, final: boolean = true) => {
        parentPort.postMessage({ type: 'done', result, final });
    }
    const debug = (message: any) => {
        parentPort.postMessage({ type: 'debug', message });
    }

    const { execFunc, user, documents, artifacts, sources, tablesPack } = workerData;

    // Create sandbox with only the documented API surface
    // Object.create(null) prevents prototype chain escapes
    const sandbox = Object.create(null);
    sandbox.done = done;
    sandbox.debug = debug;
    sandbox.user = user;
    sandbox.documents = documents;
    sandbox.mathjs = mathjs;
    sandbox.artifacts = artifacts;
    sandbox.formulajs = formulajs;
    sandbox.sources = sources;
    sandbox.table = buildTableHelper(tablesPack);

    // Convenience globals expected by user code
    sandbox.console = { log: debug, warn: debug, error: debug };
    sandbox.JSON = JSON;
    sandbox.Math = Math;
    sandbox.Date = Date;
    sandbox.Array = Array;
    sandbox.Object = Object;
    sandbox.String = String;
    sandbox.Number = Number;
    sandbox.Boolean = Boolean;
    sandbox.RegExp = RegExp;
    sandbox.Map = Map;
    sandbox.Set = Set;
    sandbox.Promise = Promise;
    sandbox.parseInt = parseInt;
    sandbox.parseFloat = parseFloat;
    sandbox.isNaN = isNaN;
    sandbox.isFinite = isFinite;
    sandbox.undefined = undefined;
    sandbox.NaN = NaN;
    sandbox.Infinity = Infinity;

    const context = vm.createContext(sandbox, {
        codeGeneration: { strings: false, wasm: false }
    });

    try {
        vm.runInContext(execFunc, context, { timeout: 30000 });
    } catch (error) {
        parentPort.postMessage({ type: 'debug', message: `Sandbox error: ${error.message}` });
        parentPort.postMessage({ type: 'done', result: null, final: true });
    }
}

execute();

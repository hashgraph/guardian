import { workerData, parentPort } from 'node:worker_threads';
import * as mathjs from 'mathjs';
import * as formulajs from '@formulajs/formulajs';
import { buildTableHelper } from '../table-field-core.js';
import * as vm from 'node:vm';

/**
 * Execute user-supplied JavaScript in a hardened `node:vm` context.
 *
 * Isolation model (TM-006 / M-005):
 *  - The sandbox global is `Object.create(null)` and is contextified by
 *    `vm.createContext`, so user code sees the CONTEXT's own native intrinsics
 *    (`JSON`, `Math`, `Object`, `Array`, ...). We deliberately do NOT copy the
 *    host realm's intrinsics onto the sandbox — that was the escape vector: a
 *    passed-in outer-realm object lets `X.constructor.constructor('return process')()`
 *    walk to the host `Function`. With context-native intrinsics that chain ends
 *    at the context's `Function`, which `codeGeneration.strings:false` blocks.
 *  - `codeGeneration: { strings: false, wasm: false }` blocks `eval`,
 *    `new Function('...')` and WebAssembly compilation inside the context.
 *  - Only the documented API surface (done, debug, user, documents, mathjs,
 *    formulajs, artifacts, sources, table, console) is exposed. `mathjs` /
 *    `formulajs` are module-namespace objects (their `.constructor` is
 *    undefined, so the constructor chain breaks) and run in the host realm, so
 *    library features that rely on `new Function` (e.g. `math.evaluate`) keep
 *    working.
 *
 * This replaces the `isolated-vm` worker whose native addon SIGSEGV-crashed the
 * policy-service process; `node:vm` has no native addon and cannot fault the
 * process, while the hardening above keeps the sandbox-escape regression suite
 * green.
 */
function execute(): void {
    const done = (result: any, final: boolean = true) => {
        parentPort.postMessage({ type: 'done', result, final });
    };
    const debug = (message: any) => {
        parentPort.postMessage({ type: 'debug', message });
    };

    const { execFunc, user, documents, artifacts, sources, tablesPack } = workerData;

    // Sandbox with ONLY the documented API surface. Object.create(null) prevents
    // prototype-chain escapes via the sandbox object itself; the contextified
    // global still exposes the context's own native intrinsics to user code.
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
    sandbox.console = { log: debug, warn: debug, error: debug };

    // NOTE: we intentionally do NOT assign host intrinsics (JSON, Math, Date,
    // Array, Object, String, Number, Boolean, RegExp, Map, Set, Promise, ...)
    // onto the sandbox. The contextified global supplies context-native versions
    // whose constructor chain cannot reach the host realm.

    const context = vm.createContext(sandbox, {
        codeGeneration: { strings: false, wasm: false },
    });

    try {
        vm.runInContext(execFunc, context, { timeout: 30000 });
    } catch (error) {
        parentPort.postMessage({ type: 'debug', message: `Sandbox error: ${(error as Error)?.message ?? String(error)}` });
        parentPort.postMessage({ type: 'done', result: null, final: true });
    }
}

execute();

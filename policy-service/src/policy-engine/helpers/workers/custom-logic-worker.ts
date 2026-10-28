import { workerData, parentPort } from 'node:worker_threads';
import * as mathjs from 'mathjs';
import * as formulajs from '@formulajs/formulajs'
import { buildTableHelper } from '../table-field-core.js';
import * as vm from 'node:vm';
import { PREVIEW_SCRIPT_FILE, PreviewReadTracker } from './preview-read-tracker.js';
import { isPreviewFiniteResult, startPreviewCopyDiagnosis } from './preview-copy-diagnosis.js';

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
    let diagnosis: ((failed: boolean) => unknown) | null = null;
    let failed = false;
    const done = (result: any, final: boolean = true) => {
        if (diagnosis) {
            failed = failed || !isPreviewFiniteResult(result);
            if (final) {
                parentPort.postMessage({ type: 'diagnosis', diagnosis: diagnosis(failed) });
            }
            return;
        }
        const plain = tracker ? tracker.unwrap(result) : result;
        parentPort.postMessage({
            type: 'done',
            result: plain,
            final,
            reads: tracker ? tracker.take() : undefined,
            sites: tracker ? tracker.takeSites() : undefined,
            unexecuted: tracker ? tracker.takeUnexecuted() : undefined,
            writes: tracker ? tracker.takeWrites() : undefined,
            sources: tracker ? tracker.findSources(plain) : undefined,
            enumerated: tracker ? tracker.takeEnumerated() : undefined
        });
    }
    const debug = (message: any) => {
        parentPort.postMessage({ type: 'debug', message });
    }

    const { execFunc, user, documents, artifacts, sources, tablesPack, trackReads, schemas, diagnose } = workerData;
    const tracker = trackReads ? new PreviewReadTracker() : null;
    tracker?.configure(execFunc);
    tracker?.startCoverage();

    // Create sandbox with only the documented API surface
    // Object.create(null) prevents prototype chain escapes
    const sandbox = Object.create(null);
    sandbox.done = done;
    sandbox.debug = debug;
    sandbox.user = user;
    sandbox.documents = tracker ? tracker.trackPolicyDocuments(documents, schemas) : documents;
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

    if (tracker && Array.isArray(diagnose)) {
        diagnosis = startPreviewCopyDiagnosis(tracker, [
            { objectPrototype: Object.prototype, objectConstructor: Object, reflect: Reflect, global: globalThis },
            {
                objectPrototype: vm.runInContext('Object.getPrototypeOf({})', context),
                objectConstructor: vm.runInContext('Object.getPrototypeOf({}).constructor', context),
                reflect: vm.runInContext('Reflect', context),
                global: vm.runInContext('globalThis', context)
            }
        ], diagnose, Array.isArray(documents) ? documents.map((item: any) => item?.document?.credentialSubject) : []);
    }

    try {
        vm.runInContext(execFunc, context, tracker ? { timeout: 30000, filename: PREVIEW_SCRIPT_FILE } : { timeout: 30000 });
    } catch (error) {
        // A thrown script is a failure, not a successful empty result. Emit an 'error'
        // sentinel so the block surfaces it (ref.error + BlockErrorFn + ErrorEvent),
        // instead of the previous silent `done(null, final: true)` which fired no event
        // and left the workflow step parked on this non-UI block with no diagnostics.
        const message = (error as Error)?.message ?? String(error);
        if (diagnosis) {
            parentPort.postMessage({ type: 'diagnosis', diagnosis: diagnosis(true) });
            return;
        }
        parentPort.postMessage({ type: 'debug', message: `Sandbox error: ${message}` });
        parentPort.postMessage({
            type: 'error',
            error: `Custom logic error: ${message}`,
            errorName: (error as Error)?.name ?? null,
            reads: tracker ? tracker.take() : undefined,
            sites: tracker ? tracker.takeSites() : undefined,
            unexecuted: tracker ? tracker.takeUnexecuted() : undefined,
            enumerated: tracker ? tracker.takeEnumerated() : undefined
        });
    }
}

execute();

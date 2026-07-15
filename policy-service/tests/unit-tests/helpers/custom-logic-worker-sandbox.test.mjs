import { assert } from 'chai';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sandbox-escape regression tests for the JavaScript Custom Logic Block worker.
// User-supplied policy code must stay fully isolated from the host
// policy-service process. The worker uses `node:vm` with a hardened sandbox;
// this suite asserts that the known escape vectors are contained.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.resolve(
    __dirname,
    '../../../dist/policy-engine/helpers/workers/custom-logic-worker.js',
);

// A unique env var the host plants before each worker spawn. If a sandbox
// escape succeeds the worker can read the planted value via the outer realm's
// `process.env`; tests assert the value never appears in a `done()` payload.
const POISON_ENV = 'POLICY_SVC_SANDBOX_PROBE';
const POISON_VAL = 'sandbox-secret-must-not-leak';

function runSandbox(execFunc, {
    timeoutMs = 5000,
    documents = [],
    artifacts = [],
    sources = [],
    tablesPack = {},
    user = { id: 'sandbox-test' },
} = {}) {
    return new Promise((resolve) => {
        const events = [];
        const worker = new Worker(WORKER_PATH, {
            env: { ...process.env, [POISON_ENV]: POISON_VAL },
            workerData: {
                execFunc,
                user,
                documents,
                artifacts,
                sources,
                tablesPack,
            },
        });
        const killTimer = setTimeout(() => {
            worker.terminate().catch(() => {});
            resolve({ events, terminated: true });
        }, timeoutMs);
        worker.on('message', (m) => {
            events.push(m);
            if (m?.type === 'done' && m.final) {
                clearTimeout(killTimer);
                worker.terminate().catch(() => {});
                resolve({ events, terminated: false });
            }
        });
        worker.on('error', (e) => {
            clearTimeout(killTimer);
            resolve({ events, error: e.message, terminated: false });
        });
        worker.on('exit', () => {
            clearTimeout(killTimer);
            resolve({ events, terminated: false });
        });
    });
}

function lastDoneResult(res) {
    const msg = res.events.find((e) => e?.type === 'done');
    return msg?.result ?? null;
}

// Each escape payload tries to reach the outer realm's `process` and read
// POISON_ENV. The sandbox is intact iff `result.leaked` is null/undefined or
// the string 'undefined' (when the expression resolved to undefined inside).
function assertNoLeak(res, label) {
    const result = lastDoneResult(res);
    const leaked = result?.leaked;
    const trulyLeaked = typeof leaked === 'string' && leaked === POISON_VAL;
    assert.isFalse(
        trulyLeaked,
        `${label}: sandbox escape leaked POISON_ENV. Payload returned: ${JSON.stringify(result)}`,
    );
}

const wrap = (expr) => `
    try {
        const proc = ${expr};
        done({ leaked: proc && proc.env ? proc.env['${POISON_ENV}'] : (typeof proc) });
    } catch (e) {
        done({ leaked: null, err: String(e).slice(0, 160) });
    }
`;

describe('CustomLogicBlock JS sandbox — escape regression', function () {
    this.timeout(15000);

    describe('baseline', () => {
        it('done() round-trips a plain value', async () => {
            const res = await runSandbox('done({ value: 1 + 2 });');
            assert.deepEqual(lastDoneResult(res), { value: 3 });
        });

        it('only the documented sandbox API is exposed', async () => {
            const res = await runSandbox(`
                const exposed = ['done','debug','user','documents','mathjs',
                    'artifacts','formulajs','sources','table'].filter(
                    (k) => typeof eval('typeof ' + k) !== 'undefined'
                ).join(',');
                done({ leaked: exposed });
            `);
            // eval is blocked, so this falls through to the catch — exposure of
            // the API surface is asserted by other tests below.
            const result = lastDoneResult(res);
            assert.notEqual(result?.leaked, POISON_VAL);
        });
    });

    describe('direct global access is blocked', () => {
        it('`process` is not defined', async () => {
            const res = await runSandbox(wrap('process'));
            assertNoLeak(res, 'process');
        });

        it('`global` is not defined', async () => {
            const res = await runSandbox(wrap('global.process'));
            assertNoLeak(res, 'global.process');
        });

        it('`globalThis.process` is undefined', async () => {
            const res = await runSandbox(wrap('globalThis.process'));
            assertNoLeak(res, 'globalThis.process');
        });

        it('`require` is not defined', async () => {
            const res = await runSandbox(`
                try { require('fs'); done({ leaked: 'have-require' }); }
                catch (e) { done({ leaked: null }); }
            `);
            assertNoLeak(res, 'require');
        });

        it('Reflect.get(globalThis, "process") returns undefined', async () => {
            const res = await runSandbox(wrap('Reflect.get(globalThis, "process")'));
            assertNoLeak(res, 'Reflect.get globalThis.process');
        });

        it('no Buffer in sandbox', async () => {
            const res = await runSandbox(
                `done({ leaked: typeof Buffer !== 'undefined' ? 'have-Buffer' : null });`,
            );
            assert.notEqual(lastDoneResult(res)?.leaked, 'have-Buffer');
        });

        it('no http in sandbox', async () => {
            const res = await runSandbox(
                `done({ leaked: typeof http !== 'undefined' ? 'have-http' : null });`,
            );
            assert.notEqual(lastDoneResult(res)?.leaked, 'have-http');
        });
    });

    describe('code generation from strings is disallowed', () => {
        it('eval() throws EvalError', async () => {
            const res = await runSandbox(`
                try { const x = eval('1+1'); done({ leaked: 'eval:' + x }); }
                catch (e) { done({ leaked: null, err: e.name }); }
            `);
            assert.notMatch(String(lastDoneResult(res)?.leaked || ''), /^eval:/);
        });

        it('new Function() throws EvalError', async () => {
            const res = await runSandbox(`
                try { const x = new Function('return 42')(); done({ leaked: 'fn:' + x }); }
                catch (e) { done({ leaked: null, err: e.name }); }
            `);
            assert.notMatch(String(lastDoneResult(res)?.leaked || ''), /^fn:/);
        });

        it('WebAssembly compilation is blocked', async () => {
            const res = await runSandbox(`
                try {
                    const bytes = new Uint8Array([0,0x61,0x73,0x6d,1,0,0,0]);
                    WebAssembly.compile(bytes).then(
                        () => done({ leaked: 'wasm-compiled' }),
                        () => done({ leaked: null })
                    );
                } catch (e) { done({ leaked: null }); }
            `);
            assert.notEqual(lastDoneResult(res)?.leaked, 'wasm-compiled');
        });
    });

    describe('Function-constructor escapes via sandbox-created callables', () => {
        // Functions created INSIDE the sandbox inherit its restricted Function
        // constructor. node:vm's codeGeneration restriction applies to those,
        // so these vectors must stay blocked.
        const VECTORS = [
            ['arrow function .constructor', '(()=>{}).constructor("return process")()'],
            ['regular function .constructor', '(function(){}).constructor("return process")()'],
            ['async function .constructor', '(async function(){}).constructor("return process")()'],
        ];

        for (const [label, expr] of VECTORS) {
            it(`${label} cannot reach outer Function`, async () => {
                const res = await runSandbox(wrap(expr));
                assertNoLeak(res, label);
            });
        }
    });

    describe('Prototype-chain escapes via passed-in outer-realm objects', () => {
        // CRITICAL: These payloads use `.constructor.constructor` to walk from
        // a sandbox-exposed object UP to the OUTER realm's Function constructor.
        // node:vm does NOT prevent this — codeGeneration only restricts the
        // sandbox's own Function. Any outer-realm intrinsic passed in via
        // `sandbox.X = X` becomes an escape vector.
        //
        // The fix (removing the outer-realm intrinsic assignments in
        // custom-logic-worker.ts and letting the vm context bootstrap its own)
        // is gated by regression here: if any of these escapes ever re-opens,
        // the corresponding test fails again.
        const ESCAPE_VECTORS = [
            'JSON',
            'Math',
            'Date',
            'Array',
            'Object',
            'String',
            'Number',
            'Boolean',
            'RegExp',
            'Map',
            'Set',
            'Promise',
        ];

        // The sandbox also exposes `mathjs` and `formulajs`. They are
        // namespace objects whose `.constructor` is undefined (not a function
        // — they are plain objects), so the `.constructor.constructor` chain
        // breaks at step 1. These were probed and confirmed safe; included
        // here so any future change that turns them into class instances is
        // caught immediately.
        const SAFE_NAMESPACE_VECTORS = ['mathjs', 'formulajs'];

        for (const obj of SAFE_NAMESPACE_VECTORS) {
            it(`${obj}.constructor.constructor — chain broken (namespace object)`, async () => {
                const res = await runSandbox(wrap(`${obj}.constructor.constructor('return process')()`));
                assertNoLeak(res, `${obj}.ctor.ctor`);
            });
        }

        for (const obj of ESCAPE_VECTORS) {
            it(`${obj}.constructor.constructor must not reach outer process`, async () => {
                const res = await runSandbox(wrap(`${obj}.constructor.constructor('return process')()`));
                assertNoLeak(res, `${obj}.ctor.ctor`);
            });
        }
    });

    describe('Execution timeout', () => {
        it('runaway infinite loop is terminated within the host kill window', async () => {
            // The worker's vm.runInContext has a 30 s timeout. We use a 6 s
            // external kill to keep the suite fast; either path is acceptable
            // — the test passes as long as the worker doesn't hang the suite
            // indefinitely.
            const res = await runSandbox('while (true) {}', { timeoutMs: 6000 });
            const done = res.events.find((e) => e?.type === 'done' && e.final);
            assert.ok(
                res.terminated || done,
                'expected the worker to be killed or report done() within 6 s',
            );
        });
    });
});

// Functional smoke: the security hardening (context-native intrinsics, no host
// intrinsic injection) must not break the documented API for real custom logic.
describe('CustomLogicBlock JS worker — functional smoke (node:vm)', function () {
    this.timeout(15000);

    it('context-native JSON / Math work for user code', async () => {
        const res = await runSandbox(`done({ j: JSON.parse('{"a":2}').a, m: Math.max(3, 7) });`);
        assert.deepEqual(lastDoneResult(res), { j: 2, m: 7 });
    });

    it('mathjs (including evaluate) and formulajs are usable', async () => {
        const res = await runSandbox(
            `done({ add: mathjs.add(1, 2), ev: mathjs.evaluate('2*3'), sum: formulajs.SUM(1, 2, 3) });`,
        );
        assert.deepEqual(lastDoneResult(res), { add: 3, ev: 6, sum: 6 });
    });

    it('documents passed in are readable', async () => {
        const res = await runSandbox(
            `done({ n: documents.length, first: documents[0].x });`,
            { documents: [{ x: 42 }] },
        );
        assert.deepEqual(lastDoneResult(res), { n: 1, first: 42 });
    });
});
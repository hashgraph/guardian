import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A customLogic script that throws must emit a real 'error' sentinel, not a silent
 * `done(null, final: true)`.
 *
 * Previously the worker's catch swallowed the exception into a suppressed `debug`
 * message and posted `done(null, final: true)`, which the block turned into a no-op
 * (triggerEvents(null) -> no RefreshEvent) -> the workflow step parked on this non-UI
 * block with zero diagnostics.
 */
const filename = fileURLToPath(import.meta.url);
const WORKER = path.join(
    path.dirname(filename),
    '../../../dist/policy-engine/helpers/workers/custom-logic-worker.js'
);

function runWorker(execFunc) {
    return new Promise((resolve, reject) => {
        const messages = [];
        const worker = new Worker(WORKER, {
            workerData: { execFunc, user: {}, artifacts: [], documents: [{ document: {} }], sources: [], tablesPack: {} },
        });
        const timer = setTimeout(() => { worker.terminate(); reject(new Error('worker timeout')); }, 15000);
        worker.on('message', (m) => messages.push(m));
        worker.on('error', (e) => { clearTimeout(timer); reject(e); });
        worker.on('exit', () => { clearTimeout(timer); resolve(messages); });
    });
}

describe('@unit customLogic worker error signalling', () => {
    it('emits an "error" message when the script throws', async () => {
        const messages = await runWorker('documents[0].missing.field.value;');
        const err = messages.find((m) => m?.type === 'error');
        assert.ok(err, 'worker posts a { type: "error" } message on a thrown script');
        assert.match(err.error, /Custom logic error/);
    });

    it('does NOT fake a successful done(null) on a thrown script', async () => {
        const messages = await runWorker('throw new Error("boom");');
        const fakeDone = messages.find(
            (m) => m?.type === 'done' && m?.result === null && m?.final === true
        );
        assert.equal(fakeDone, undefined, 'no silent done(null, final: true) is emitted');
        assert.ok(messages.some((m) => m?.type === 'error'), 'an error is emitted instead');
    });

    it('still returns the script result on the success path', async () => {
        const messages = await runWorker('done({ ok: 1 });');
        const done = messages.find((m) => m?.type === 'done');
        assert.ok(done, 'a done message is emitted');
        assert.deepEqual(done.result, { ok: 1 });
        assert.equal(messages.some((m) => m?.type === 'error'), false, 'no error on the success path');
    });
});

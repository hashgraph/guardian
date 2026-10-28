import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const WORKER = path.join(
    path.dirname(filename),
    '../../../dist/policy-engine/helpers/workers/custom-logic-worker.js'
);

function runWorker(execFunc, documents, trackReads, schemas = []) {
    return new Promise((resolve, reject) => {
        const messages = [];
        const worker = new Worker(WORKER, {
            workerData: { execFunc, user: {}, artifacts: [], documents, sources: [], tablesPack: {}, trackReads, schemas },
        });
        const timer = setTimeout(() => { worker.terminate(); reject(new Error('worker timeout')); }, 15000);
        worker.on('message', (message) => messages.push(message));
        worker.on('error', (error) => { clearTimeout(timer); reject(error); });
        worker.on('exit', () => { clearTimeout(timer); resolve(messages); });
    });
}

const formDocuments = () => [{ schema: '#S', document: { credentialSubject: [{ amount: 2 }] } }];

describe('@unit customLogic worker read tracking', function () {
    this.timeout(20000);

    it('reports the fields the script reads and returns a plain result', async () => {
        const messages = await runWorker(
            'const doc = documents[0].document.credentialSubject[0]; doc.total = doc.amount * (doc.rate || 1); done(doc);',
            formDocuments(),
            true
        );
        const done = messages.find((message) => message?.type === 'done');
        assert.deepEqual(done.result, { amount: 2, total: 2 });
        assert.deepEqual(done.reads, [
            { schema: '#S', path: 'amount', fullPath: 'amount' },
            { schema: '#S', path: 'rate', fullPath: 'rate' }
        ]);
        assert.deepEqual(done.writes, [{ schema: '#S', path: 'total', document: 0 }]);
        assert.deepEqual(done.sources, [0]);
    });

    it('reports which input document the script returned', async () => {
        const messages = await runWorker(
            'documents[0].document.credentialSubject[0].temp = 3; done([documents[1], documents[0]]);',
            [...formDocuments(), ...formDocuments()],
            true
        );
        const done = messages.find((message) => message?.type === 'done');
        assert.deepEqual(done.writes, [{ schema: '#S', path: 'temp', document: 0 }]);
        assert.deepEqual(done.sources, [1, 0]);
    });

    it('does not report a field the script reads back after writing it', async () => {
        const messages = await runWorker(
            'const doc = documents[0].document.credentialSubject[0]; doc.temp = doc.amount + 1; doc.total = doc.temp * 2; done(doc);',
            formDocuments(),
            true
        );
        const done = messages.find((message) => message?.type === 'done');
        assert.deepEqual(done.result, { amount: 2, temp: 3, total: 6 });
        assert.deepEqual(done.reads, [{ schema: '#S', path: 'amount', fullPath: 'amount' }]);
    });

    it('reports reads of a document without a schema against the schema given for it', async () => {
        const messages = await runWorker(
            'const doc = documents[0].document.credentialSubject[0]; done({ total: doc.rate * 2 });',
            [{ document: { credentialSubject: [{ amount: 2 }] } }],
            true,
            ['#S']
        );
        const done = messages.find((message) => message?.type === 'done');
        assert.deepEqual(done.reads, [{ schema: '#S', path: 'rate', fullPath: 'rate' }]);
    });

    it('sends where each field was read and which code did not run', async () => {
        const script = 'const doc = documents[0].document.credentialSubject[0];\nlet total = doc.amount;\nif (total > 100) { total = doc.rate; }\ndone({ total });';
        const messages = await runWorker(script, formDocuments(), true);
        const done = messages.find((message) => message?.type === 'done');
        assert.deepEqual(done.sites, [{ schema: '#S', path: 'amount', fullPath: 'amount', site: script.indexOf('amount'), listed: false, nested: false, document: 0 }]);
        assert.deepEqual(done.unexecuted.map(([start, end]) => script.slice(start, end)), ['{ total = doc.rate; }']);
    });

    it('reports the reads made before the script failed', async () => {
        const messages = await runWorker(
            'const doc = documents[0].document.credentialSubject[0]; doc.rate.toFixed(2);',
            formDocuments(),
            true
        );
        const error = messages.find((message) => message?.type === 'error');
        assert.ok(error);
        assert.deepEqual(error.reads, [{ schema: '#S', path: 'rate', fullPath: 'rate' }]);
        assert.ok(Array.isArray(error.unexecuted));
    });

    it('does not count a check with in as a read, also when the check fails the script', async () => {
        const script = "const doc = documents[0].document.credentialSubject[0]; if (!('rate' in doc)) throw new Error('rate is required'); done({ final: 7 });";
        const missing = await runWorker(script, formDocuments(), true);
        const error = missing.find((message) => message?.type === 'error');
        assert.equal(error.error, 'Custom logic error: rate is required');
        assert.deepEqual(error.reads, []);

        const filled = await runWorker(script, [{ schema: '#S', document: { credentialSubject: [{ amount: 2, rate: 20 }] } }], true);
        const done = filled.find((message) => message?.type === 'done');
        assert.deepEqual(done.result, { final: 7 });
        assert.deepEqual(done.reads, []);
    });

    it('sends no reads when tracking is off', async () => {
        const messages = await runWorker('done({ ok: 1 });', [{ document: {} }], false);
        const done = messages.find((message) => message?.type === 'done');
        assert.deepEqual(done.result, { ok: 1 });
        assert.equal(done.reads, undefined);
        assert.equal(done.sites, undefined);
        assert.equal(done.unexecuted, undefined);
    });
});

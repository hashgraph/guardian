import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasPreviewPresenceCheck, isPreviewFiniteResult } from '../../../dist/policy-engine/helpers/workers/preview-copy-diagnosis.js';
import { PreviewScope, markPreviewExtractedDocument, calculatePreviewAutoFields, getPreviewCopyTargets, getPreviewInputError, recoverPreviewCopiedFields, runPreview, setPreviewComputed } from '../../../dist/policy-engine/helpers/preview.js';
import { MessageResponse } from '@guardian/common/models/message-response';
import { makeBlock, makeUser } from '../blocks/_block-exec-harness.mjs';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const filename = fileURLToPath(import.meta.url);
const WORKERS = path.join(path.dirname(filename), '../../../dist/policy-engine/helpers/workers');

const field = (name, type, extra = {}) => ({ name, type, isRef: false, isArray: false, ...extra });

function runWorker(file, workerData) {
    return new Promise((resolve, reject) => {
        const messages = [];
        const worker = new Worker(path.join(WORKERS, file), { workerData });
        const timer = setTimeout(() => { worker.terminate(); reject(new Error('worker timeout')); }, 15000);
        worker.on('message', (message) => messages.push(message));
        worker.on('error', (error) => { clearTimeout(timer); reject(error); });
        worker.on('exit', () => { clearTimeout(timer); resolve(messages); });
    });
}

const subject = () => ({ amount: 4, rows: [{ value: 1 }, { value: 1 }] });

async function customLogic(execFunc, diagnose) {
    const messages = await runWorker('custom-logic-worker.js', {
        execFunc,
        user: {},
        artifacts: [],
        documents: [{ schema: '#S', document: { credentialSubject: [subject()] } }],
        sources: [],
        tablesPack: {},
        trackReads: true,
        schemas: ['#S'],
        diagnose
    });
    return messages;
}

const top = { schema: '#S', document: 0, path: '', names: ['rate', 'factor', 'skip'] };
const rowOne = { schema: '#S', document: 0, path: 'rows.1', names: ['rate'] };

async function diagnose(execFunc, targets = [top]) {
    const messages = await customLogic(`const doc = documents[0].document.credentialSubject[0]; ${execFunc}`, targets);
    return messages.find((message) => message?.type === 'diagnosis')?.diagnosis;
}

describe('@unit Preview copied-field diagnosis', function () {
    this.timeout(30000);

    it('exports the enumerated form object in an ordinary Preview run', async () => {
        const messages = await customLogic('const doc = documents[0].document.credentialSubject[0]; const c = { ...doc }; done({ total: c["ra" + "te"] * 2 });');
        const done = messages.find((message) => message?.type === 'done');
        assert.deepEqual(done.enumerated, [{ schema: '#S', path: '', document: 0 }]);
        assert.equal(messages.some((message) => message?.type === 'diagnosis'), false);
    });

    it('finds a computed key read from a spread copy', async () => {
        const diagnosis = await diagnose('const c = { ...doc }; done({ total: c["ra" + "te"] * 2 });');
        assert.equal(diagnosis.trusted, true);
        assert.equal(diagnosis.failed, true);
        assert.deepEqual(diagnosis.sites.map((site) => site.fullPath), ['rate']);
    });

    it('finds two missing fields from an Object.assign copy', async () => {
        const diagnosis = await diagnose('const c = Object.assign({}, doc); done({ total: c["ra" + "te"] * c.factor });');
        assert.equal(diagnosis.trusted, true);
        assert.deepEqual(diagnosis.sites.map((site) => site.fullPath).sort(), ['factor', 'rate']);
    });

    it('keeps the exact index of one of two identical copied rows', async () => {
        const diagnosis = await diagnose('const r = { ...doc.rows[1] }; done({ total: r["ra" + "te"] * 2 });', [rowOne]);
        assert.equal(diagnosis.trusted, true);
        assert.deepEqual(diagnosis.sites.map((site) => site.fullPath), ['rows.1.rate']);
    });

    it('does not trust a JSON clone, which loses the link to the form', async () => {
        const diagnosis = await diagnose('const c = JSON.parse(JSON.stringify(doc)); done({ total: c.rate * 2 });');
        assert.equal(diagnosis.trusted, false);
    });

    it('does not trust a read from an unrelated object', async () => {
        const diagnosis = await diagnose('const c = {}; done({ total: c.rate * 2 });');
        assert.equal(diagnosis.trusted, false);
    });

    it('does not trust a run that checked presence through Reflect.has, even through an alias', async () => {
        const diagnosis = await diagnose('const has = Reflect.has; const c = { ...doc }; done({ total: has(c, "skip") ? c.factor * 2 : c.rate * 2 });');
        assert.equal(diagnosis.trusted, false);
    });

    it('does not trust a run that checked the prototype with hasOwnProperty', async () => {
        for (const code of [
            'const c = { ...doc }; done({ total: c.__proto__.hasOwnProperty("skip") ? c.factor * 2 : c["ra" + "te"] * 2 });',
            'const c = { ...doc }; done({ total: Object.hasOwn(Object.getPrototypeOf({}), "skip") ? c.factor * 2 : c["ra" + "te"] * 2 });'
        ]) {
            assert.equal((await diagnose(code)).trusted, false, code);
        }
    });

    it('keeps an exact answer when hasOwnProperty is used on an ordinary object', async () => {
        const diagnosis = await diagnose('const c = { ...doc }; done({ total: c.hasOwnProperty("amount") ? c["ra" + "te"] * 2 : 0 });');
        assert.equal(diagnosis.trusted, true);
        assert.deepEqual(diagnosis.sites.map((site) => site.fullPath), ['rate']);
    });

    it('does not trust a run that inspected symbols or descriptors', async () => {
        for (const code of [
            'const c = { ...doc }; Object.getOwnPropertySymbols(c); done({ total: c.rate * 2 });',
            'const c = { ...doc }; Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "skip"); done({ total: c.rate * 2 });'
        ]) {
            assert.equal((await diagnose(code)).trusted, false, code);
        }
    });

    it('keeps an ordinary assignment to a copy and reports no failure', async () => {
        const diagnosis = await diagnose('const c = { ...doc }; c.rate = 3; Object.assign(c, { factor: 2 }); done({ total: c.rate * c.factor });');
        assert.equal(diagnosis.failed, false);
        assert.deepEqual(diagnosis.sites, []);
    });

    it('reports a thrown script as failed', async () => {
        const diagnosis = await diagnose('const c = { ...doc }; if (c["ra" + "te"] === undefined) { throw new Error("no rate"); } done({});');
        assert.equal(diagnosis.failed, true);
        assert.deepEqual(diagnosis.sites.map((site) => site.fullPath), ['rate']);
    });

    it('finds a copied read in a Math code block', async () => {
        const expression = { code: 'const c = { ...document }; result.total = c["ra" + "te"] * 2;', inputs: [], outputs: [], formulas: [] };
        const messages = await runWorker('math-worker.js', {
            expression,
            user: {},
            documents: { target: { amount: 4 } },
            schema: null,
            copy: false,
            tablesPack: {},
            withScope: false,
            trackReads: true,
            diagnose: [{ schema: null, document: null, path: '', names: ['rate'] }]
        });
        const diagnosis = messages.find((message) => message?.type === 'diagnosis')?.diagnosis;
        assert.equal(diagnosis.trusted, true);
        assert.equal(diagnosis.failed, true);
        assert.deepEqual(diagnosis.sites.map((site) => site.fullPath), ['rate']);
    });

    it('runs Math diagnosis without Node capabilities and reports the different failure', async () => {
        const expression = { code: 'process.exitCode; const c = { ...document }; result.total = c["ra" + "te"] * 2;', inputs: [], outputs: [], formulas: [] };
        const messages = await runWorker('math-worker.js', {
            expression, user: {}, documents: { target: { amount: 4 } }, schema: null, copy: false, tablesPack: {},
            withScope: false, trackReads: true, diagnose: [{ schema: null, document: null, path: '', names: ['rate'] }]
        });
        const diagnosis = messages.find((message) => message?.type === 'diagnosis')?.diagnosis;
        assert.equal(diagnosis.failed, true);
        assert.match(diagnosis.error, /process is not defined/);
        assert.deepEqual(diagnosis.sites, []);
    });

    it('detects in and with as presence checks', () => {
        assert.equal(hasPreviewPresenceCheck('const c = { ...doc }; if ("skip" in c) {}'), true);
        assert.equal(hasPreviewPresenceCheck('with (doc) { rate }'), true);
        assert.equal(hasPreviewPresenceCheck('for (const key in doc) {} const c = { ...doc }; return c.rate;'), false);
    });

    it('treats nested NaN or Infinity as a non-finite result', () => {
        assert.equal(isPreviewFiniteResult({ a: [1, { b: 2 }] }), true);
        assert.equal(isPreviewFiniteResult({ a: [1, { b: NaN }] }), false);
        assert.equal(isPreviewFiniteResult(Infinity), false);
    });

    describe('autocalculate', () => {
        const fields = (expression) => [
            field('amount', 'number'),
            field('rate', 'number'),
            field('other', 'number'),
            field('total', 'number', { autocalculate: true, expression })
        ];

        it('requires only the field read from a copy', () => {
            const dependencies = {};
            const errors = [];
            calculatePreviewAutoFields(fields('({ ...this })["ra" + "te"] * amount'), { amount: 2 }, dependencies, errors);
            assert.deepEqual(dependencies.total.sort(), ['amount', 'rate']);
            assert.deepEqual(errors, ['Invalid expression: total']);
        });

        it('requires every empty field after a JSON clone fails', () => {
            const dependencies = {};
            const errors = [];
            calculatePreviewAutoFields(fields('JSON.parse(JSON.stringify(this)).rate * amount'), { amount: 2 }, dependencies, errors);
            assert.deepEqual([...new Set(dependencies.total)].sort(), ['amount', 'other', 'rate']);
        });

        it('adds nothing when the copied calculation succeeds', () => {
            const dependencies = {};
            const errors = [];
            const doc = { amount: 2, rate: 3 };
            calculatePreviewAutoFields(fields('({ ...this }).rate * amount'), doc, dependencies, errors);
            assert.equal(doc.total, 6);
            assert.deepEqual(dependencies.total, ['amount']);
            assert.deepEqual(errors, []);
        });

        it('leaves no symbol on the form document', () => {
            const doc = { amount: 2 };
            calculatePreviewAutoFields(fields('({ ...this })["ra" + "te"] * amount'), doc, {}, []);
            assert.deepEqual(Object.getOwnPropertySymbols(doc), []);
        });

        it('stops a diagnostic run that never ends and uses the wide list', () => {
            const dependencies = {};
            const started = Date.now();
            calculatePreviewAutoFields(fields('(() => { const c = { ...this }; if (Object.getOwnPropertySymbols(c).length) { while (true) {} } return c["ra" + "te"] * amount; })()'), { amount: 2 }, dependencies, []);
            assert.ok(Date.now() - started < 5000);
            assert.deepEqual([...new Set(dependencies.total)].sort(), ['amount', 'other', 'rate']);
        });

        it('does not change the form document and does not trust an expression that writes', () => {
            const doc = { amount: 2 };
            const dependencies = {};
            calculatePreviewAutoFields([...fields('(() => { const c = { ...this }; this.amount++; return c["ra" + "te"] * this.amount; })()'),
                field('after', 'number', { autocalculate: true, expression: 'amount' })], doc, dependencies, []);
            assert.equal(doc.amount, 3);
            assert.equal(doc.after, 3);
            assert.deepEqual([...new Set(dependencies.total)].sort(), ['amount', 'other', 'rate']);
        });

        it('keeps an error the expression threw itself without asking for fields', () => {
            const dependencies = {};
            const errors = [];
            calculatePreviewAutoFields(fields('(() => { const c = { ...this }; throw new Error("bad input"); })()'), { amount: 2 }, dependencies, errors);
            assert.deepEqual(errors, ['Invalid expression: total']);
            assert.equal((dependencies.total || []).includes('other'), false);
        });

        it('does not run diagnosis during discovery', () => {
            const dependencies = {};
            calculatePreviewAutoFields(fields('JSON.parse(JSON.stringify(this)).rate * amount'), { amount: 2 }, dependencies, [], '', true);
            assert.equal((dependencies.total || []).includes('other'), false);
        });
    });

    describe('recovery to 422', () => {
        const status = (discovery = false, document = { amount: 2, rows: [{ value: 1 }] }) => {
            const actionStatus = new RecordActionStep(() => undefined, 0, true, true, undefined, true);
            actionStatus.setPreviewSource({
                schema: '#S', document, paths: ['amount', 'rate', 'other', 'rows', 'rows.value', 'rows.rate'], dependencies: {}, discovery
            });
            return actionStatus;
        };
        const enumerated = [{ schema: '#S', path: '', document: 0 }];
        const script = 'const c = { ...doc }; return c["ra" + "te"] * 2;';
        const input = () => ({ schema: '#S', document: { credentialSubject: [{ amount: 2, rows: [{ value: 1 }] }] } });

        it('lists the empty fields of the copied object only', () => {
            assert.deepEqual(getPreviewCopyTargets(status(), enumerated, input),
                [{ schema: '#S', document: 0, path: '', names: ['rate', 'other'] }]);
        });

        it('maps extracted copy fallback to the original indexed object', async () => {
            const step = status(false, { rows: [{}, {}] });
            step.setPreviewSource({ schema: '#S', document: { rows: [{}, {}] }, paths: ['rows', 'rows.rate'], dependencies: {} });
            await PreviewScope.run(step, async () => {
                const parent = { schema: '#S', document: { credentialSubject: [{ rows: [{}, {}] }] } };
                const child = markPreviewExtractedDocument({ document: { credentialSubject: [{}] } }, parent, 'rows.1');
                const targets = getPreviewCopyTargets(step, [{ schema: null, path: '', document: 0 }], () => child);
                assert.equal(targets.length, 1);
                assert.equal(targets[0].formPath, 'rows.1');
                await recoverPreviewCopiedFields(step, targets, script, async () => null);
                assert.deepEqual(getPreviewInputError(step).data.missingFields, ['rows.1.rate']);
            });
        });

        it('leaves out a field an earlier block already calculated', () => {
            const calculated = setPreviewComputed({ schema: '#S', document: { credentialSubject: [{ amount: 2, rate: 5, rows: [{ value: 1 }] }] } }, ['rate']);
            assert.deepEqual(getPreviewCopyTargets(status(), enumerated, () => calculated),
                [{ schema: '#S', document: 0, path: '', names: ['other'] }]);
        });

        it('starts nothing in discovery or when a missing field is already known', () => {
            assert.deepEqual(getPreviewCopyTargets(status(true), enumerated, input), []);
            const known = status();
            known.addPreviewRead('#S', 'rate');
            assert.deepEqual(getPreviewCopyTargets(known, enumerated, input), []);
        });

        it('returns the exact field when the diagnosis is trusted', async () => {
            const actionStatus = status();
            const targets = getPreviewCopyTargets(actionStatus, enumerated, input);
            await recoverPreviewCopiedFields(actionStatus, targets, script, async () => ({
                trusted: true, failed: true, sites: [{ schema: '#S', path: 'rate', fullPath: 'rate', site: script.indexOf('["ra"'), listed: false }]
            }));
            assert.deepEqual(getPreviewInputError(actionStatus).data.missingFields, ['rate']);
        });

        it('returns every empty field of the copied object when the diagnosis is not trusted', async () => {
            const actionStatus = status();
            const targets = getPreviewCopyTargets(actionStatus, enumerated, input);
            await recoverPreviewCopiedFields(actionStatus, targets, script, async () => ({ trusted: false, failed: true, sites: [] }));
            const error = getPreviewInputError(actionStatus);
            assert.equal(error.code, 422);
            assert.deepEqual(error.data.missingFields, ['other', 'rate']);
        });

        it('leaves out non-finite result fields when no diagnostic run was made', async () => {
            const actionStatus = status();
            const targets = getPreviewCopyTargets(actionStatus, enumerated, input);
            await recoverPreviewCopiedFields(actionStatus, targets, 'const c = { ...doc }; return "skip" in c ? 1 : c.rate;', async () => null, [], undefined, ['other']);
            assert.deepEqual(getPreviewInputError(actionStatus).data.missingFields, ['rate']);
        });

        it('does not rerun a script with an in check and uses the wide list', async () => {
            const actionStatus = status();
            let runs = 0;
            const targets = getPreviewCopyTargets(actionStatus, enumerated, input);
            await recoverPreviewCopiedFields(actionStatus, targets, 'const c = { ...doc }; return "skip" in c ? 1 : c.rate;', async () => { runs++; return null; });
            assert.equal(runs, 0);
            assert.equal(getPreviewInputError(actionStatus).code, 422);
        });
    });

    describe('Custom Logic block', () => {
        const preview = (expression, credentials, paths = ['amount', 'rate', 'other']) => {
            let readsWhenSettled;
            return runPreview({ blockType: 'requestVcDocumentBlock' }, makeUser(), {}, async (_block, user, _data, actionStatus) => {
                actionStatus.setPreviewSource({ schema: '#S', document: { amount: 2 }, paths, dependencies: {} });
                const { block } = makeBlock(CustomLogicBlock, { options: { unsigned: true, expression } });
                block.triggerEvents = async () => undefined;
                await block.runAction({ user, data: { data: credentials }, actionStatus });
                readsWhenSettled = actionStatus.getPreviewReads().map((read) => read.path).sort();
                return new MessageResponse({});
            }).then((result) => ({ result, readsWhenSettled }));
        };
        const credential = (subject) => ({ schema: '#S', document: { credentialSubject: [subject] } });

        it('settles the block only after a slow diagnosis has added its fields', async () => {
            const { result, readsWhenSettled } = await preview(
                'const doc = documents[0].document.credentialSubject[0]; const c = { ...doc }; done({ total: c["ra" + "te"] * 2 }); const until = Date.now() + 3000; while (Date.now() < until) {}',
                credential({ amount: 2 })
            );
            assert.deepEqual(readsWhenSettled, ['rate']);
            assert.equal(result.code, 422);
            assert.deepEqual(result.data.missingFields, ['rate']);
        });

        it('shows an error the script threw itself instead of asking for fields', async () => {
            const { result } = await preview(
                'const doc = documents[0].document.credentialSubject[0]; for (const key in doc) {} throw new Error("amount too small");',
                credential({ amount: 2 })
            );
            assert.notEqual(result.code, 422);
            assert.match(result.body.errors[0].message, /amount too small/);
        });

        it('asks for fields after a TypeError caused by an empty copied value', async () => {
            const { result } = await preview(
                'const doc = documents[0].document.credentialSubject[0]; const c = JSON.parse(JSON.stringify(doc)); done({ total: c.rate.value });',
                credential({ amount: 2 })
            );
            assert.equal(result.code, 422);
            assert.deepEqual(result.data.missingFields, ['other', 'rate']);
        });

        it('asks for fields after a mathjs Undefined symbol error on a copy', async () => {
            const { result } = await preview(
                'const doc = documents[0].document.credentialSubject[0]; const c = { ...doc }; done({ total: mathjs.evaluate("rate * 2", c) });',
                credential({ amount: 2 })
            );
            assert.equal(result.code, 422);
            assert.deepEqual(result.data.missingFields, ['other', 'rate']);
        });

        it('does not ask for a result field the failed script writes itself', async () => {
            const { result } = await preview(
                'const doc = documents[0].document.credentialSubject[0]; const c = JSON.parse(JSON.stringify(doc)); c.total = c.rate * 2; done(c);',
                credential({ amount: 2 }),
                ['amount', 'rate', 'other', 'total']
            );
            assert.equal(result.code, 422);
            assert.deepEqual(result.data.missingFields, ['other', 'rate']);
        });

        it('keeps a field the script reads before writing it', async () => {
            const { result } = await preview(
                'const doc = documents[0].document.credentialSubject[0]; const c = JSON.parse(JSON.stringify(doc)); c.rate = c.rate * 2; done(c);',
                credential({ amount: 2 })
            );
            assert.equal(result.code, 422);
            assert.deepEqual(result.data.missingFields, ['other', 'rate']);
        });

        it('returns the exact field from the current form', async () => {
            const { result } = await preview(
                'const doc = documents[0].document.credentialSubject[0]; const c = { ...doc }; done({ total: c["ra" + "te"] * 2 });',
                credential({ amount: 2 })
            );
            assert.equal(result.code, 422);
            assert.deepEqual(result.data.missingFields, ['rate']);
        });

        it('falls back to the empty fields of a copied same-schema input after a failure', async () => {
            const { result } = await preview(
                'const old = documents[1].document.credentialSubject[0]; const c = { ...old }; done({ total: c["ra" + "te"] * 2 });',
                [credential({ amount: 2 }), credential({ amount: 7 })]
            );
            assert.equal(result.code, 422);
            assert.deepEqual(result.data.missingFields, ['rate']);
        });
    });
});

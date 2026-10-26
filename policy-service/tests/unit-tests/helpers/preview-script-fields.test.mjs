import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { findPreviewScriptFields } from '../../../dist/policy-engine/helpers/preview-script-fields.js';
import { PREVIEW_SCRIPT_FILE, PreviewReadTracker } from '../../../dist/policy-engine/helpers/workers/preview-read-tracker.js';

const paths = ['amount', 'bonus', 'rate', 'discount', 'diesel', 'factor', 'secret', 'total', 'calc', 'calc.total',
    'a', 'c', 'k', 'v', 'e', 'rows', 'rows.value', 'note', 'project', 'project.code', 'other', 'other.code'];

const run = (body, input, sources = []) => {
    const script = `const doc = documents[0].document.credentialSubject[0];\n${body}`;
    const tracker = new PreviewReadTracker();
    tracker.configure(script);
    tracker.startCoverage();
    let unexecuted = [];
    runInNewContext(script, {
        documents: tracker.trackPolicyDocuments([{ schema: '#S', document: { credentialSubject: [structuredClone(input)] } }]),
        sources, debug() {}, JSON, Object,
        done() { unexecuted = tracker.takeUnexecuted(); }
    }, { filename: PREVIEW_SCRIPT_FILE });
    return findPreviewScriptFields(script, tracker.takeSites(), unexecuted, '#S', paths).map((read) => read.path).sort();
};

describe('@unit findPreviewScriptFields', () => {
    for (const [name, body, input, expected] of [
        ['a read by name', 'done({ t: doc.amount * 2 });', { amount: 1 }, ['amount']],
        ['logging the whole document', 'debug(JSON.stringify(doc)); done({ t: doc.amount * 2 });', { amount: 1, bonus: 2, note: 'x' }, ['amount']],
        ['a spread copy used by name', 'const c = { ...doc }; done({ t: c.amount * 2 });', { amount: 1, bonus: 2, note: 'x' }, ['amount']],
        ['a key copy loop used by name', 'const c = {}; for (const k of Object.keys(doc)) c[k] = doc[k]; done({ t: c.amount });', { amount: 1, note: 'x' }, ['amount']],
        ['a for-in copy used by name', 'const c = {}; for (const k in doc) c[k] = doc[k]; done({ t: c.amount * 2 });', { amount: 1, note: 'x' }, ['amount']],
        ['a key built at run time', "const f = 'ra' + 'te'; done({ t: doc[f] * 2 });", { rate: 1 }, ['rate']],
        ['both branches and the helper only one branch calls',
            'function fuel(d) { return d.diesel * d.factor; }\nlet t;\nif (doc.amount > 100) { t = fuel(doc) + doc.rate; } else { t = doc.amount - (doc.discount || 0); }\ndone({ t });',
            { amount: 5 }, ['amount', 'diesel', 'factor', 'rate']],
        ['a helper nothing calls', 'function unused(d) { return d.secret; }\ndone({ t: doc.amount });', { amount: 5 }, ['amount']],
        ['a default and a destructuring default', 'const { bonus = 0 } = doc; done({ t: doc.amount + (doc.rate ?? 1) + bonus });', { amount: 1 }, ['amount']],
        ['typeof, == null and in', "const b = typeof doc.bonus === 'number' ? 1 : 0; const r = doc.rate == null ? 0 : 1; const n = 'note' in doc; done({ t: b + r + n + doc.amount });", { amount: 1 }, ['amount']],
        ['a read guarded by a check of the same field', "const t = typeof doc.bonus === 'undefined' ? doc.amount : doc.amount + doc.bonus; done({ t });", { amount: 1 }, ['amount']],
        ['a comparison is not a guard', 'let t = 0; if (doc.amount > 100) { t = doc.amount * doc.rate; } done({ t });', { amount: 5 }, ['amount', 'rate']],
        ['a check of another object is not a guard', 'const row = {}; let t = doc.amount; if (row.bonus) { t += doc.bonus; } done({ t });', { amount: 5 }, ['amount', 'bonus']],
        ['rows of a table', 'let t = 0; doc.rows.forEach((row) => { t += row.value; }); done({ t });', { rows: [{ value: 1 }] }, ['rows.value']],
        ['rows of an empty table', 'let t = 0; for (const row of doc.rows) { t += row.value; } done({ t });', { rows: [] }, ['rows.value']],
        ['a nested write', 'doc.calc = {}; doc.calc.total = doc.a * 2; done(documents[0]);', { a: 1 }, ['a']],
        ['an output written in one branch', 'if (doc.c) doc.total = doc.a; done(documents[0]);', { c: false, a: 1 }, ['a', 'c']],
        ['a destructuring assignment in a branch', 'let le; if (doc.k) { [le] = [doc.v]; } else { le = 0; } doc.e = le; done(documents[0]);', { k: false, v: 1 }, ['k', 'v']],
        ['a value method on a field', 'done({ t: doc.rate.toFixed(2) });', { rate: 1 }, ['rate']],
        ['a sub-object walked to its field', 'done({ t: doc.project.code });', { project: { code: 'x' } }, ['project.code']],
        ['the same key in another sub-object', 'const p = doc.project; done({ t: p.code });', { project: { code: 'x' }, other: { code: 'y' } }, ['project', 'project.code']],
        ['a document from sources', 'const s = sources.find((item) => item.ok)?.document.credentialSubject[0]; if (s) { done({ t: s.amount + s.rate }); } else { done({ t: doc.amount }); }', { amount: 1 }, ['amount']]
    ]) {
        it(`finds the fields for ${name}`, () => {
            assert.deepEqual(run(body, input), expected);
        });
    }

    it('does not find a name built from parts in code that did not run', () => {
        assert.deepEqual(run("let t = doc.amount; if (t > 100) { t *= doc['ra' + 'te']; } done({ t });", { amount: 5 }), ['amount']);
        assert.deepEqual(run("let t = doc.amount; if (t > 100) { t *= doc['ra' + 'te']; } done({ t });", { amount: 200, rate: 2 }), ['amount', 'rate']);
    });

    it('treats bare names as fields in a form formula and skips local names', () => {
        const fields = (expression, reads = []) => findPreviewScriptFields(`with (this) { return ${expression} }`, reads, [], null,
            ['amount', 'rate', 'discount', 'items', 'items.value'], true).map((read) => read.path).sort();
        assert.deepEqual(fields('amount > 100 ? amount * rate : amount - discount'), ['amount', 'discount', 'rate']);
        assert.deepEqual(fields('(() => { const rate = 2; return amount * rate; })()'), ['amount']);
        assert.deepEqual(fields('items.reduce((sum, row) => sum + row.value, 0)'), ['items.value']);
        assert.deepEqual(fields('amount + (discount || 0)'), ['amount']);
    });

    it('keeps every read when the script cannot be parsed', () => {
        const reads = [{ schema: '#S', path: 'amount', fullPath: 'amount', site: -1, listed: false }];
        assert.deepEqual(findPreviewScriptFields('done(', reads, [], '#S', paths), [{ schema: '#S', path: 'amount', fullPath: 'amount' }]);
    });
});

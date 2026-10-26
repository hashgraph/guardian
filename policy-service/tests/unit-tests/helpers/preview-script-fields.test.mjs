import assert from 'node:assert/strict';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { runPreview } from '../../../dist/policy-engine/helpers/preview.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
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
        const nested = (expression) => findPreviewScriptFields(`with (this) { return ${expression} }`, [], [], null,
            ['project', 'project.code', 'other', 'other.code'], true).map((read) => read.path).sort();
        assert.deepEqual(nested('project.code * 2'), ['project.code']);
    });

    for (const [name, body, input, expected] of [
        ['a check alone', "let t = doc.amount; if (typeof doc.rate === 'number') { t *= doc.rate; } done({ t });", { amount: 5 }, ['amount']],
        ['a check joined with &&', "let t = doc.amount; if (typeof doc.rate === 'number' && doc.amount > 1) { t *= doc.rate; } done({ t });", { amount: 5 }, ['amount']],
        ['a check joined with ||', "let t = doc.amount; if (typeof doc.rate === 'number' || doc.amount > 1) { t *= doc.rate; } done({ t });", { amount: 5 }, ['amount', 'rate']],
        ['a check with || inside brackets', "let t = doc.amount; if (typeof doc.rate === 'number' && (doc.amount > 1 || doc.amount < 0)) { t *= doc.rate; } done({ t });", { amount: 5 }, ['amount', 'rate']],
        ['a check before && in an expression', "done({ t: doc.amount + (typeof doc.rate === 'number' && doc.rate * 2) });", { amount: 1 }, ['amount']],
        ['a check before || in an expression', "done({ t: doc.amount + (doc.rate == null || doc.rate * 2) });", { amount: 1, rate: 2 }, ['amount', 'rate']]
    ]) {
        it(`protects a field only by a check without || in the condition: ${name}`, () => {
            assert.deepEqual(run(body, input), expected);
        });
    }

    it('treats every value of a chain of defaults as optional', () => {
        assert.deepEqual(run('done({ t: (doc.rate || doc.bonus || 0) + doc.amount });', { amount: 1 }), ['amount']);
        assert.deepEqual(run('done({ t: (doc.rate || doc.bonus) * doc.amount });', { amount: 1 }), ['amount', 'bonus']);
    });

    it('does not take a field of the same name for a row of the calculation result', () => {
        const script = 'result.rows = [];\nresult.rows.sort((a, b) => a.code - b.code);\nfor (let i = 0; i < result.rows.length; i++) { const row = result.rows[i]; result.t = row.code; }\nresult.total = document.amount;\ndone();';
        const tracker = new PreviewReadTracker();
        tracker.configure(script);
        tracker.startCoverage();
        let unexecuted = [];
        runInNewContext(script, {
            document: tracker.trackPolicyDocuments([{ schema: '#S', document: { credentialSubject: [{ amount: 1 }] } }])[0].document.credentialSubject[0],
            result: {},
            done() { unexecuted = tracker.takeUnexecuted(); }
        }, { filename: PREVIEW_SCRIPT_FILE });
        const fields = findPreviewScriptFields(script, tracker.takeSites(), unexecuted, '#S', paths, false, '', ['document', 'result']);
        assert.deepEqual(fields.map((read) => read.path).sort(), ['amount']);
    });

    it('still finds a field by its name when the origin of the object is unknown', () => {
        assert.deepEqual(run('function load() { return doc; }\nif (doc.amount > 100) { done({ t: load().project.code }); } else { done({ t: doc.amount }); }', { amount: 1 }), ['amount', 'project.code']);
    });

    it('does not report code that ran before an earlier done() as code that did not run', () => {
        const body = "function f(x) { return x.rate; }\nconst t = f(JSON.parse('{\"rate\":2}')) + doc.amount;\nlet u = 0; if (t > 100) { u = doc.bonus; }\ndone({ t }, false);\nif (t > 1000) { u = doc.discount; }\ndone({ t, u });";
        assert.deepEqual(run(body, { amount: 1 }), ['amount', 'bonus', 'discount']);
    });

    it('does not require the other section of a section-selecting ternary', () => {
        const body = 'const selected = doc.a ? doc.project : doc.other; done({ t: selected.code });';
        assert.deepEqual(run(body, { a: true, project: { code: 2 } }), ['a', 'project', 'project.code']);
    });

    it('still requires end fields from both sides of a ternary', () => {
        assert.deepEqual(run('done({ t: doc.a ? doc.project.code : doc.other.code });',
            { a: true, project: { code: 2 } }), ['a', 'other.code', 'project.code']);
    });

    it('keeps a runtime read of the selected section required', () => {
        assert.deepEqual(run('const selected = doc.a ? doc.project : doc.other; done(selected || null);',
            { a: false, project: { code: 2 } }), ['a', 'other']);
    });

    it('does not confuse a primitive name with the prefix of another primitive', () => {
        const source = 'done(doc.a + doc.ab)';
        const fields = findPreviewScriptFields(source, [], [[0, source.length]], '#S', ['a', 'ab']);
        assert.deepEqual(fields.map((read) => read.path).sort(), ['a', 'ab']);
    });

    it('returns the empty inner field after switching to the other section', async () => {
        const body = 'const selected = doc.a ? doc.project : doc.other; done({ t: selected.code });';
        const document = { a: false, project: { code: 2 }, other: { code: '' } };
        const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, {}, {}, async (_block, _user, _data, step) => {
            step.setPreviewSource({ schema: '#S', document, paths, dependencies: {} });
            for (const path of run(body, document)) step.addPreviewRead('#S', path);
            return new MessageResponse({});
        });
        assert.ok(response instanceof MessageError);
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.missingFields, ['other.code']);
    });

    it('keeps every read when the script cannot be parsed', () => {
        const reads = [{ schema: '#S', path: 'amount', fullPath: 'amount', site: -1, listed: false }];
        assert.deepEqual(findPreviewScriptFields('done(', reads, [], '#S', paths), [{ schema: '#S', path: 'amount', fullPath: 'amount' }]);
    });
});


describe('@unit mathjs hybrid field discovery', () => {
    const formulaPaths = ['flag', 'amount', 'owner', 'owner.name', 'buyer', 'buyer.name', 'key', 'rows', 'rows.name', 'other', 'other.name'];
    const fields = (formula, sites = []) => findPreviewScriptFields(formula, sites, [], '#S', formulaPaths, false, '', [], 'mathjs')
        .map((read) => read.path).sort();
    for (const [formula, expected] of [
        ['owner.name == "Ivan"', ['owner.name']],
        ['(owner).name == "Ivan"', ['owner.name']],
        ['(((owner))).name == "Ivan"', ['owner.name']],
        ['owner[("name")] == "Ivan"', ['owner.name']],
        ['(flag ? owner : buyer).name == "Ivan"', ['buyer.name', 'flag', 'owner.name']],
        ['flag ? owner.name : buyer.name', ['buyer.name', 'flag', 'owner.name']],
        ['owner[key] == "Ivan"', ['key', 'owner.name']],
        ['rows[1].name == "Ivan"', ['rows.name']],
        ['(rows[1]).name == "Ivan"', ['rows.name']],
        ['owner.name == "amount"', ['owner.name']],
        ['owner.name == "Ivan" and amount > 0', ['amount', 'owner.name']],
        ['c = owner; c.name == "Ivan"', ['owner.name']],
        ['f(x) = x.name; f(owner) == "Ivan"', ['owner.name']],
        ['amount ==', []]
    ]) {
        it(`finds complete paths in ${formula}`, () => assert.deepEqual(fields(formula), expected));
    }
    for (const [formula, expected] of [
        ['owner.name = "Ivan"; owner.name == "Ivan"', ['owner']],
        ['owner["name"] = "Ivan"; owner.name == "Ivan"', ['owner']],
        ['owner.name == "Ivan"; owner.name = "Ivan"', ['owner.name']],
        ['owner.name = concat(owner.name, "x"); owner.name', ['owner.name']],
        ['flag ? (owner.name = "Ivan") : 0; owner.name', ['flag', 'owner.name']],
        ['flag ? (owner.name = "Ivan") : (owner.name = "Anna"); owner.name', ['flag', 'owner']],
        ['flag ? (owner.name = "Ivan") : owner.name', ['flag', 'owner.name']],
        ['c = owner; c.name = "Ivan"; owner.name', ['owner']],
        ['flag and (owner.name = true); owner.name', ['flag', 'owner.name']],
        ['flag or (owner.name = true); owner.name', ['flag', 'owner.name']],
        ['(owner.name = true) and flag; owner.name', ['flag', 'owner']],
        ['owner[key] = "Ivan"; owner.name', ['key', 'owner.name']],
        ['f() = (owner.name = "Ivan"); f(); owner.name', ['owner.name']],
        ['rows[1].name = "Ivan"; rows[2].name', ['rows.name']],
        ['c = rows[1]; c.name = "Ivan"; rows[2].name', ['rows.name']],
        ['amount; amount = 1', ['amount']],
        ['flag ? (amount = 1) : 0; amount', ['amount', 'flag']],
        ['flag ? (amount = 1) : (amount = 2); amount', ['flag']]
    ]) {
        it(`keeps path-sensitive write-before-read requirements for ${formula}`, () => {
            assert.deepEqual(fields(formula), expected);
        });
    }

    it('handles a constant write to a deeply nested property', () => {
        const reads = findPreviewScriptFields('owner.detail.name = "Ivan"; owner.detail.name', [], [], '#S',
            ['owner', 'owner.detail', 'owner.detail.name'], false, '', [], 'mathjs');
        assert.deepEqual(reads.map((read) => read.path), ['owner.detail']);
    });

    for (const [formula, initialReads, expectedCode] of [
        ['owner.name = "Ivan"; owner.name == "Ivan"', [], 200],
        ['owner.name = "Ivan"; owner.name == "Ivan"', ['owner.name'], 422],
        ['owner.name == "Ivan"; owner.name = "Ivan"', [], 422],
        ['false and (owner.name = true); owner.name == "Ivan"', [], 422],
        ['true or (owner.name = true); owner.name == "Ivan"', [], 422]
    ]) {
        it(`validates the original form after ${formula}, prior reads ${initialReads.length}`, async () => {
            const document = { owner: { name: '' } };
            const scope = structuredClone(document);
            const tracker = new PreviewReadTracker();
            tracker.configure(formula);
            assert.notEqual(PolicyUtils.evaluateCustomFormula(formula, tracker.track(scope, '#S')), 'Incorrect formula');
            const reads = findPreviewScriptFields(formula, tracker.takeSites(), [], '#S', formulaPaths, false, '', [], 'mathjs');
            const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, {}, {}, async (_block, _user, _data, step) => {
                step.setPreviewSource({ schema: '#S', document, paths: formulaPaths, dependencies: {} });
                for (const path of initialReads) step.addPreviewRead('#S', path);
                for (const read of reads) step.addPreviewRead(read.schema, read.fullPath ?? read.path);
                return new MessageResponse({});
            });
            assert.equal(response.code, expectedCode);
            if (expectedCode === 422) assert.deepEqual(response.data.missingFields, ['owner.name']);
        });
    }

    it('merges runtime paths with fields from the other branch', () => {
        const reads = [{ schema: '#S', path: 'rows.name', fullPath: 'rows.1.name', site: -1, listed: false }];
        const actual = findPreviewScriptFields('flag ? rows[1].name : buyer.name', reads, [], '#S', formulaPaths, false, '', [], 'mathjs');
        assert.ok(actual.some((read) => read.fullPath === 'rows.1.name'));
        assert.ok(actual.some((read) => read.path === 'buyer.name'));
        assert.ok(actual.some((read) => read.path === 'flag'));
    });
    it('does not take a same-named field from another schema', () => {
        const reads = [{ schema: '#Other', path: 'other.name', site: -1, listed: false }];
        assert.deepEqual(fields('owner.name', reads), ['owner.name']);
    });
});

describe('@unit getField path bindings', () => {
    const formPaths = ['t', 't.rows', 't.rows.unit', 't.rows.deltat', 't.rows.BWPwoodyABputdt',
        't.unit', 'ccb', 'ccb.rows', 'ccb.rows.unit', 'ccb.rows.deltat', 'ccb.rows.BWPwoodyABputdt'];
    const fields = (source, known = formPaths) => findPreviewScriptFields(source, [], [[0, source.length]],
        '#S', known, false, '', ['document', 'result']).map(read => read.path).sort();

    for (const [name, value] of [
        ['direct assignment', "getField('t.rows')"],
        ['empty-array fallback', "getField('t.rows') || []"],
        ['nullish empty-array fallback', "getField('t.rows') ?? []"],
        ['indexed getter path', "getField('t.rows.0') || []"]
    ]) {
        it(`keeps the table origin through ${name}`, () => {
            const source = `const rows = ${value}; if (false) result.total = rows[0].unit;`;
            assert.deepEqual(fields(source), ['t.rows.unit']);
        });
    }

    it('keeps an inactive BWP loop on its own unit, deltat and BWPwoodyABputdt columns', () => {
        const source = "const rows = getField('t.rows') || []; for (let p = 0; p < rows.length; p++) { result.row = { pu: rows[p].unit, t_x: rows[p].deltat, stock: rows[p].BWPwoodyABputdt }; }";
        assert.deepEqual(fields(source), ['t.rows.BWPwoodyABputdt', 't.rows.deltat', 't.rows.unit']);
    });

    it('propagates a getter origin through an alias and an iterator parameter', () => {
        const source = "const rows = getField('t.rows') || []; const copy = rows; copy.forEach(row => { result.unit = row.unit; });";
        assert.deepEqual(fields(source), ['t.rows.unit']);
    });

    it('keeps both known getter origins when either fallback can supply the table', () => {
        const source = "const rows = getField('t.rows') || getField('ccb.rows') || []; result.unit = rows[0].unit;";
        assert.deepEqual(fields(source), ['ccb.rows.unit', 't.rows.unit']);
    });

    it('does not fall back to a same-named field when the getter path is outside the form', () => {
        const source = "const rows = getField('calculated.rows') || []; result.unit = rows[0].unit;";
        assert.deepEqual(fields(source), []);
    });

    for (const census of [false, true]) {
        it(`keeps runtime and inactive BWP reads precise for census=${census}`, () => {
            const script = "const rows = getField('t.rows') || []; let total = 0; if (document.census) { for (let p = 0; p < rows.length; p++) total += rows[p].unit + rows[p].deltat + rows[p].BWPwoodyABputdt; } done(total);";
            const tracker = new PreviewReadTracker();
            tracker.configure(script);
            tracker.startCoverage();
            const document = tracker.track({ census, t: { rows: census ? [{ unit: 1, deltat: 2, BWPwoodyABputdt: 3 }] : [], unit: null }, ccb: { rows: [], unit: null } }, '#S');
            let unexecuted = [];
            runInNewContext(script, {
                document,
                getField: path => path.split('.').reduce((value, key) => value?.[key], document),
                done() { unexecuted = tracker.takeUnexecuted(); }
            }, { filename: PREVIEW_SCRIPT_FILE });
            const reads = findPreviewScriptFields(script, tracker.takeSites(), unexecuted, '#S', ['census', ...formPaths], false, '', ['document', 'result']);
            const actual = reads.map(read => read.path);
            for (const path of ['t.rows.unit', 't.rows.deltat', 't.rows.BWPwoodyABputdt']) assert.ok(actual.includes(path), path);
            assert.ok(!actual.includes('t.unit'));
            assert.ok(!actual.some(path => path.startsWith('ccb.')));
        });
    }
});

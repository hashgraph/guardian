import assert from 'node:assert/strict';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { runPreview } from '../../../dist/policy-engine/helpers/preview.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { runInNewContext } from 'node:vm';
import { findPreviewScriptFields } from '../../../dist/policy-engine/helpers/preview-script-fields.js';
import { PREVIEW_SCRIPT_FILE, PreviewReadTracker } from '../../../dist/policy-engine/helpers/workers/preview-read-tracker.js';
import { trackPreviewFormulaScope } from '../../../dist/policy-engine/helpers/preview.js';

const paths = ['amount', 'bonus', 'rate', 'discount', 'diesel', 'factor', 'secret', 'total', 'calc', 'calc.total',
    'a', 'c', 'k', 'v', 'e', 'rows', 'rows.value', 'note', 'project', 'project.code', 'other', 'other.code'];

const run = (body, input, sources = [], known = paths) => {
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
    return findPreviewScriptFields(script, tracker.takeSites(), unexecuted, '#S', known).map((read) => read.path).sort();
};

describe('@unit findPreviewScriptFields', () => {
    for (const [name, body, input, expected] of [
        ['a consumed indexed assignment with {}', 'const key=["am","ount"].join("");const cache={};done({t:(cache[key]=doc[key])>0?5:7});', {}, ['amount']],
        ['a consumed indexed assignment with { amount: 0 }', 'const key=["am","ount"].join("");const cache={};done({t:(cache[key]=doc[key])>0?5:7});', { amount: 0 }, ['amount']],
        ['a consumed indexed assignment with { amount: 3 }', 'const key=["am","ount"].join("");const cache={};done({t:(cache[key]=doc[key])>0?5:7});', { amount: 3 }, ['amount']],
        ['a consumed indexed assignment after listing with {}', 'debug(Object.keys(doc));const key=["am","ount"].join("");const cache={};done({t:(cache[key]=doc[key])>0?5:7});', {}, ['amount']],
        ['a consumed indexed assignment after listing with { amount: 0 }', 'debug(Object.keys(doc));const key=["am","ount"].join("");const cache={};done({t:(cache[key]=doc[key])>0?5:7});', { amount: 0 }, ['amount']],
        ['a consumed indexed assignment after listing with { amount: 3 }', 'debug(Object.keys(doc));const key=["am","ount"].join("");const cache={};done({t:(cache[key]=doc[key])>0?5:7});', { amount: 3 }, ['amount']],
        ['a selected field without enumeration with {}', 'const key=["am","ount"].join("");const selected={};selected[key]=doc[key];done({t:selected[key]*2});', {}, ['amount']],
        ['a selected field without enumeration with { amount: 0 }', 'const key=["am","ount"].join("");const selected={};selected[key]=doc[key];done({t:selected[key]*2});', { amount: 0 }, ['amount']],
        ['a selected field without enumeration with { amount: 3 }', 'const key=["am","ount"].join("");const selected={};selected[key]=doc[key];done({t:selected[key]*2});', { amount: 3 }, ['amount']],
        ['a selected input after unrelated key enumeration with {}', 'debug(Object.keys(doc));const key=["am","ount"].join("");const cache={};cache[key]=doc[key];done({t:cache[key]>0?5:7});', {}, ['amount']],
        ['a selected input after unrelated key enumeration with { amount: 0 }', 'debug(Object.keys(doc));const key=["am","ount"].join("");const cache={};cache[key]=doc[key];done({t:cache[key]>0?5:7});', { amount: 0 }, ['amount']],
        ['a selected input after unrelated key enumeration with { amount: 3 }', 'debug(Object.keys(doc));const key=["am","ount"].join("");const cache={};cache[key]=doc[key];done({t:cache[key]>0?5:7});', { amount: 3 }, ['amount']],
        ['a selected missing input after a key-count guard', '(()=>{if(!Object.keys(doc).length)return done(null);const key=["am","ount"].join("");const tmp={};tmp[key]=doc[key];done({t:tmp[key]>0?5:7});})();', { note: 'filled' }, ['amount']],
        ['a selected missing input after JSON serialization', 'debug(JSON.stringify(doc));const key=["am","ount"].join("");const tmp={};tmp[key]=doc[key];done({t:tmp[key]>0?5:7});', { note: 'filled' }, ['amount']],
        ['a read by name', 'done({ t: doc.amount * 2 });', { amount: 1 }, ['amount']],
        ['logging the whole document', 'debug(JSON.stringify(doc)); done({ t: doc.amount * 2 });', { amount: 1, bonus: 2, note: 'x' }, ['amount']],
        ['a spread copy used by name', 'const c = { ...doc }; done({ t: c.amount * 2 });', { amount: 1, bonus: 2, note: 'x' }, ['amount']],
        ['a copy loop over saved document keys', 'const keys=Object.keys(doc);const c={};for(const k of keys)c[k]=doc[k];done({t:c.amount*2});', { amount: 5, note: 'x' }, ['amount']],
        ['a copy loop over an alias of saved document keys', 'const keys=Object.keys(doc);const selected=keys;const c={};for(const k of selected)c[k]=doc[k];done({t:c.amount*2});', { amount: 5, note: 'x' }, ['amount']],
        ['an unused copy loop over saved document keys', 'const keys=Object.keys(doc);const c={};for(const k of keys)c[k]=doc[k];done({t:1});', { amount: 5, note: 'x' }, []],
        ['a selected read after copying saved document keys', 'const keys=Object.keys(doc);const c={};for(const k of keys)c[k]=doc[k];const key=["ra","te"].join("");const selected={};selected[key]=doc[key];done({t:c.amount*selected[key]});', { amount: 5, rate: 2, note: 'x' }, ['amount', 'rate']],
        ['a key-copy forEach with an expression callback', 'const c={};Object.keys(doc).forEach(k=>c[k]=doc[k]);done({t:c.amount*2});', { amount: 5, note: 'x' }, ['amount']],
        ['a key-copy forEach with a block callback', 'const c={};Object.keys(doc).forEach(k=>{c[k]=doc[k];});done({t:c.amount*2});', { amount: 5, note: 'x' }, ['amount']],
        ['a renamed copy key inside a loop', 'const c={};for(const k of Object.keys(doc)){const key=k;c[key]=doc[key];}done({t:c.amount*2});', { amount: 5, note: 'x' }, ['amount']],
        ['different aliases of a copy key', 'const c={};for(const k of Object.keys(doc)){const key=k;c[key]=doc[k];}done({t:c.amount*2});', { amount: 5, note: 'x' }, ['amount']],
        ['saved keys and a renamed callback key', 'const keys=Object.keys(doc);const c={};keys.forEach(k=>{const key=k;c[key]=doc[key];});done({t:c.amount*2});', { amount: 5, note: 'x' }, ['amount']],
        ['a key copy loop used by name', 'const c = {}; for (const k of Object.keys(doc)) c[k] = doc[k]; done({ t: c.amount });', { amount: 1, note: 'x' }, ['amount']],
        ['a for-in copy used by name', 'const c = {}; for (const k in doc) c[k] = doc[k]; done({ t: c.amount * 2 });', { amount: 1, note: 'x' }, ['amount']],
        ['a key built at run time', "const f = 'ra' + 'te'; done({ t: doc[f] * 2 });", { rate: 1 }, ['rate']],
        ['a dynamic calculation read after logging keys', 'debug(Object.keys(doc)); const key = ["amo", "unt"].join(""); done({ t: doc[key] > 0 ? 5 : 7 });', {}, ['amount']],
        ['a supplied dynamic calculation read after logging keys', 'debug(Object.keys(doc)); const key = ["amo", "unt"].join(""); done({ t: doc[key] * 2 });', { amount: 5, note: 'x' }, ['amount']],
        ['a zero dynamic calculation read after logging keys', 'debug(Object.keys(doc)); const key = ["amo", "unt"].join(""); done({ t: doc[key] * 2 });', { amount: 0, note: 'x' }, ['amount']],
        ['a copy followed by a separate dynamic calculation read', 'const c = {}; for (const k of Object.keys(doc)) c[k] = doc[k]; const key = ["amo", "unt"].join(""); done({ t: doc[key] * 2 });', { amount: 5, note: 'x' }, ['amount']],
        ['a guarded numeric rewrite after enumeration', 'for (const key of Object.keys(doc)) { if (typeof doc[key] === "number") { doc[key] = isFinite(doc[key]) ? doc[key] : 0; } } done({ t: 1 });', { amount: 5, note: 'x' }, []],
        ['only the branch that ran and not the helper it skipped',
            'function fuel(d) { return d.diesel * d.factor; }\nlet t;\nif (doc.amount > 100) { t = fuel(doc) + doc.rate; } else { t = doc.amount - (doc.discount || 0); }\ndone({ t });',
            { amount: 5 }, ['amount']],
        ['the helper the branch that ran calls',
            'function fuel(d) { return d.diesel * d.factor; }\nlet t;\nif (doc.amount > 100) { t = fuel(doc) + doc.rate; } else { t = doc.amount - (doc.discount || 0); }\ndone({ t });',
            { amount: 200 }, ['amount', 'diesel', 'factor', 'rate']],
        ['a helper nothing calls', 'function unused(d) { return d.secret; }\ndone({ t: doc.amount });', { amount: 5 }, ['amount']],
        ['a default and a destructuring default', 'const { bonus = 0 } = doc; done({ t: doc.amount + (doc.rate ?? 1) + bonus });', { amount: 1 }, ['amount']],
        ['typeof, == null and in', "const b = typeof doc.bonus === 'number' ? 1 : 0; const r = doc.rate == null ? 0 : 1; const n = 'note' in doc; done({ t: b + r + n + doc.amount });", { amount: 1 }, ['amount']],
        ['a read guarded by a check of the same field', "const t = typeof doc.bonus === 'undefined' ? doc.amount : doc.amount + doc.bonus; done({ t });", { amount: 1 }, ['amount']],
        ['a comparison is not a guard', 'let t = 0; if (doc.amount > 100) { t = doc.amount * doc.rate; } done({ t });', { amount: 200 }, ['amount', 'rate']],
        ['a check of another object is not a guard', 'const row = { bonus: 1 }; let t = doc.amount; if (row.bonus) { t += doc.bonus; } done({ t });', { amount: 5 }, ['amount', 'bonus']],
        ['rows of a table', 'let t = 0; doc.rows.forEach((row) => { t += row.value; }); done({ t });', { rows: [{ value: 1 }] }, ['rows.value']],
        ['rows of an empty table', 'let t = 0; for (const row of doc.rows) { t += row.value; } done({ t });', { rows: [] }, []],
        ['a nested write', 'doc.calc = {}; doc.calc.total = doc.a * 2; done(documents[0]);', { a: 1 }, ['a']],
        ['an output written in a branch that did not run', 'if (doc.c) doc.total = doc.a; done(documents[0]);', { c: false, a: 1 }, ['c']],
        ['a destructuring assignment in a branch that did not run', 'let le; if (doc.k) { [le] = [doc.v]; } else { le = 0; } doc.e = le; done(documents[0]);', { k: false, v: 1 }, ['k']],
        ['a value method on a field', 'done({ t: doc.rate.toFixed(2) });', { rate: 1 }, ['rate']],
        ['a sub-object walked to its field', 'done({ t: doc.project.code });', { project: { code: 'x' } }, ['project.code']],
        ['the same key in another sub-object', 'const p = doc.project; done({ t: p.code });', { project: { code: 'x' }, other: { code: 'y' } }, ['project', 'project.code']],
        ['the same key in another sub-object of a copy', 'const c = { ...doc.project }; done({ t: c.code });', { project: { code: 'x' }, other: { code: 'y' } }, ['project', 'project.code']],
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

    it('does not take names from a form formula without runtime reads', () => {
        const fields = (expression) => findPreviewScriptFields(`with (this) { return ${expression} }`, [], [], null,
            ['amount', 'rate', 'discount', 'items', 'items.value'], true).map((read) => read.path).sort();
        assert.deepEqual(fields('amount > 100 ? amount * rate : amount - discount'), []);
        assert.deepEqual(fields('items.reduce((sum, row) => sum + row.value, 0)'), []);
    });

    for (const [name, body, input, expected] of [
        ['a check alone', "let t = doc.amount; if (typeof doc.rate === 'number') { t *= doc.rate; } done({ t });", { amount: 5 }, ['amount']],
        ['a check joined with &&', "let t = doc.amount; if (typeof doc.rate === 'number' && doc.amount > 1) { t *= doc.rate; } done({ t });", { amount: 5 }, ['amount']],
        ['a check joined with ||', "let t = doc.amount; if (typeof doc.rate === 'number' || doc.amount > 1) { t *= doc.rate; } done({ t });", { amount: 5 }, ['amount', 'rate']],
        ['a check with || inside brackets', "let t = doc.amount; if (typeof doc.rate === 'number' && (doc.amount > 1 || doc.amount < 0)) { t *= doc.rate; } done({ t });", { amount: 5 }, ['amount']],
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
        assert.deepEqual(run('function load() { return doc; }\nif (doc.amount > 100) { done({ t: load().project.code }); } else { done({ t: doc.amount }); }', { amount: 200, project: { code: 'x' } }), ['amount', 'project.code']);
    });

    it('does not report code that ran before an earlier done() as code that did not run', () => {
        const body = "function f(x) { return x.rate; }\nconst t = f(JSON.parse('{\"rate\":2}')) + doc.amount;\nlet u = 0; if (t > 100) { u = doc.bonus; }\ndone({ t }, false);\nif (t > 1000) { u = doc.discount; }\ndone({ t, u });";
        assert.deepEqual(run(body, { amount: 1 }), ['amount']);
    });

    it('does not require the other section of a section-selecting ternary', () => {
        const body = 'const selected = doc.a ? doc.project : doc.other; done({ t: selected.code });';
        assert.deepEqual(run(body, { a: true, project: { code: 2 } }), ['a', 'project', 'project.code']);
    });

    it('requires only the end field of the side of a ternary that ran', () => {
        assert.deepEqual(run('done({ t: doc.a ? doc.project.code : doc.other.code });',
            { a: true, project: { code: 2 } }), ['a', 'project.code']);
    });

    it('keeps a runtime read of the selected section required', () => {
        assert.deepEqual(run('const selected = doc.a ? doc.project : doc.other; done(selected || null);',
            { a: false, project: { code: 2 } }), ['a', 'other']);
    });

    it('does not confuse a primitive name with the prefix of another primitive', () => {
        assert.deepEqual(run('done({ t: doc.a + doc.ab });', { a: 1, ab: 2 }, [], ['a', 'ab']), ['a', 'ab']);
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
    const data = { flag: true, amount: 5, owner: { name: 'Ivan' }, buyer: { name: 'Anna' }, key: 'name', rows: [{ name: 'a' }, { name: 'b' }] };
    const fields = (formula, scope = data) => {
        const tracker = new PreviewReadTracker();
        tracker.configure(formula);
        PolicyUtils.evaluateCustomFormula(formula, trackPreviewFormulaScope(tracker, structuredClone(scope), '#S', formulaPaths));
        return [...new Set(findPreviewScriptFields(formula, tracker.takeSites(), [], '#S', formulaPaths, false, '', [], 'mathjs')
            .map((read) => read.path))].sort();
    };
    for (const [formula, expected] of [
        ['owner.name == "Ivan"', ['owner.name']],
        ['(owner).name == "Ivan"', ['owner.name']],
        ['owner[("name")] == "Ivan"', ['owner.name']],
        ['(flag ? owner : buyer).name == "Ivan"', ['flag', 'owner.name']],
        ['flag ? owner.name : buyer.name', ['flag', 'owner.name']],
        ['owner[key] == "Ivan"', ['key', 'owner.name']],
        ['rows[1].name == "a"', ['rows.name']],
        ['owner.name == "amount"', ['owner.name']],
        ['owner.name == "Ivan" and amount > 0', ['amount', 'owner.name']],
        ['f(x) = x.name; f(owner) == "Ivan"', ['owner.name']],
        ['amount ==', []]
    ]) {
        it(`finds the complete paths the formula read in ${formula}`, () => assert.deepEqual(fields(formula), expected));
    }

    it('records an absent field the formula asked for and nothing from the part that did not run', () => {
        assert.deepEqual(fields('amount > 2', {}), ['amount']);
        assert.deepEqual(fields('flag ? amount : buyer.name', { flag: false, buyer: { name: 'x' } }), ['buyer.name', 'flag']);
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

    it('keeps the indexed runtime path of the branch that ran', () => {
        const reads = [{ schema: '#S', path: 'rows.name', fullPath: 'rows.1.name', site: -1, listed: false }];
        const actual = findPreviewScriptFields('flag ? rows[1].name : buyer.name', reads, [], '#S', formulaPaths, false, '', [], 'mathjs');
        assert.deepEqual(actual.map((read) => read.fullPath), ['rows.1.name']);
    });

    it('does not take a same-named field from another schema', () => {
        const reads = [{ schema: '#S', path: 'owner.name', site: -1, listed: false }, { schema: '#Other', path: 'other.name', site: -1, listed: false }];
        assert.deepEqual(findPreviewScriptFields('owner.name', reads, [], '#S', formulaPaths, false, '', [], 'mathjs').map((read) => read.path), ['owner.name']);
    });
});

describe('@unit getField path bindings', () => {
    const formPaths = ['t', 't.rows', 't.rows.unit', 't.rows.deltat', 't.rows.BWPwoodyABputdt',
        't.unit', 'ccb', 'ccb.rows', 'ccb.rows.unit', 'ccb.rows.deltat', 'ccb.rows.BWPwoodyABputdt'];
    const fields = (source, known = formPaths) => findPreviewScriptFields(source, [], [[0, source.length]],
        '#S', known, false, '', ['document', 'result']).map(read => read.path).sort();

    it('does not fall back to a same-named field when the getter path is outside the form', () => {
        const source = "const rows = getField('calculated.rows') || []; result.unit = rows[0].unit;";
        assert.deepEqual(fields(source), []);
    });

    for (const census of [false, true]) {
        it(`requires the BWP columns only when their loop runs, census=${census}`, () => {
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
            for (const path of ['t.rows.unit', 't.rows.deltat', 't.rows.BWPwoodyABputdt']) assert.equal(actual.includes(path), census, path);
            assert.ok(!actual.includes('t.unit'));
            assert.ok(!actual.some(path => path.startsWith('ccb.')));
        });
    }

    const getterReads = (script) => {
        const tracker = new PreviewReadTracker();
        tracker.configure(script);
        tracker.startCoverage();
        const document = tracker.track({ amount: 2, loc: { lat: 1 } }, '#S');
        runInNewContext(script, {
            document,
            result: {},
            getField: path => tracker.trackField(path.split('.').reduce((value, key) => value?.[key], document), path)
        }, { filename: PREVIEW_SCRIPT_FILE });
        return [...new Set(findPreviewScriptFields(script, tracker.takeSites(), tracker.takeUnexecuted(), '#S', ['amount', 'projectTitle', 'type', 'rate', 'loc', 'loc.lat'],
            false, '', ['document', 'result']).map(read => read.path))].sort();
    };

    for (const [name, script] of [
        ['a fallback on another line', "const projectTitle = getField('projectTitle')\n    || '';\nresult.projectTitle = projectTitle;"],
        ['a nullish fallback', "result.rate = getField('rate') ?? 1;"],
        ['a chain of getter fallbacks', "result.type = getField('type') || getField('rate') || '';"],
        ['a typeof check', "result.rate = typeof getField('rate') === 'number' ? 1 : 0;"],
        ['a computed path with a fallback', "const key = 'ra' + 'te'; result.rate = getField(key) || 0;"],
        ['an aliased getter with a fallback', "const read = getField; result.rate = read('rate') ?? 0;"],
        ['an optional call with a fallback', "result.rate = getField?.('rate') || 0;"],
        ['two fallbacks of the same path', "const a = getField('rate') || 1; const b = getField('ra' + 'te') ?? 2; result.rate = a + b;"]
    ]) {
        it(`does not require a getter read only through ${name}`, () => {
            assert.deepEqual(getterReads(`${script}\nresult.total = document.amount * 2;`), ['amount']);
        });
    }

    for (const [name, script, expected] of [
        ['a direct use', "result.total = getField('rate') * 2;", ['rate']],
        ['a direct copy', "result.projectTitle = getField('projectTitle');", ['projectTitle']],
        ['a fallback and a direct use of the same path', "const a = getField('rate') || 1; result.total = getField('rate') * a;", ['rate']],
        ['a nested read through the getter', "result.total = getField('loc').lat * 2;", ['loc', 'loc.lat']],
        ['a computed getter path', "const key = 'ra' + 'te'; result.value = getField(key);", ['rate']],
        ['a fallback and a direct read through a computed path', "const a = getField('rate') || 0; const key = 'ra' + 'te'; result.value = getField(key);", ['rate']],
        ['a fallback and a direct read through an aliased getter', "const a = getField('rate') || 0; const read = getField; result.value = read('rate');", ['rate']],
        ['a fallback and a direct read through a wrapper', "const a = getField('rate') || 0; function read(key) { return getField(key); } result.value = read('rate');", ['rate']],
        ['a wrapper with a fallback outside it', "function read(key) { return getField(key); } result.rate = read('rate') || 0;", ['rate']],
        ['a getter passed to an array method', "result.values = ['rate'].map(getField);", ['rate']],
        ['a fallback title next to a computed date path', "const prefix = 'loc'; const projectTitle = getField('projectTitle') || '';\nresult.lat = getField(prefix + '.lat');\nresult.projectTitle = projectTitle;", ['loc.lat']]
    ]) {
        it(`still requires a getter read through ${name}`, () => {
            assert.deepEqual(getterReads(script), expected);
        });
    }
});

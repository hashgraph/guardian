import assert from 'node:assert/strict';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { ArtifactType } from '@guardian/interfaces';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { runPreview, setPreviewComputed, setPreviewDocumentSchema } from '../../../dist/policy-engine/helpers/preview.js';
import { makeBlock, makeUser } from './_block-exec-harness.mjs';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

describe('@unit customLogicBlock preview', () => {
    let origBlockErrorFn;
    let uiErrors;

    beforeEach(() => {
        uiErrors = [];
        origBlockErrorFn = PolicyComponentsUtils.BlockErrorFn;
        PolicyComponentsUtils.BlockErrorFn = async (...args) => { uiErrors.push(args); };
    });

    afterEach(() => {
        PolicyComponentsUtils.BlockErrorFn = origBlockErrorFn;
    });

    const setup = (execute) => {
        const { block, components } = makeBlock(CustomLogicBlock, { options: { onErrorAction: 'no-action' } });
        const events = [];
        block.triggerEvents = async (...args) => { events.push(args); };
        block.execute = execute;
        return { block, components, events };
    };

    const makeEvent = (actionStatus) => ({
        data: { data: { foo: 1 } },
        user: makeUser({ userId: 'u1' }),
        actionStatus,
    });

    const previewStep = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);

    it('collects a script error on the preview step without telling the UI, and follows the error link', async () => {
        const step = previewStep();
        const { block, components, events } = setup(async () => { throw new Error('script failed'); });
        await block.runAction(makeEvent(step));
        assert.deepEqual(step.getErrors().map((error) => error.message), ['script failed']);
        assert.deepEqual(step.getErrors().map((error) => error.blockType), ['customLogicBlock']);
        assert.equal(uiErrors.length, 0);
        assert.deepEqual(events.map((event) => [event[0], event[3]]), [['ErrorEvent', step]]);
        assert.equal(components.__logs.filter(([level]) => level === 'error').length, 0);
    });

    it('follows no error link during field discovery', async () => {
        const step = previewStep();
        step.setPreviewSource({ schema: '#S', document: {}, paths: [], dependencies: {}, discovery: true });
        const { block, events } = setup(async () => { throw new Error('script failed'); });
        await block.runAction(makeEvent(step));
        assert.equal(step.getErrors().length, 1);
        assert.deepEqual(events, []);
    });

    it('allows optional defaults and empty-list sums but rejects a non-finite worker result', async function () {
        this.timeout(20000);
        for (const expression of ['done({ total: doc.amount * 2 + (doc.bonus || 0) });',
            'done({ total: doc.rows.reduce((sum, row) => sum + row, 0) });',
            'done({ total: doc.bonus * 2 });']) {
            const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, makeUser(), {}, async (_block, user, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: { amount: 5, rows: [] },
                    paths: ['amount', 'bonus', 'rows'], dependencies: {} });
                const { block } = makeBlock(CustomLogicBlock, { options: { unsigned: true,
                    expression: 'const doc = documents[0].document.credentialSubject[0]; ' + expression } });
                block.triggerEvents = async (type, _user, state) => {
                    if (type === 'RunEvent') {
                        step.addPreviewDocument('script', null, state);
                    }
                };
                await block.runAction({ user, data: { data: { schema: '#S',
                    document: { credentialSubject: [{ amount: 5, rows: [] }] } } }, actionStatus: step });
                return new MessageResponse({});
            });
            if (expression.includes('doc.bonus * 2')) {
                assert.ok(response instanceof MessageError);
                assert.equal(response.code, 422);
                assert.deepEqual(response.data.missingFields, ['bonus']);
                assert.equal(response.body, null);
            } else {
                assert.ok(response instanceof MessageResponse);
                const subject = response.body.documents[0].document.document.credentialSubject[0];
                assert.equal(subject.total, expression.includes('reduce') ? 0 : 10);
                assert.deepEqual(response.body.errors, []);
            }
        }
    });

    const conditionalExpression = 'const doc = documents[0].document.credentialSubject[0]; '
        + 'doc.total = doc.amount > 100 ? doc.amount * doc.rate : doc.amount - doc.discount; done(documents[0]);';

    const executeConditional = async ({ amount = 5, discovery = true, expression = conditionalExpression, artifacts = [], computed = [], inputSchema = '#S', nextExpression = null, values = { amount, rate: 2, discount: 1 }, paths = ['amount', 'rate', 'discount', 'unused'] } = {}) => {
        const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, makeUser(), { previewFields: discovery },
            async (_block, user, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: discovery ? { amount } : { amount, rate: 2, discount: 1 },
                    paths, dependencies: {}, discovery });
                const item = setPreviewComputed(setPreviewDocumentSchema({ schema: inputSchema,
                    document: { credentialSubject: [values] } }, inputSchema), computed);
                const { block } = makeBlock(CustomLogicBlock, { options: { unsigned: true, passOriginal: true, expression, artifacts } });
                block.triggerEvents = async (type, _user, state) => {
                    if (type !== 'RunEvent') return;
                    if (nextExpression) {
                        const { block: next } = makeBlock(CustomLogicBlock, { options: { unsigned: true, passOriginal: true, expression: nextExpression } });
                        next.triggerEvents = async (nextType, _nextUser, nextState) => {
                            if (nextType === 'RunEvent') step.addPreviewDocument('next-script', null, nextState);
                        };
                        await next.runAction({ user, data: state, actionStatus: step });
                    } else step.addPreviewDocument('script', null, state);
                };
                await block.runAction({ user, data: { data: item }, actionStatus: step });
                return new MessageResponse({});
            });
        assert.ok(response instanceof MessageResponse);
        assert.deepEqual(response.body.errors, []);
        return response.body;
    };

    for (const calculation of [
        'let x=doc.amount;while(true){x=x/2;if(x<1)break}doc.total=x;',
        'let x=doc.amount;for(;;){x=x/2;if(x<1)break}doc.total=x;',
        'function fact(n){return n<2?1:n*fact(n-1)}doc.total=fact(doc.amount);',
    ]) {
        it(`discovers downstream inputs after data-dependent script control flow: ${calculation}`, async function () {
            this.timeout(20000);
            const result = await executeConditional({
                expression: 'const doc=documents[0].document.credentialSubject[0];' + calculation + 'done(documents[0]);',
                nextExpression: 'const doc=documents[0].document.credentialSubject[0];doc.next=doc.rate*2;done(documents[0]);' });
            assert.deepEqual(result.fields, ['amount', 'rate']);
            assert.equal(result.documents[0].document.document.credentialSubject[0].next, 4);
        });
    }

    for (const preparation of ['const c={...doc};', 'const c=Object.assign({},doc);',
        'const {...c}=doc;', 'debug(JSON.stringify(doc));const c=doc;']) {
        it(`requires only consumed copied values in worker discovery: ${preparation}`, async function () {
            this.timeout(20000);
            const result = await executeConditional({ expression: 'const doc=documents[0].document.credentialSubject[0];'
                + preparation + 'doc.total=c.amount*2;done(documents[0]);' });
            assert.deepEqual(result.fields, ['amount']);
            assert.equal(result.documents[0].document.document.credentialSubject[0].total, 10);
        });
    }

    for (const expression of [
        "let total=0;for(let i=1;i<=doc.count;i++)total+=doc['year'+i];doc.total=total;",
        "let total=0;for(const [k,v] of Object.entries(doc))if(k.startsWith('year'))total+=v;doc.total=total;",
    ]) {
        it(`requires fields read by a built key and not fields found only by listing keys: ${expression}`, async function () {
            this.timeout(20000);
            const result = await executeConditional({ expression: 'const doc=documents[0].document.credentialSubject[0];'
                + expression + 'done(documents[0]);', values: { count: 3, year1: 10, year2: 20, year3: 30, unused: 99 },
                paths: ['count', 'year1', 'year2', 'year3', 'unused'] });
            assert.deepEqual(result.fields, expression.includes('doc.count') ? ['count', 'year1', 'year2', 'year3'] : []);
            assert.equal(result.documents[0].document.document.credentialSubject[0].total, 60);
        });
    }

    for (const [name, calculation, expectedFields, expectedTotal] of [["values index", "doc.total=Object.values(doc)[0]*2;", [], 10], ["entries index", "doc.total=Object.entries(doc)[0][1]*2;", [], 10], ["copied key count", "doc.total=Object.keys({...doc}).length;", [], 5], ["copy before source overwrite", "const c={...doc};doc.rate=2;doc.total=c.rate*doc.amount;", ["amount", "rate"], 15], ["consumed JSON", "doc.total=JSON.stringify(doc).length;", [], 58], ["debug JSON", "debug(JSON.stringify(doc));doc.total=doc.amount*2;", ["amount"], 10], ["unused copy", "const c={...doc};doc.total=doc.amount*2;", ["amount"], 10], ["frozen serialized value", "const text=JSON.stringify(doc);doc.rate=2;doc.total=text.length;", [], 58], ["frozen values", "const c=Object.values(doc);doc.amount=2;doc.total=c[0]*2;", [], 10]]) {
        it(`requires a field read by a whole-object operation only when its name is used: ${name}`, async function () {
            this.timeout(20000);
            const result = await executeConditional({ expression: 'const doc=documents[0].document.credentialSubject[0];'
                + calculation + 'done(documents[0]);', values: { amount: 5, rate: 3, discount: 1, unused: 99, kind: 'te' },
                paths: ['amount', 'rate', 'discount', 'unused', 'kind'] });
            assert.deepEqual(result.fields, expectedFields);
            assert.equal(result.documents[0].document.document.credentialSubject[0].total, expectedTotal);
        });
    }

    for (const preparation of ['', 'const c={...doc};', 'debug(JSON.stringify(doc));']) {
        it(`retains an explicit same-expression input beyond the old work limit: ${preparation}`, async function () {
            this.timeout(20000);
            const items = new Array(100010).fill('0').join(',');
            const result = await executeConditional({ expression: 'const doc=documents[0].document.credentialSubject[0];'
                + preparation + `doc.total=[${items}].length*doc.rate;done(documents[0]);` });
            assert.deepEqual(result.fields, ['rate']);
            assert.equal(result.documents[0].document.document.credentialSubject[0].total, 200020);
        });
    }

    for(const [name,calculation,expectedFields,expectedTotal] of [
        ["replaceAll debug", "debug(JSON.stringify(doc).replaceAll('a','b'));doc.total=doc.amount*2;", ["amount"], 10],
        ["split join debug", "debug(JSON.stringify(doc).split(',').join(';'));doc.total=doc.amount*2;", ["amount"], 10],
        ["whitelisted JSON", "doc.total=JSON.stringify(doc,['amount']).length;", [], 12],
        ["numeric debug", "debug(JSON.stringify(doc).length*2);doc.total=doc.amount*2;", ["amount"], 10],
        ["predicate debug", "debug(JSON.stringify(doc).includes('a'));doc.total=doc.amount*2;", ["amount"], 10],
        ["local logger", "function log(v){}log(JSON.stringify(doc).replaceAll('a','b'));doc.total=doc.amount*2;", ["amount"], 10],
        ["consumed replacement", "doc.total=JSON.stringify(doc).replaceAll('a','b').length;", [], 58],
        ["consumed split join", "doc.total=JSON.stringify(doc).split(',').join(';').length;", [], 58],
        ["empty JSON whitelist", "doc.total=JSON.stringify(doc,[]).length;", [], 2],
        ["whitelist alias", "const keys=['amount'];doc.total=JSON.stringify(doc,keys).length;", [], 12],
        ["whitelist snapshot", "const text=JSON.stringify(doc,['rate']);doc.rate=2;doc.total=text.length;", [], 10],
    ]){
        it(`does not require fields that only serialized or logged JSON reads: ${name}`,async function(){
            this.timeout(20000);
            const result=await executeConditional({expression:'const doc=documents[0].document.credentialSubject[0];'+calculation+'done(documents[0]);',
                values:{amount:5,rate:3,discount:1,unused:99,kind:'te'},paths:['amount','rate','discount','unused','kind']});
            assert.deepEqual(result.fields,expectedFields);
            assert.equal(result.documents[0].document.document.credentialSubject[0].total,expectedTotal);
        });
    }
    it('retains a late input after four nested counted loops through the real worker',async function(){
        this.timeout(20000);
        const loops='let s=0;'+Array.from({length:4},(_,i)=>`for(let i${i}=0;i${i}<32;i${i}++){`).join('')+'s++;'+'}'.repeat(4);
        const result=await executeConditional({expression:'const doc=documents[0].document.credentialSubject[0];'+loops+'doc.total=s*doc.rate;done(documents[0]);'});
        assert.deepEqual(result.fields,['rate']);
        assert.equal(result.documents[0].document.document.credentialSubject[0].total,2097152);
    });

    for (const amount of [5, 200]) {
        it(`discovers inputs in both JavaScript branches with the real worker for amount=${amount}`, async function () {
            this.timeout(20000);
            const result = await executeConditional({ amount });
            assert.deepEqual(result.fields, ['amount', 'discount', 'rate']);
            assert.deepEqual(result.missingFields, ['discount', 'rate']);
            assert.equal(result.documents[0].document.document.credentialSubject[0].total,
                amount > 100 ? amount * 2 : amount - 1);
        });
    }

    for (const amount of [5, 200]) {
        it(`finds a constructed field name only when its branch runs, for amount=${amount}`, async function () {
            this.timeout(20000);
            const result = await executeConditional({ amount,
                expression: 'const doc = documents[0].document.credentialSubject[0]; '
                    + "doc.total = doc.amount > 100 ? doc.amount * doc['ra' + 'te'] : doc.amount; done(documents[0]);" });
            assert.deepEqual(result.fields, amount > 100 ? ['amount', 'rate'] : ['amount']);
            assert.equal(result.documents[0].document.document.credentialSubject[0].total, amount > 100 ? amount * 2 : amount);
        });
    }

    it('ignores unrelated names and write-only output fields during initial discovery', async function () {
        this.timeout(20000);
        const result = await executeConditional({
            expression: 'const doc = documents[0].document.credentialSubject[0]; '
                + "const rate=2; const label='discount unused'; function unused(){return doc.unused}; "
                + 'doc.total=doc.amount*rate;done(documents[0]);' });
        assert.deepEqual(result.fields, ['amount']);
        assert.deepEqual(result.missingFields, []);
        assert.equal(result.documents[0].document.document.credentialSubject[0].total, 10);
    });

    it('discovers fields in executable artifacts before running their selected branch', async function () {
        this.timeout(20000);
        const original = PolicyUtils.getArtifactFile;
        PolicyUtils.getArtifactFile = async (_ref, id) => {
            assert.equal(id, 'branch-library');
            return 'function compute(doc) { return doc.amount > 100 ? doc.amount * doc.rate : doc.amount; }';
        };
        try {
            const result = await executeConditional({ artifacts: [{ type: ArtifactType.EXECUTABLE_CODE, uuid: 'branch-library' }],
                expression: 'const doc = documents[0].document.credentialSubject[0]; doc.total = compute(doc); done(documents[0]);' });
            assert.deepEqual(result.fields, ['amount', 'rate']);
            assert.deepEqual(result.missingFields, ['rate']);
            assert.equal(result.documents[0].document.document.credentialSubject[0].total, 5);
        } finally {
            PolicyUtils.getArtifactFile = original;
        }
    });

    it('keeps fields produced by earlier blocks out of conservative input requirements', async function () {
        this.timeout(20000);
        const result = await executeConditional({ computed: ['rate'],
            expression: 'const doc = documents[0].document.credentialSubject[0]; '
                + 'doc.total = doc.amount > 100 ? doc.amount * doc.rate : doc.amount; done(documents[0]);' });
        assert.deepEqual(result.fields, ['amount']);
        assert.deepEqual(result.missingFields, []);
    });

    for (const inputSchema of ['#Other', null]) {
        it(`keeps the conservative schema boundary for input schema ${inputSchema}`, async function () {
            this.timeout(20000);
            const result = await executeConditional({ inputSchema });
            assert.deepEqual(result.fields, inputSchema ? [] : ['amount', 'discount', 'rate']);
        });
    }

    it('requires the same fields in real preview as in discovery', async function () {
        this.timeout(20000);
        const result = await executeConditional({ discovery: false });
        assert.deepEqual(result.fields, ['amount', 'discount', 'rate']);
        assert.deepEqual(result.missingFields, []);
        assert.equal(result.documents[0].document.document.credentialSubject[0].total, 4);
    });

    it('rejects every empty field of the calculation, including the branch that did not run', async function () {
        this.timeout(20000);
        const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, makeUser(), {}, async (_block, user, _data, step) => {
            step.setPreviewSource({ schema: '#S', document: { amount: 5 },
                paths: ['amount', 'rate', 'discount'], dependencies: {} });
            const { block } = makeBlock(CustomLogicBlock, { options: {
                unsigned: true, passOriginal: true, expression: conditionalExpression
            } });
            block.triggerEvents = async () => {};
            await block.runAction({ user, actionStatus: step,
                data: { data: { schema: '#S', document: { credentialSubject: [{ amount: 5 }] } } } });
            return new MessageResponse({});
        });
        assert.ok(response instanceof MessageError);
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.missingFields, ['discount', 'rate']);
        assert.equal(response.body, null);
    });

    it('retains ordinary worker output without preview observations', async function () {
        this.timeout(20000);
        const external = PolicyComponentsUtils.ExternalEventFn;
        PolicyComponentsUtils.ExternalEventFn = () => {};
        try {
            const { block } = makeBlock(CustomLogicBlock, { options: {
                unsigned: true, passOriginal: true, expression: conditionalExpression
            } });
            const outputs = [];
            block.backup = () => {};
            block.triggerEvents = async (type, _user, state) => { if (type === 'RunEvent') outputs.push(state.data); };
            const step = new RecordActionStep(() => {}, 0, true, true);
            await block.runAction({ user: makeUser(), actionStatus: step,
                data: { data: { schema: '#S', document: { credentialSubject: [{ amount: 5, discount: 1 }] } } } });
            assert.equal(outputs[0].document.credentialSubject[0].total, 4);
            assert.deepEqual(step.getPreviewReads(), []);
            assert.deepEqual(step.getPreviewDocuments(), []);
        } finally {
            PolicyComponentsUtils.ExternalEventFn = external;
        }
    });

    it('sends nothing on an empty result during a preview', async () => {
        const { block, events } = setup(async (state, user, triggerEvents) => {
            await triggerEvents(null);
            return null;
        });
        await block.runAction(makeEvent(previewStep()));
        assert.equal(events.length, 0);
    });
});

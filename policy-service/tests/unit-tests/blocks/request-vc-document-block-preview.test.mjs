import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { PreviewScope, runPreview } from '../../../dist/policy-engine/helpers/preview.js';
import { GenerateDID } from '../../../dist/policy-engine/policy-actions/generate-did.js';
import { SignVC } from '../../../dist/policy-engine/policy-actions/sign-vc.js';
import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';
import assert from 'node:assert/strict';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { ComponentsService } from '../../../dist/policy-engine/helpers/components-service.js';
import { Worker } from 'node:worker_threads';
import { makeBlock, makeDb, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const originals = [];
const patch = (target, map) => {
    for (const [key, value] of Object.entries(map)) {
        originals.push([target, key, target[key]]);
        target[key] = value;
    }
};
const restore = () => {
    while (originals.length) {
        const [target, key, value] = originals.pop();
        target[key] = value;
    }
};

const previewStep = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);

describe('@unit RequestVcDocumentBlock preview', () => {
    let releaseCredentials;
    beforeEach(() => { releaseCredentials = installCredentialPreparation(); });

    let signed;
    let generated;

    beforeEach(() => {
        signed = 0;
        generated = 0;
        patch(PolicyUtils, {
            getRelationships: async () => null,
            getRelayerAccountAndOwner: async (_ref, user) => ['0.0.1', user],
            setAutoCalculateFields: () => {},
            setGuardianVersion: () => {},
        });
        patch(GenerateDID, {
            local: async () => { generated++; throw new Error('must not publish a DID'); },
            request: async () => { generated++; throw new Error('must not request a DID'); }
        });
        patch(SignVC, {
            local: async () => { signed++; throw new Error('must not sign'); },
            request: async () => { signed++; throw new Error('must not request a signature'); }
        });
    });

    afterEach(() => restore());
    after(() => restoreHarness());

    const mk = () => {
        const { block } = makeBlock(RequestVcDocumentBlock, { options: { schema: '#S', idType: 'DID' }, componentsOverrides: {
            databaseServer: makeDb({ getTopic: async () => ({ topicId: '0.0.123' }), saveDid: async row => row }),
            generateUUID: async () => 'urn:uuid:request',
            generateDID: ComponentsService.prototype.generateDID
        } });
        block._schema = { iri: '#S', fields: [], type: 'TestType', contextURL: 'ctx://x', searchFields: () => [] };
        const events = [];
        const setData = block.setData.bind(block);
        block.setData = (...args) => PreviewScope.run(args[3], () => setData(...args));
        block.triggerEvents = async (...args) => { events.push(args); };
        return { block, events };
    };

    it('passes an unsigned document with the user as issuer down the chain without publishing a DID or signing', async () => {
        const { block, events } = mk();
        const step = previewStep();
        const item = await block.setData(makeUser({ id: 'u-1', userId: 'uid-1' }), { document: { amount: 5 } }, null, step);
        assert.equal(generated, 0);
        assert.equal(signed, 0);
        assert.equal(item.owner, 'did:user');
        assert.equal(item.document.issuer, 'did:user');
        assert.equal(item.schema, '#S');
        assert.equal(item.relayerAccount, '0.0.1');
        assert.equal(item.document.proof, undefined);
        assert.match(firstSubject(item).id, /^did:hedera:.*_0\.0\.123$/);
        assert.deepEqual(events.map((event) => event[0]), ['RunEvent', 'ReleaseEvent', 'RefreshEvent']);
        assert.equal(events[0][2].data, item);
        assert.equal(events[0][3], step);
    });

    it('gives the same DID-prefix calculation result for ordinary and preview Request subjects', async function () {
        this.timeout(20000);
        const { block } = mk();
        const user = makeUser();
        patch(GenerateDID, { local: async () => {
            const document = await ComponentsService.prototype.generateDID.call({}, '0.0.123');
            return document.getDid();
        } });
        const ordinary = await block.createCredentialSubject(user, '0.0.1', { amount: 5 }, 'ordinary');
        const preview = await PreviewScope.run(previewStep(), () =>
            block.createCredentialSubject(user, '0.0.1', { amount: 5 }, 'preview'));
        assert.notEqual(ordinary.id, preview.id);
        const calculate = subject => new Promise((resolve, reject) => {
            const worker = new Worker(new URL('../../../dist/policy-engine/helpers/workers/custom-logic-worker.js', import.meta.url), {
                workerData: {
                    execFunc: "done(documents[0].document.credentialSubject[0].id.startsWith('did:') ? 1 : 0);",
                    documents: [{ schema: '#S', document: { credentialSubject: [subject] } }],
                    user: {}, artifacts: [], sources: [], tablesPack: {}, trackReads: false, schemas: []
                }
            });
            let result;
            const timer = setTimeout(() => { worker.terminate(); reject(new Error('worker timeout')); }, 15000);
            worker.on('message', message => {
                if (message.type === 'done') result = message.result;
                if (message.type === 'error') reject(new Error(message.error));
            });
            worker.on('error', error => { clearTimeout(timer); reject(error); });
            worker.on('exit', code => {
                clearTimeout(timer);
                if (code !== 0) reject(new Error(`worker exit ${code}`));
                else resolve(result);
            });
        });
        assert.equal(await calculate(ordinary), 1);
        assert.equal(await calculate(preview), 1);
    });

    it('keeps the restore data of the user', async () => {
        const { block } = mk();
        block.state['u-2'] = { restoreData: { old: 1 } };
        await block.setData(makeUser({ id: 'u-2' }), { document: { amount: 5 } }, null, previewStep());
        assert.deepEqual(block.state['u-2'].restoreData, { old: 1 });
    });

    const formSchema = () => ({
        iri: '#S',
        type: 'TestType',
        contextURL: 'ctx://x',
        searchFields: () => [],
        fields: [
            { name: 'amount', type: 'number', isRef: false, isArray: false },
            { name: 'rate', type: 'number', isRef: false, isArray: false },
            { name: 'total', type: 'number', isRef: false, isArray: false, autocalculate: true, expression: 'amount * rate' }
        ]
    });

    const firstSubject = (item) => Array.isArray(item.document.credentialSubject)
        ? item.document.credentialSubject[0]
        : item.document.credentialSubject;

    for (const discovery of [false, true]) {
        it(`never requires VM0051 display headings in preview mode discovery=${discovery}`, async () => {
            const { block } = mk();
            block._schema = formSchema();
            block._schema.fields.push({ name: 'quantification', isRef: true, isArray: false, context: { type: 'Quantification', context: ['ctx://quantification'] }, fields: [
                { name: 'baselineEmission', type: 'null', isRef: false, isArray: false },
                { name: 'projectEmission', type: 'null', isRef: false, isArray: false }
            ] });
            const response = await runPreview(block, makeUser(), { document: { amount: 5, rate: 2 }, previewFields: discovery },
                async (target, user, data, step) => {
                    const item = await target.setData(user, data, null, step);
                    step.addPreviewRead('#S', 'quantification.baselineEmission');
                    step.addPreviewRead('#S', 'quantification.projectEmission');
                    return new MessageResponse(item);
                });
            assert.ok(response instanceof MessageResponse);
            assert.deepEqual(response.body.fields, ['amount', 'rate']);
            assert.deepEqual(response.body.missingFields, []);
            assert.deepEqual(response.body.errors, []);
        });
    }

    it('rejects a missing numeric table column while ignoring null headings with the same name', async () => {
        const { block } = mk();
        block._schema = formSchema();
        block._schema.fields.push({ name: 'unit', type: 'null', isRef: false, isArray: false },
            { name: 'rows', isRef: true, isArray: true, context: { type: 'Row', context: ['ctx://row'] }, fields: [{ name: 'unit', type: 'number', isRef: false, isArray: false }] });
        const response = await runPreview(block, makeUser(), { document: { amount: 5, rate: 2, rows: [{ unit: 1 }, {}] } },
            async (target, user, data, step) => {
                const item = await target.setData(user, data, null, step);
                step.addPreviewRead('#S', 'unit');
                step.addPreviewRead('#S', 'rows.1.unit');
                return new MessageResponse(item);
            });
        assert.ok(response instanceof MessageError);
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.fields, ['amount', 'rate', 'rows.unit']);
        assert.deepEqual(response.data.missingFields, ['rows.1.unit']);
    });

    it('does not hide a calculation exception when the only empty read is a null heading', async () => {
        const { block } = mk();
        block._schema = formSchema();
        block._schema.fields.push({ name: 'unit', type: 'null', isRef: false, isArray: false });
        await assert.rejects(() => runPreview(block, makeUser(), { document: { amount: 5, rate: 2 } },
            async (target, user, data, step) => {
                await target.setData(user, data, null, step);
                step.addPreviewRead('#S', 'unit');
                throw new Error('calculation failed');
            }), /calculation failed/);
    });

    it('keeps ordinary document preparation on its existing calculation path', async () => {
        const { block } = mk();
        block._schema = formSchema();
        block._schema.fields.push({ name: 'unit', type: 'null', isRef: false, isArray: false });
        const document = { amount: 5, rate: 2, unit: null };
        let calls = 0;
        patch(PolicyUtils, { setAutoCalculateFields: (schema, input) => {
            calls++;
            assert.equal(schema, block._schema);
            input.total = input.amount * input.rate;
        } });
        const prepared = await block.prepareDocument({ document });
        assert.equal(calls, 1);
        assert.equal(prepared, document);
        assert.deepEqual(prepared, { amount: 5, rate: 2, total: 10, unit: null });
    });

    it('fills empty fields and records the form source when field discovery is asked', async () => {
        const { block } = mk();
        block._schema = formSchema();
        const step = previewStep();
        const item = await block.setData(makeUser(), { document: { amount: 5 }, previewFields: true }, null, step);
        const subject = firstSubject(item);
        assert.equal(subject.amount, 5);
        assert.equal(subject.rate, 0);
        assert.equal(subject.total, 0);
        assert.deepEqual(step.getPreviewSource(), {
            schema: '#S',
            document: { amount: 5 },
            paths: ['amount', 'rate', 'total'],
            dependencies: { total: ['amount', 'rate'] },
            hidden: [],
            nulls: [],
            unavailable: [],
            discovery: true
        });
    });

    for (const amount of [5, 200]) {
        it(`returns only the autocalculate branch that ran during initial API discovery for amount=${amount}`, async () => {
            const { block } = mk();
            block._schema = formSchema();
            block._schema.fields[2].expression = 'amount > 100 ? amount * rate : amount';
            const response = await runPreview(block, makeUser(), { document: { amount }, previewFields: true },
                async (target, user, data, step) => new MessageResponse(await target.setData(user, data, null, step)));
            assert.ok(response instanceof MessageResponse);
            assert.deepEqual(response.body.fields, amount > 100 ? ['amount', 'rate'] : ['amount']);
            assert.deepEqual(response.body.missingFields, amount > 100 ? ['rate'] : []);
            assert.deepEqual(response.body.errors, []);
        });
    }

    it('treats an empty string or null from a direct API client as an absent field, only in Preview', async () => {
        const { block, events } = mk();
        block._schema = formSchema();
        const response = await runPreview(block, makeUser(), { document: { amount: 5, rate: null, note: '' } },
            async (target, user, data, step) => new MessageResponse(await target.setData(user, data, null, step)));
        assert.ok(response instanceof MessageError);
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.missingFields, ['rate']);
        block._schema.fields[2].expression = 'amount * 2';
        const filled = await runPreview(block, makeUser(), { document: { amount: 5, rate: null, note: '' } },
            async (target, user, data, step) => new MessageResponse(await target.setData(user, data, null, step)));
        assert.ok(filled instanceof MessageResponse);
        const subject = firstSubject(events[0][2].data);
        assert.equal('rate' in subject, false);
        assert.equal('note' in subject, false);
        assert.equal(subject.total, 10);
    });

    it('finds a constructed-key autocalculate input once its branch runs and ignores a same-named local variable', async function () {
        this.timeout(10000);
        const { block } = mk();
        block._schema = formSchema();
        block._schema.fields[2].expression = "amount > 100 ? amount * this['ra' + 'te'] : amount";
        const discover = () => runPreview(block, makeUser(), { document: { amount: 5 }, previewFields: true },
            async (target, user, data, step) => new MessageResponse(await target.setData(user, data, null, step)));
        const constructed = await discover();
        assert.ok(constructed instanceof MessageResponse);
        assert.deepEqual(constructed.body.fields, ['amount']);
        assert.deepEqual(constructed.body.missingFields, []);
        block._schema.fields[2].expression = '(() => {const rate=2;return amount*rate})()';
        const local = await discover();
        assert.ok(local instanceof MessageResponse);
        assert.deepEqual(local.body.fields, ['amount']);
        assert.deepEqual(local.body.missingFields, []);
    });

    it('stops before the chain and returns 422 for missing calculation input through the API helper', async () => {
        const { block, events } = mk();
        block._schema = formSchema();
        const document = { amount: 5 };
        const response = await runPreview(block, makeUser(), { document },
            async (target, user, data, step) => new MessageResponse(await target.setData(user, data, null, step)));
        assert.ok(response instanceof MessageError);
        assert.equal(response.code, 422);
        assert.equal(response.body, null);
        assert.deepEqual(response.data, { preview: true, fields: ['amount', 'rate'], missingFields: ['rate'] });
        assert.equal('rate' in document, false);
        assert.equal('total' in document, false);
        assert.deepEqual(events, []);
        assert.equal(generated, 0);
        assert.equal(signed, 0);
    });

    it('returns requirements during incomplete API discovery instead of rejecting it', async () => {
        const { block } = mk();
        block._schema = formSchema();
        const response = await runPreview(block, makeUser(), { document: { amount: 5 }, previewFields: true },
            async (target, user, data, step) => new MessageResponse(await target.setData(user, data, null, step)));
        assert.ok(response instanceof MessageResponse);
        assert.deepEqual(response.body.fields, ['amount', 'rate']);
        assert.deepEqual(response.body.missingFields, ['rate']);
    });

    it('accepts complete calculation input with an unrelated schema-required field still missing', async () => {
        const { block } = mk();
        block._schema = formSchema();
        block._schema.fields.push({ name: 'note', type: 'string', required: true });
        const step = previewStep();
        const item = await block.setData(makeUser(), { document: { amount: 5, rate: 0 } }, null, step);
        assert.equal(firstSubject(item).total, 0);
        assert.equal('note' in firstSubject(item), false);
        assert.deepEqual(step.getErrors(), []);
    });

    it('allows the reviewed presence-check formula to return 10 without requiring bonus', async () => {
        const { block } = mk();
        block._schema = { ...formSchema(), fields: [
            { name: 'amount', type: 'number' }, { name: 'bonus', type: 'number' },
            { name: 'total', type: 'number', autocalculate: true,
                expression: "typeof bonus === 'undefined' ? amount * 2 : amount * 2 + bonus" }
        ] };
        const response = await runPreview(block, makeUser(), { document: { amount: 5 } },
            async (target, user, data, step) => new MessageResponse(await target.setData(user, data, null, step)));
        assert.ok(response instanceof MessageResponse);
        assert.equal(firstSubject(response.body.input).total, 10);
        assert.deepEqual(response.body.fields, ['amount']);
        assert.deepEqual(response.body.missingFields, []);
    });

    it('returns 422 for a missing input producing NaN through an explicit property read', async () => {
        const { block } = mk();
        block._schema = { ...formSchema(), fields: [
            { name: 'bonus', type: 'number' },
            { name: 'total', type: 'number', autocalculate: true, expression: 'this.bonus * 2' }
        ] };
        const response = await runPreview(block, makeUser(), { document: {} },
            async (target, user, data, step) => new MessageResponse(await target.setData(user, data, null, step)));
        assert.ok(response instanceof MessageError);
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.missingFields, ['bonus']);
        assert.equal(response.body, null);
    });

    const brokenSchema = () => ({
        ...formSchema(),
        fields: [
            { name: 'amount', type: 'number', isRef: false, isArray: false },
            { name: 'total', type: 'number', isRef: false, isArray: false, autocalculate: true, expression: 'amount *' }
        ]
    });

    it('fails a preview on an autocalculate error the way a normal submit fails', async () => {
        const { block, events } = mk();
        block._schema = brokenSchema();
        const step = previewStep();
        await assert.rejects(
            block.setData(makeUser(), { document: { amount: 5 } }, null, step),
            (error) => error.errorObject?.type === 'blockActionError' && /Invalid expression: total/.test(error.message)
        );
        assert.equal(events.length, 0);
        assert.deepEqual(step.getErrors(), []);
    });

    it('keeps collecting autocalculate errors quietly during field discovery', async () => {
        const { block, events } = mk();
        block._schema = brokenSchema();
        const step = previewStep();
        await block.setData(makeUser(), { document: { amount: 5 }, previewFields: true }, null, step);
        assert.deepEqual(step.getErrors().map((error) => error.message), ['Invalid expression: total']);
        assert.deepEqual(events.map((event) => event[0]), ['RunEvent', 'ReleaseEvent', 'RefreshEvent']);
    });
    for (const discovery of [false, true]) {
        for (const table of [false, true]) {
            it(`never requires a conditionally forbidden configured input table=${table} discovery=${discovery}`, async () => {
                const { block } = mk();
                const mode = { name: 'mode', type: 'string', isRef: false, isArray: false };
                const rate = { name: 'rate', type: 'number', isRef: false, isArray: false };
                const input = table ? { name: 'rows', type: '#row', isRef: true, isArray: true,
                    context: { type: 'Row', context: ['ctx://row'] }, fields: [rate] } : rate;
                block._schema = { ...formSchema(), fields: [mode, input], conditions: [
                    { ifCondition: { field: mode, fieldValue: 'enabled' }, thenFields: [input], elseFields: [] }
                ] };
                const response = await runPreview(block, makeUser(), { document: { mode: 'disabled' }, previewFields: discovery },
                    async (target, user, data, step) => {
                        const item = await target.setData(user, data, null, step);
                        step.addPreviewRead('#S', table ? 'rows.rate' : 'rate');
                        return new MessageResponse(item);
                    });
                assert.ok(response instanceof MessageResponse);
                assert.deepEqual(response.body.fields, []);
                assert.deepEqual(response.body.missingFields, []);
                assert.deepEqual(response.body.errors, []);
            });
        }
    }

    for (const value of [undefined, 0]) {
        it(`keeps an allowed configured scalar input required with value=${value}`, async () => {
            const { block } = mk();
            const mode = { name: 'mode', type: 'string', isRef: false, isArray: false };
            const rate = { name: 'rate', type: 'number', isRef: false, isArray: false };
            block._schema = { ...formSchema(), fields: [mode, rate], conditions: [
                { ifCondition: { field: mode, fieldValue: 'enabled' }, thenFields: [rate], elseFields: [] }
            ] };
            const document = { mode: 'enabled', ...(value === undefined ? {} : { rate: value }) };
            const response = await runPreview(block, makeUser(), { document }, async (target, user, data, step) => {
                const item = await target.setData(user, data, null, step);
                step.addPreviewRead('#S', 'rate');
                return new MessageResponse(item);
            });
            if (value === undefined) {
                assert.ok(response instanceof MessageError);
                assert.equal(response.code, 422);
                assert.deepEqual(response.data.missingFields, ['rate']);
            } else {
                assert.ok(response instanceof MessageResponse);
                assert.deepEqual(response.body.fields, ['rate']);
                assert.deepEqual(response.body.missingFields, []);
            }
        });
    }

    it('reports only the allowed empty table row in its indexed 422', async () => {
        const { block } = mk();
        const mode = { name: 'mode', type: 'string', isRef: false, isArray: false };
        const rate = { name: 'rate', type: 'number', isRef: false, isArray: false };
        const condition = { ifCondition: { field: mode, fieldValue: 'enabled' }, thenFields: [rate], elseFields: [] };
        const rows = { name: 'rows', type: '#row', isRef: true, isArray: true,
            context: { type: 'Row', context: ['ctx://row'] }, fields: [mode, rate], conditions: [condition] };
        block._schema = { ...formSchema(), fields: [rows] };
        const response = await runPreview(block, makeUser(), { document: { rows: [{ mode: 'disabled' }, { mode: 'enabled' }] } },
            async (target, user, data, step) => {
                const item = await target.setData(user, data, null, step);
                step.addPreviewRead('#S', 'rows.rate');
                return new MessageResponse(item);
            });
        assert.ok(response instanceof MessageError);
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.missingFields, ['rows.1.rate']);
    });

    it('keeps a calculation exception when a forbidden input is omitted', async () => {
        const { block } = mk();
        const mode = { name: 'mode', type: 'string', isRef: false, isArray: false };
        const rate = { name: 'rate', type: 'number', isRef: false, isArray: false };
        block._schema = { ...formSchema(), fields: [mode, rate], conditions: [
            { ifCondition: { field: mode, fieldValue: 'enabled' }, thenFields: [rate], elseFields: [] }
        ] };
        await assert.rejects(() => runPreview(block, makeUser(), { document: { mode: 'disabled' } },
            async (target, user, data, step) => {
                await target.setData(user, data, null, step);
                step.addPreviewRead('#S', 'rate');
                throw new Error('calculation failed');
            }), /calculation failed/);
    });

    afterEach(() => releaseCredentials());

});

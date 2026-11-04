import assert from 'node:assert/strict';
import { MessageResponse } from '@guardian/common/models/message-response';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { ExtractDataBlock } from '../../../dist/policy-engine/blocks/extract-data-block.js';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { runPreview, markPreviewStoredDocuments, resolvePreviewDocumentRead } from '../../../dist/policy-engine/helpers/preview.js';

const child = { iri: '#Child', uuid: 'Child', contextURL: 'schema:child', document: JSON.stringify({ type: 'object', properties: { amount: { type: 'number' }, total: { type: 'number' } } }) };
const parent = { iri: '#Parent', uuid: 'Parent', contextURL: 'schema:parent', document: JSON.stringify({ type: 'object', properties: { section: { $ref: '#Child' } }, $defs: { '#Child': JSON.parse(child.document) } }) };
const user = makeUser();
const document = (subject, schema) => ({ schema, owner: user.did, document: PolicyUtils.createVcFromSubject(subject).toJsonTree() });

async function logic(expression, input, step) {
    const { block } = makeBlock(CustomLogicBlock, { options: { unsigned: true, expression } });
    let output;
    block.triggerEvents = async (type, _user, state) => {
        if (type === 'RunEvent') {
            output = state.data;
        }
    };
    await block.runAction({ user, data: { data: input }, actionStatus: step });
    return output;
}

async function math(input, schema, code, step) {
    const { block } = makeBlock(MathBlock, { options: { inputSchema: schema, outputSchema: schema, unsigned: true, expression: { variables: [], formulas: [], outputs: [], code } } });
    return block.process(input, block, 'uid', step.id, user, [], true);
}

describe('@unit Preview retains origins across intermediate calculations', function () {
    this.timeout(30000);
    const originals = [];
    before(() => {
        for (const [target, values] of [
            [PolicyComponentsUtils, { ExternalEventFn: async () => undefined, BlockErrorFn: async () => undefined }],
            [PolicyUtils, { loadSchemaByID: async (_ref, iri) => iri === '#Parent' ? parent : child, getDocumentOwner: async () => user, findRelationships: async () => [] }]
        ]) {
            for (const [key, value] of Object.entries(values)) {
                originals.push([target, key, target[key]]);
                target[key] = value;
            }
        }
    });
    after(() => {
        for (const [target, key, value] of originals.reverse()) {
            target[key] = value;
        }
        restoreHarness();
    });

    for (const middle of ['math', 'custom']) {
        it(`keeps the missing extracted field after ${middle} creates a wrapper`, async () => {
            let mapped;
            const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, _user, _data, step) => {
                step.setPreviewSource({ schema: '#Parent', document: { section: {} }, paths: ['section', 'section.amount', 'section.total'], dependencies: {} });
                const { block } = makeBlock(ExtractDataBlock, { options: { schema: '#Child' } });
                await block.beforeInit();
                block.triggerEvents = async (type, _current, state) => {
                    if (type !== 'RunEvent') return;
                    const input = state.data[0];
                    const output = middle === 'math'
                        ? await math(input, '#Child', 'result.total=1;', step)
                        : await logic('const doc=documents[0].document.credentialSubject[0];doc.total=1;done(doc);', input, step);
                    mapped = resolvePreviewDocumentRead(output, 'amount');
                    await logic('const doc=documents[0].document.credentialSubject[0];done({total:doc.amount*2});', output, step);
                };
                await block.runAction({ user, data: { data: document({ section: {} }, '#Parent') }, actionStatus: step });
                return new MessageResponse(null);
            });
            assert.deepEqual(mapped, { schema: '#Parent', path: 'section.amount' });
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['section.amount']);
        });
    }

    it('keeps unchanged stored values optional through Math and a Custom consumer', async () => {
        let total;
        const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, _user, _data, step) => {
            step.setPreviewSource({ schema: '#Child', document: {}, paths: ['amount', 'total'], dependencies: {} });
            const output = await math(markPreviewStoredDocuments(document({ amount: 5 }, '#Child')), '#Child', 'result.total=document.amount*2;', step);
            const result = await logic('const doc=documents[0].document.credentialSubject[0];done({total:doc.amount*3});', output, step);
            total = result.document.credentialSubject[0].total;
            return new MessageResponse(null);
        });
        assert.equal(response.code, 200);
        assert.equal(total, 15);
        assert.deepEqual(response.body.missingFields, []);
    });

    it('does not assign an extracted origin to an unrelated generated Custom result', async () => {
        let mapped;
        const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, _user, _data, step) => {
            step.setPreviewSource({ schema: '#Parent', document: { section: {} }, paths: ['section', 'section.amount'], dependencies: {} });
            const { block } = makeBlock(ExtractDataBlock, { options: { schema: '#Child' } });
            await block.beforeInit();
            block.triggerEvents = async (type, _current, state) => {
                if (type !== 'RunEvent') return;
                const output = await logic('done({amount:99});', state.data[0], step);
                mapped = resolvePreviewDocumentRead(output, 'amount');
            };
            await block.runAction({ user, data: { data: document({ section: {} }, '#Parent') }, actionStatus: step });
            return new MessageResponse(null);
        });
        assert.equal(response.code, 200);
        assert.equal(mapped, null);
    });
});

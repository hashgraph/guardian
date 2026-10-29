import assert from 'node:assert/strict';
import { MessageResponse } from '@guardian/common/models/message-response';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { runPreview, markPreviewStoredDocuments } from '../../../dist/policy-engine/helpers/preview.js';

const user = makeUser();
const document = subject => ({ schema: '#S', document: PolicyUtils.createVcFromSubject(subject).toJsonTree() });

describe('Switch executed document origins', function () {
    after(() => restoreHarness());
    for (const formula of ['true ? amount[1]>0 : amount[2]>0', 'false ? amount[2]>0 : amount[1]>0', 'i=1;amount[i]>0']) {
        it(`does not require inactive form input: ${formula}`, async function () {
            PolicyComponentsUtils.ExternalEventFn = async () => {};
            PolicyComponentsUtils.BlockErrorFn = async () => {};
            const branches = [];
            const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, current, _data, step) => {
                step.setPreviewSource({ schema: '#S', document: {}, paths: ['amount'], dependencies: {} });
                const { block } = makeBlock(SwitchBlock, { options: { executionFlow: 'firstTrue', conditions: [{ type: 'equal', value: formula, tag: 'positive', actor: '' }] } });
                block.triggerEvents = async type => branches.push(type);
                await block.runAction({ user: current, data: { data: [markPreviewStoredDocuments(document({ amount: 5 })), document({})] }, actionStatus: step });
                return new MessageResponse(null);
            });
            assert.equal(response.code, 200);
            assert.ok(branches.includes('positive'));
            assert.deepEqual(response.body?.missingFields ?? [], []);
        });
    }
    it('removes only the aggregate document index from nested paths', async function () {
        const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, current, _data, step) => {
            step.setPreviewSource({ schema: '#S', document: { nested: { amount: 7 } }, paths: ['nested.amount'], dependencies: {} });
            const { block } = makeBlock(SwitchBlock, { options: { executionFlow: 'firstTrue', conditions: [{ type: 'equal', value: 'nested[2].amount>0', tag: 'positive', actor: '' }] } });
            block.triggerEvents = async () => {};
            await block.runAction({ user: current, data: { data: [markPreviewStoredDocuments(document({ nested: { amount: 5 } })), document({ nested: { amount: 7 } })] }, actionStatus: step });
            assert.deepEqual(step.getPreviewReads(), [{ schema: '#S', path: 'nested.amount' }]);
            return new MessageResponse(null);
        });
        assert.equal(response.code, 200);
    });
    const runSelection = async (formula, subject, paths, inputs) => {
        const branches = [];
        let reads;
        const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, current, _data, step) => {
            step.setPreviewSource({ schema: '#S', document: subject, paths, dependencies: {} });
            const data = inputs.map(({ value, stored }) => stored ? markPreviewStoredDocuments(document(value)) : document(value));
            const { block } = makeBlock(SwitchBlock, { options: { executionFlow: 'firstTrue', conditions: [{ type: 'equal', value: formula, tag: 'positive', actor: '' }] } });
            block.triggerEvents = async type => branches.push(type);
            await block.runAction({ user: current, data: { data }, actionStatus: step });
            reads = step.getPreviewReads();
            return new MessageResponse(null);
        });
        const { block } = makeBlock(SwitchBlock, { options: { executionFlow: 'firstTrue', conditions: [{ type: 'equal', value: formula, tag: 'positive', actor: '' }] } });
        const ordinaryBranches = [];
        block.triggerEvents = async type => ordinaryBranches.push(type);
        await block.runAction({ user, data: { data: inputs.map(({ value }) => document(value)) } });
        assert.deepEqual(branches, ordinaryBranches);
        return { response, reads, branches };
    };

    for (const formula of ['sum(amount[1:2]) > 0', 'sum(amount[[2,1,2]]) > 0', 'sum(amount[1:end-1]) > 0']) {
        it(`does not require an unselected current value: ${formula}`, async () => {
            const { response, reads, branches } = await runSelection(formula, {}, ['amount'], [
                { value: { amount: 5 }, stored: true },
                { value: { amount: 7 }, stored: true },
                { value: {} }
            ]);
            assert.equal(response.code, 200);
            assert.deepEqual(response.body.errors, []);
            assert.deepEqual(reads, []);
            assert.ok(branches.includes('positive'));
        });
    }

    for (const formula of ['sum(amount[2:3]) > 0', 'sum(amount[[1,3]]) > 0', 'sum(amount[2:end]) > 0']) {
        it(`requires a selected missing current value: ${formula}`, async () => {
            const { response, reads } = await runSelection(formula, {}, ['amount'], [
                { value: { amount: 5 }, stored: true },
                { value: { amount: 7 }, stored: true },
                { value: {} }
            ]);
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount']);
            assert.deepEqual(reads, [{ schema: '#S', path: 'amount' }]);
        });
    }

    for (const filled of [false, true]) {
        it(`attributes distinct nested row reads to each selected document (${filled ? 'filled' : 'missing'})`, async () => {
            const subject = { nested: { rows: [{}, filled ? { amount: 7 } : {}] } };
            const { response, reads, branches } = await runSelection('nested[1].rows[1].amount + nested[2].rows[2].amount > 0', subject, ['nested.rows.amount'], [
                { value: { nested: { rows: [{ amount: 5 }, {}] } }, stored: true },
                { value: subject }
            ]);
            assert.deepEqual(reads, [{ schema: '#S', path: 'nested.rows.1.amount' }]);
            assert.equal(response.code, filled ? 200 : 422);
            if (filled) {
                assert.deepEqual(response.body.errors, []);
                assert.ok(branches.includes('positive'));
            } else {
                assert.deepEqual(response.data.missingFields, ['nested.rows.1.amount']);
            }
        });
    }

});

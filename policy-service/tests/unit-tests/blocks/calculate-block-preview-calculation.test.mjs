import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { CalculateContainerBlock } from '../../../dist/policy-engine/blocks/calculate-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const addon = {
    async run(scope) {
        scope.b = scope.a * 2;
        return scope;
    },
    getVariables(variables) {
        variables.b = 'a * 2';
        return variables;
    }
};

const refWith = () => ({
    tag: 'calc',
    blockType: 'calculateContainerBlock',
    getAddons: () => [addon],
    getOptions: async () => ({
        inputFields: [{ name: 'amount', value: 'a' }],
        outputFields: [{ name: 'total', value: 'b' }]
    })
});

describe('@unit calculateContainerBlock preview calculation', () => {
    let origOwner;

    beforeEach(() => {
        origOwner = PolicyUtils.getDocumentOwner;
        PolicyUtils.getDocumentOwner = async () => ({ did: 'did:owner', group: null });
    });

    afterEach(() => {
        PolicyUtils.getDocumentOwner = origOwner;
    });

    after(() => restoreHarness());

    const block = () => makeBlock(CalculateContainerBlock, { options: {} }).block;

    it('records inputs, equation values and outputs during a preview', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const result = await PreviewScope.run(step, () => block().calculate({ amount: 3 }, refWith(), {}, 'uid', makeUser()));
        assert.deepEqual(result, { total: 6 });
        assert.deepEqual(step.getPreviewCalculations(), [{
            source: 'calc',
            blockType: 'calculateContainerBlock',
            inputs: [{ name: 'a', path: 'amount', value: 3 }],
            values: [{ name: 'b', description: '', formula: 'a * 2', value: 6 }],
            outputs: [{ name: 'b', path: 'total', value: 6 }]
        }]);
    });

    it('records nothing outside a preview', async () => {
        let asked = 0;
        const counting = { ...addon, getVariables(variables) { asked++; return variables; } };
        const ref = { ...refWith(), getAddons: () => [counting] };
        const result = await block().calculate({ amount: 3 }, ref, {}, 'uid', makeUser());
        assert.deepEqual(result, { total: 6 });
        assert.equal(asked, 0);
    });
});

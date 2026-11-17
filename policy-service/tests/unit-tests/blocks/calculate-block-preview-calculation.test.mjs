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
    },
    async getOptions() {
        return { equations: [{ variable: 'b', formula: 'a * 2' }] };
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

    it('shows the equations from the options the user ran with', async () => {
        const users = [];
        const edited = {
            async run(scope) {
                scope.c = scope.a * 3;
                return scope;
            },
            getVariables(variables) {
                variables.b = 'a * 2';
                return variables;
            },
            async getOptions(user) {
                users.push(user?.did);
                return { equations: [{ variable: 'c', formula: 'a * 3' }] };
            }
        };
        const ref = {
            ...refWith(),
            getAddons: () => [edited],
            getOptions: async () => ({
                inputFields: [{ name: 'amount', value: 'a' }],
                outputFields: [{ name: 'total', value: 'c' }]
            })
        };
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const result = await PreviewScope.run(step, () => block().calculate({ amount: 3 }, ref, {}, 'uid', makeUser()));
        assert.deepEqual(result, { total: 9 });
        const [calculation] = step.getPreviewCalculations();
        assert.deepEqual(calculation.values, [{ name: 'c', description: '', formula: 'a * 3', value: 9 }]);
        assert.deepEqual(calculation.outputs, [{ name: 'c', path: 'total', value: 9 }]);
        assert.deepEqual(users, ['did:owner']);
    });

    it('shows an output the document does not keep as null', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const result = await PreviewScope.run(step, () => block().calculate({ amount: 0 }, refWith(), {}, 'uid', makeUser()));
        assert.deepEqual(result, {});
        const [calculation] = step.getPreviewCalculations();
        assert.deepEqual(calculation.values, [{ name: 'b', description: '', formula: 'a * 2', value: 0 }]);
        assert.deepEqual(calculation.outputs, [{ name: 'b', path: 'total', value: null }]);
    });

    it('keeps an addon default and drops a NaN output the same way the ordinary run does', async () => {
        for (const defaults of [true, false]) {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            step.setPreviewSource({ schema: '#in', document: {}, paths: ['amount'], dependencies: {} });
            const ref = { ...refWith(), getAddons: () => [{ ...addon, async run(scope) {
                return { ...scope, b: defaults ? (scope.a || 0) * 2 : scope.a * 2 };
            } }] };
            const preview = await PreviewScope.run(step, () => block().calculate({}, ref, { schema: '#in' }, 'uid', makeUser()));
            assert.deepEqual(preview, {});
            assert.deepEqual(preview, await block().calculate({}, ref, { schema: '#in' }, 'uid', makeUser()));
            assert.equal(step.getPreviewCalculations().length, 1);
        }
    });

    it('keeps a finite output when an equation the outputs do not use is NaN', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ schema: '#in', document: { amount: 3 }, paths: ['amount'], dependencies: {} });
        const ref = { ...refWith(), getAddons: () => [{ ...addon, async run(scope) {
            return { ...scope, b: scope.a * 2, unused: 0 / 0 };
        } }] };
        const result = await PreviewScope.run(step, () => block().calculate({ amount: 3 }, ref, { schema: '#in' }, 'uid', makeUser()));
        assert.deepEqual(result, { total: 6 });
        assert.equal(step.getPreviewCalculations().length, 1);
    });

    it('rejects a non-finite output the document would keep without recording a calculation', async () => {
        for (const value of [Infinity, { rows: [NaN] }]) {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            step.setPreviewSource({ schema: '#in', document: { amount: 3 }, paths: ['amount'], dependencies: {} });
            const ref = { ...refWith(), getAddons: () => [{ ...addon, async run(scope) {
                return { ...scope, b: value };
            } }] };
            await assert.rejects(
                PreviewScope.run(step, () => block().calculate({ amount: 3 }, ref, { schema: '#in' }, 'uid', makeUser())),
                /non-finite/
            );
            assert.deepEqual(step.getPreviewCalculations(), []);
        }
    });

    it('lets field discovery continue past NaN from an empty placeholder', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ schema: '#in', document: {}, paths: ['amount'], dependencies: {}, discovery: true });
        const ref = { ...refWith(), getAddons: () => [{ ...addon, async run(scope) {
            return { ...scope, b: scope.a * 2 };
        } }] };
        await PreviewScope.run(step, () => block().calculate({}, ref, { schema: '#in' }, 'uid', makeUser()));
        assert.equal(step.getPreviewCalculations().length, 1);
    });

    it('records nothing outside a preview', async () => {
        let asked = 0;
        const counting = { ...addon, async getOptions() { asked++; return {}; } };
        const ref = { ...refWith(), getAddons: () => [counting] };
        const result = await block().calculate({ amount: 3 }, ref, {}, 'uid', makeUser());
        assert.deepEqual(result, { total: 6 });
        assert.equal(asked, 0);
    });
});

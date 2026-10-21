import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { DocumentMap } from '../../../dist/policy-engine/helpers/math-model/index.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const expression = {
    variables: [{ type: 'link', name: 'a', description: '', field: 'amount', schema: '#in' }],
    formulas: [{ type: 'variable', name: 'b', body: 'a\\cdot2', description: '', params: [], relationships: [] }],
    outputs: [{ type: 'link', name: 'b', description: '', field: 'total', schema: '#out' }]
};

const refWith = () => ({
    blockType: 'mathBlock',
    uuid: 'uuid-1',
    tag: 'math',
    warn() {},
    getOptions: async () => ({
        expression,
        artifacts: [],
        inputSchema: '#in',
        outputSchema: '#out'
    })
});

describe('@unit mathBlock preview calculation', () => {
    let origLoadSchema;

    beforeEach(() => {
        origLoadSchema = PolicyUtils.loadSchemaByID;
        PolicyUtils.loadSchemaByID = async () => ({ iri: '#out', name: 'Out', document: '{}', contextURL: 'ctx' });
    });

    afterEach(() => {
        PolicyUtils.loadSchemaByID = origLoadSchema;
    });

    after(() => restoreHarness());

    const setup = () => {
        const map = new DocumentMap();
        map.addDocument({ schema: '#in', document: { amount: 2 } });
        const { block } = makeBlock(MathBlock, { options: {} });
        const sent = [];
        block.createWorker = async (workerData) => {
            sent.push(workerData);
            return {
                result: { total: 4 },
                warnings: [],
                scope: workerData.withScope ? { a: 2, b: 4 } : undefined,
                reads: workerData.trackReads ? [{ schema: null, path: 'note' }] : undefined
            };
        };
        return { block, map, sent };
    };

    it('asks the worker for its scope and records the calculation during a preview', async () => {
        const { block, map, sent } = setup();
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser()));
        assert.equal(sent[0].withScope, true);
        assert.deepEqual(step.getPreviewCalculations(), [{
            source: 'math',
            blockType: 'mathBlock',
            inputs: [{ name: 'a', path: 'amount', value: 2 }],
            values: [{ name: 'b', description: '', formula: 'a\\cdot2', value: 4 }],
            outputs: [{ name: 'b', path: 'total', value: 4 }]
        }]);
    });

    it('does not ask for the scope outside a preview', async () => {
        const { block, map, sent } = setup();
        const result = await block.calculate(refWith(), map, makeUser());
        assert.equal(sent[0].withScope, false);
        assert.equal(sent[0].trackReads, false);
        assert.deepEqual(result, { total: 4 });
    });

    it('records the variable fields and the fields the code section read', async () => {
        const { block, map, sent } = setup();
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser(), '#in'));
        assert.equal(sent[0].trackReads, true);
        assert.deepEqual(step.getPreviewReads(), [
            { schema: '#in', path: 'amount' },
            { schema: '#in', path: 'note' }
        ]);
    });
});

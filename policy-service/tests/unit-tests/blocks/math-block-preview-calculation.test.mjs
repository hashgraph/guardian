import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { DocumentMap } from '../../../dist/policy-engine/helpers/math-model/index.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PreviewScope, setPreviewComputed } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const expression = {
    variables: [{ type: 'link', name: 'a', description: '', field: 'amount', schema: '#in' }],
    formulas: [{ type: 'variable', name: 'b', body: 'a\\cdot2', description: '', params: [], relationships: [] }],
    outputs: [{ type: 'link', name: 'b', description: '', field: 'total', schema: '#out' }]
};

const refWith = (overrides = {}) => ({
    blockType: 'mathBlock',
    uuid: 'uuid-1',
    tag: 'math',
    warn() {},
    getOptions: async () => ({
        expression,
        artifacts: [],
        inputSchema: '#in',
        outputSchema: '#out',
        ...overrides
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

    const setup = (reads = [{ schema: null, path: 'note' }]) => {
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
                reads: workerData.trackReads ? reads : undefined
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

    it('does not record a field the block writes into the same document before the code section reads it', async () => {
        const { block, map, sent } = setup([{ schema: null, path: 'total' }, { schema: null, path: 'note' }]);
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await PreviewScope.run(step, () => block.calculate(refWith({ outputSchema: '#in' }), map, makeUser(), '#in'));
        assert.equal(sent[0].copy, true);
        assert.deepEqual(step.getPreviewReads(), [
            { schema: '#in', path: 'amount' },
            { schema: '#in', path: 'note' }
        ]);
    });

    it('keeps a code read of a field with the output name when the block writes into another schema', async () => {
        const { block, map, sent } = setup([{ schema: null, path: 'total' }]);
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser(), '#in'));
        assert.equal(sent[0].copy, false);
        assert.deepEqual(step.getPreviewReads(), [
            { schema: '#in', path: 'amount' },
            { schema: '#in', path: 'total' }
        ]);
    });

    it('does not record a field an earlier block computed in the input document', async () => {
        const { block, map } = setup([{ schema: null, path: 'amount' }, { schema: null, path: 'note' }]);
        const source = setPreviewComputed({ schema: '#in' }, ['amount']);
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser(), '#in', source));
        assert.deepEqual(step.getPreviewReads(), [{ schema: '#in', path: 'note' }]);
    });

    it('records the field when the input document did not get it from an earlier block', async () => {
        const { block, map } = setup([]);
        setPreviewComputed({ schema: '#in' }, ['amount']);
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser(), '#in', { schema: '#in' }));
        assert.deepEqual(step.getPreviewReads(), [{ schema: '#in', path: 'amount' }]);
    });

    it('keeps the code-section reads of a failed run, fails with its error and records no calculation', async () => {
        const { block, map } = setup();
        block.createWorker = async () => ({
            result: null,
            warnings: [],
            reads: [{ schema: null, path: 'rate' }],
            error: 'Cannot read properties of undefined'
        });
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        await assert.rejects(
            PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser(), '#in')),
            { message: 'Cannot read properties of undefined' }
        );
        assert.deepEqual(step.getPreviewReads(), [
            { schema: '#in', path: 'amount' },
            { schema: '#in', path: 'rate' }
        ]);
        assert.deepEqual(step.getPreviewCalculations(), []);
    });
});

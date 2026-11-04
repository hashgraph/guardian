import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { DocumentMap } from '../../../dist/policy-engine/helpers/math-model/index.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { getPreviewInputError, PreviewScope, setPreviewComputed } from '../../../dist/policy-engine/helpers/preview.js';
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
                body: workerData.trackReads ? 'return document;' : undefined,
                sites: workerData.trackReads ? reads.map((read) => ({ ...read, fullPath: read.path, site: -2, listed: false })) : undefined
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

    it('runs the calculation first and then rejects an empty linked input', async () => {
        const { block, map, sent } = setup([]);
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ schema: '#in', document: {}, paths: ['amount'], dependencies: {} });
        await PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser(), '#in'));
        assert.equal(sent.length, 1);
        assert.deepEqual(getPreviewInputError(step).data.missingFields, ['amount']);
    });

    it('records failed Math reads and rejects non-finite results before recording a calculation', async () => {
        for (const failure of ['error', 'nan']) {
            const { block, map } = setup();
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            step.setPreviewSource({ schema: '#in', document: {}, paths: ['amount'], dependencies: {} });
            block.createWorker = async () => failure === 'error'
                ? { error: 'bad expression', warnings: [], result: null }
                : { warnings: [], result: { total: NaN }, scope: { a: undefined } };
            await assert.rejects(PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser(), '#in')));
            assert.deepEqual(step.getPreviewCalculations(), []);
            assert.deepEqual(getPreviewInputError(step).data.missingFields, ['amount']);
        }
    });

    it('keeps a finite result when a formula the outputs do not use is NaN', async () => {
        const { block, map } = setup([]);
        block.createWorker = async () => ({ result: { total: 4 }, warnings: [], scope: { a: 2, b: 4, c: NaN } });
        const unused = {
            ...expression,
            formulas: [...expression.formulas, { type: 'variable', name: 'c', body: 'a\\cdot0', description: '', params: [], relationships: [] }]
        };
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ schema: '#in', document: { amount: 2 }, paths: ['amount'], dependencies: {} });
        const result = await PreviewScope.run(step, () => block.calculate(refWith({ expression: unused }), map, makeUser(), '#in'));
        assert.deepEqual(result, { total: 4 });
        const [calculation] = step.getPreviewCalculations();
        assert.equal(calculation.values.length, 2);
        assert.ok(Number.isNaN(calculation.values[1].value));
        assert.equal(getPreviewInputError(step), null);
    });

    it('allows incomplete discovery and values supplied by an earlier block', async () => {
        for (const discovery of [true, false]) {
            const { block, map, sent } = setup([]);
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            step.setPreviewSource({ schema: '#in', document: {}, paths: ['amount'], dependencies: {}, discovery });
            const source = discovery ? null : setPreviewComputed({ schema: '#in' }, ['amount']);
            await PreviewScope.run(step, () => block.calculate(refWith(), map, makeUser(), '#in', source));
            assert.equal(sent.length, 1);
        }
    });

    it('keeps optional defaults and empty-list sums with the real Math worker', async function () {
        this.timeout(20000);
        for (const text of ['return { total: document.amount * 2 + (document.bonus || 0) };',
            'return { total: document.rows.reduce((sum, row) => sum + row, 0) };',
            'return { total: document.bonus * 2 };']) {
            const { block } = setup();
            delete block.createWorker;
            const map = new DocumentMap();
            map.addDocument({ schema: '#in', document: { amount: 2, rows: [] } });
            const ref = refWith({ expression: { variables: [], formulas: [], outputs: [], code: text } });
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            step.setPreviewSource({ schema: '#in', document: { amount: 2, rows: [] },
                paths: ['amount', 'bonus', 'rows'], dependencies: {} });
            const run = () => PreviewScope.run(step, () => block.calculate(ref, map, makeUser(), '#in'));
            if (text.includes('document.bonus * 2')) {
                await assert.rejects(run(), /non-finite/);
                assert.deepEqual(getPreviewInputError(step).data.missingFields, ['bonus']);
            } else {
                const preview = await run();
                const normal = await block.calculate(ref, map, makeUser(), '#in');
                assert.deepEqual(preview, normal);
                assert.equal(preview.total, text.includes('reduce') ? 0 : 4);
                assert.equal(getPreviewInputError(step), null);
            }
        }
    });

    it('requires a getter path only where a call reads it without a fallback with the real Math worker', async function () {
        this.timeout(30000);
        for (const [text, missing] of [
            ["result.projectTitle = getField('projectTitle') || '';", null],
            ["const key = 'ra' + 'te'; result.rate = getField(key) ?? 0;", null],
            ["const optional = getField('rate') || 0; const key = 'ra' + 'te'; result.value = getField(key);", ['rate']],
            ["const optional = getField('rate') || 0; const read = getField; result.value = read('rate');", ['rate']],
            ["const optional = getField('rate') || 0; function read(key) { return getField(key); } result.value = read('rate');", ['rate']]
        ]) {
            const { block } = setup();
            delete block.createWorker;
            const map = new DocumentMap();
            map.addDocument({ schema: '#in', document: { amount: 2 } });
            const ref = refWith({ expression: { variables: [], formulas: [], outputs: [], code: `${text}\nresult.total = document.amount * 2;` } });
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            step.setPreviewSource({ schema: '#in', document: { amount: 2 }, paths: ['amount', 'rate', 'projectTitle'], dependencies: {} });
            await PreviewScope.run(step, () => block.calculate(ref, map, makeUser(), '#in'));
            assert.deepEqual(getPreviewInputError(step)?.data.missingFields ?? null, missing, text);
        }
    });

    it('keeps a direct getter read required after every JavaScript line break with the real Math worker', async function () {
        this.timeout(30000);
        for (const separator of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
            const { block } = setup();
            delete block.createWorker;
            const map = new DocumentMap();
            map.addDocument({ schema: '#in', document: { amount: 2 } });
            const text = `const key = 'ra' + 'te';${separator}const b = getField(key);\nif(false) getField('rate') || 0;\nresult.value = b;\nresult.total = document.amount * 2;`;
            const ref = refWith({ expression: { variables: [], formulas: [], outputs: [], code: text } });
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            step.setPreviewSource({ schema: '#in', document: { amount: 2 }, paths: ['amount', 'rate'], dependencies: {} });
            await PreviewScope.run(step, () => block.calculate(ref, map, makeUser(), '#in'));
            assert.deepEqual(getPreviewInputError(step)?.data.missingFields ?? null, ['rate'], JSON.stringify(separator));
        }
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
            body: 'return document.rate.value;',
            sites: [{ schema: null, path: 'rate', fullPath: 'rate', site: -2, listed: false }],
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

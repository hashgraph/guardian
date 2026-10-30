import assert from 'node:assert/strict';
import { buildCalculatePreviewCalculation, buildMathPreviewCalculation } from '../../../dist/policy-engine/helpers/preview.js';

const expression = {
    variables: [
        { type: 'link', name: 'a', description: '', field: 'amount', schema: '#in' }
    ],
    formulas: [
        { type: 'variable', name: 'b', body: 'a\\cdot2', description: 'Double', params: [], relationships: [] },
        { type: 'function', name: 'f', body: 'x+1', description: '', params: ['x'], relationships: [] }
    ],
    outputs: [
        { type: 'link', name: 'b', description: '', field: 'total', schema: '#out' }
    ]
};

describe('@unit preview calculations', () => {
    describe('buildMathPreviewCalculation', () => {
        it('lists variable inputs, formula values and saved outputs', () => {
            const scope = { a: 2, b: 4, f: 'Function', size: 'Function' };
            const calculation = buildMathPreviewCalculation('math', expression, scope, { total: 4 });
            assert.deepEqual(calculation, {
                source: 'math',
                blockType: 'mathBlock',
                inputs: [{ name: 'a', path: 'amount', value: 2 }],
                values: [{ name: 'b', description: 'Double', formula: 'a\\cdot2', value: 4 }],
                outputs: [{ name: 'b', path: 'total', value: 4 }]
            });
        });

        it('shows the output value from the saved document, not from the scope', () => {
            const calculation = buildMathPreviewCalculation('math', expression, { a: 2, b: 4 }, { total: 5 });
            assert.equal(calculation.outputs[0].value, 5);
        });

        it('uses null for a value the scope does not have', () => {
            const calculation = buildMathPreviewCalculation('math', expression, {}, {});
            assert.equal(calculation.inputs[0].value, null);
            assert.equal(calculation.values[0].value, null);
            assert.equal(calculation.outputs[0].value, null);
        });

        it('returns empty lists for a missing expression', () => {
            assert.deepEqual(buildMathPreviewCalculation('math', null, {}, {}), {
                source: 'math',
                blockType: 'mathBlock',
                inputs: [],
                values: [],
                outputs: []
            });
        });
    });

    describe('buildCalculatePreviewCalculation', () => {
        it('lists input fields, equations and output fields', () => {
            const calculation = buildCalculatePreviewCalculation(
                'calc',
                [{ name: 'amount', value: 'a' }],
                [{ name: 'total', value: 'c' }],
                { b: 'a * 2', c: 'b + 1' },
                { a: 2 },
                { a: 2, b: 4, c: 5 },
                { total: 5 }
            );
            assert.deepEqual(calculation, {
                source: 'calc',
                blockType: 'calculateContainerBlock',
                inputs: [{ name: 'a', path: 'amount', value: 2 }],
                values: [
                    { name: 'b', description: '', formula: 'a * 2', value: 4 },
                    { name: 'c', description: '', formula: 'b + 1', value: 5 }
                ],
                outputs: [{ name: 'c', path: 'total', value: 5 }]
            });
        });

        it('shows the input value from before the equations ran', () => {
            const calculation = buildCalculatePreviewCalculation(
                'calc',
                [{ name: 'amount', value: 'a' }],
                [],
                { a: 'a + 1' },
                { a: 2 },
                { a: 3 },
                {}
            );
            assert.equal(calculation.inputs[0].value, 2);
            assert.equal(calculation.values[0].value, 3);
        });

        it('shows the output value from the saved document, not from the scope', () => {
            const calculation = buildCalculatePreviewCalculation(
                'calc',
                [{ name: 'amount', value: 'a' }],
                [{ name: 'total', value: 'c' }],
                { c: 'a * 0' },
                { a: 2 },
                { a: 2, c: 0 },
                {}
            );
            assert.equal(calculation.values[0].value, 0);
            assert.equal(calculation.outputs[0].value, null);
        });

        it('accepts a block without input or output fields', () => {
            const calculation = buildCalculatePreviewCalculation('calc', undefined, undefined, {}, {}, {}, {});
            assert.deepEqual(calculation.inputs, []);
            assert.deepEqual(calculation.outputs, []);
        });
    });
});

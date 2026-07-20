import { assert } from 'chai';
import { AggregateBlock } from '../../../dist/policy-engine/block-validators/blocks/aggregate-block.js';

class FakeValidator {
    constructor() {
        this.errors = [];
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    parsFormulaVariables(value) {
        // Simple tokenizer: extract identifier-like substrings
        return (value.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []);
    }
}

const refWith = (overrides = {}) => ({ options: { ...overrides }, children: [] });

describe('AggregateBlock.validate', () => {
    it('rejects unknown aggregateType', async () => {
        const v = new FakeValidator();
        await AggregateBlock.validate(v, refWith({ aggregateType: 'mystery' }));
        assert.include(v.errors, 'Option "aggregateType" must be one of period, cumulative');
    });

    it('passes silently for aggregateType=period', async () => {
        const v = new FakeValidator();
        await AggregateBlock.validate(v, refWith({ aggregateType: 'period' }));
        assert.deepEqual(v.errors, []);
    });

    describe('aggregateType=cumulative', () => {
        it('rejects missing condition', async () => {
            const v = new FakeValidator();
            await AggregateBlock.validate(v, refWith({ aggregateType: 'cumulative' }));
            assert.include(v.errors, 'Option "condition" is not set');
        });

        it('rejects non-string condition', async () => {
            const v = new FakeValidator();
            await AggregateBlock.validate(v, refWith({ aggregateType: 'cumulative', condition: 42 }));
            assert.include(v.errors, 'Option "condition" must be a string');
        });

        it('rejects condition referencing undefined variables', async () => {
            const v = new FakeValidator();
            await AggregateBlock.validate(v, refWith({
                aggregateType: 'cumulative',
                condition: 'missingVar > 0',
                expressions: [{ name: 'declaredVar' }],
            }));
            assert.isTrue(v.errors.some((e) => e.includes("Variable 'missingVar' not defined")));
        });

        it('accepts when all referenced variables are declared', async () => {
            const v = new FakeValidator();
            await AggregateBlock.validate(v, refWith({
                aggregateType: 'cumulative',
                condition: 'a + b',
                expressions: [{ name: 'a' }, { name: 'b' }],
            }));
            assert.deepEqual(v.errors, []);
        });
    });

    describe('groupByFields', () => {
        it('rejects when any group field has empty fieldPath', async () => {
            const v = new FakeValidator();
            await AggregateBlock.validate(v, refWith({
                aggregateType: 'period',
                groupByFields: [{ fieldPath: 'a.b' }, { fieldPath: '' }],
            }));
            assert.include(v.errors, 'Field path in group fields can not be empty');
        });

        it('passes when all group fields have a path', async () => {
            const v = new FakeValidator();
            await AggregateBlock.validate(v, refWith({
                aggregateType: 'period',
                groupByFields: [{ fieldPath: 'a' }, { fieldPath: 'b' }],
            }));
            assert.deepEqual(v.errors, []);
        });
    });
});

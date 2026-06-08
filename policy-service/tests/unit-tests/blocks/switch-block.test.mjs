import { assert } from 'chai';
import { SwitchBlock } from '../../../dist/policy-engine/block-validators/blocks/switch-block.js';

class FakeValidator {
    constructor() {
        this.errors = [];
        this.parsedFormulas = [];
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    parsFormulaVariables(value) { this.parsedFormulas.push(value); }
}

const refWith = (overrides = {}) => ({
    options: {
        executionFlow: 'firstTrue',
        conditions: [],
        ...overrides,
    },
    children: [],
});

describe('SwitchBlock.validate', () => {
    it('rejects unknown executionFlow', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({ executionFlow: 'parallel' }));
        assert.include(
            v.errors,
            'Option "executionFlow" must be one of firstTrue, allTrue',
        );
    });

    it('accepts firstTrue and allTrue', async () => {
        for (const flow of ['firstTrue', 'allTrue']) {
            const v = new FakeValidator();
            await SwitchBlock.validate(v, refWith({ executionFlow: flow }));
            assert.deepEqual(v.errors, []);
        }
    });

    it('rejects when conditions is not set', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({ conditions: undefined }));
        assert.include(v.errors, 'Option "conditions" is not set');
    });

    it('rejects when conditions is not an array', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({ conditions: 'not-array' }));
        assert.include(v.errors, 'Option "conditions" must be an array');
    });

    it('rejects unknown condition.type', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({
            conditions: [{ type: 'maybe', tag: 't1', value: 'x' }],
        }));
        assert.include(
            v.errors,
            'Option "condition.type" must be one of equal, not_equal, unconditional',
        );
    });

    it('requires condition.value when type is equal/not_equal', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({
            conditions: [{ type: 'equal', tag: 't1' }],
        }));
        assert.include(v.errors, 'Option "condition.value" is not set');
    });

    it('parses formula variables for value-bearing conditions', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({
            conditions: [{ type: 'equal', tag: 't1', value: 'a + b' }],
        }));
        assert.deepEqual(v.parsedFormulas, ['a + b']);
    });

    it('rejects missing condition tag', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({
            conditions: [{ type: 'unconditional' }],
        }));
        assert.include(v.errors, 'Option "tag" is not set');
    });

    it('rejects duplicate condition tags', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({
            conditions: [
                { type: 'unconditional', tag: 't1' },
                { type: 'unconditional', tag: 't1' },
            ],
        }));
        assert.include(v.errors, 'Condition Tag t1 already exist');
    });

    it('accepts unconditional without value', async () => {
        const v = new FakeValidator();
        await SwitchBlock.validate(v, refWith({
            conditions: [{ type: 'unconditional', tag: 't1' }],
        }));
        assert.deepEqual(v.errors, []);
    });
});

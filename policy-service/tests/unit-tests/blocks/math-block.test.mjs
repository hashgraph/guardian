import { assert } from 'chai';
import { MathBlock } from '../../../dist/policy-engine/block-validators/blocks/math-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._schemas = opts.schemas || {};
        this._schemaIssues = opts.schemaIssues || {};
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchemaVariable(name) {
        return this._schemaIssues[name] ?? null;
    }
    getSchema(id) { return this._schemas[id] ?? null; }
}

const refWith = (overrides = {}) => ({
    options: {
        inputSchema: 'in-1',
        outputSchema: 'out-1',
        expression: '1 + 2',
        ...overrides,
    },
    children: [],
});

describe('MathBlock.validate', () => {
    const schemas = { 'in-1': {}, 'out-1': {} };

    it('errors when inputSchema fails validation', async () => {
        const v = new FakeValidator({
            schemas,
            schemaIssues: { inputSchema: 'inputSchema required' },
        });
        await MathBlock.validate(v, refWith());
        assert.include(v.errors, 'inputSchema required');
    });

    it('errors when inputSchema does not exist in registry', async () => {
        const v = new FakeValidator({ schemas: {} });
        await MathBlock.validate(v, refWith());
        assert.include(v.errors, 'Schema with id "in-1" does not exist');
    });

    it('errors when outputSchema fails validation', async () => {
        const v = new FakeValidator({
            schemas: { 'in-1': {} },
            schemaIssues: { outputSchema: 'outputSchema required' },
        });
        await MathBlock.validate(v, refWith());
        assert.include(v.errors, 'outputSchema required');
    });

    it('errors when outputSchema does not exist', async () => {
        const v = new FakeValidator({ schemas: { 'in-1': {} } });
        await MathBlock.validate(v, refWith());
        assert.include(v.errors, 'Schema with id "out-1" does not exist');
    });

    it('errors when expression is missing', async () => {
        const v = new FakeValidator({ schemas });
        await MathBlock.validate(v, refWith({ expression: undefined }));
        assert.include(v.errors, 'Option "expression" is not set');
    });

    it('passes when both schemas exist and expression is well-formed', async () => {
        const v = new FakeValidator({ schemas });
        await MathBlock.validate(v, refWith({ expression: 'a + 1' }));
        assert.deepEqual(v.errors, []);
    });

    it('skips outputSchema checks when not provided', async () => {
        const v = new FakeValidator({ schemas: { 'in-1': {} } });
        await MathBlock.validate(v, refWith({ outputSchema: undefined, expression: '1 + 1' }));
        assert.deepEqual(v.errors, []);
    });
});

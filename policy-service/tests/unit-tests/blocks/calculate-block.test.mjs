import { assert } from 'chai';
import { CalculateContainerBlock } from '../../../dist/policy-engine/block-validators/blocks/calculate-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._schemaIssues = opts.schemaIssues || {};
        this._schemas = opts.schemas || {};
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchemaVariable(name, value, required) {
        if (this._schemaIssues[name]) return this._schemaIssues[name];
        if (required && !value) return `${name} required`;
        return null;
    }
    getSchema(id) { return this._schemas[id] ?? null; }
}

const refWith = (overrides = {}) => ({
    options: {
        inputSchema: 'in-1',
        outputSchema: 'out-1',
        inputFields: [],
        outputFields: [],
        ...overrides,
    },
    children: [],
});

describe('CalculateContainerBlock.validate', () => {
    it('errors when inputSchema validation fails', async () => {
        const v = new FakeValidator({
            schemaIssues: { inputSchema: 'bad input schema' },
        });
        await CalculateContainerBlock.validate(v, refWith());
        assert.deepEqual(v.errors, ['bad input schema']);
    });

    it('errors when outputSchema validation fails', async () => {
        const v = new FakeValidator({
            schemaIssues: { outputSchema: 'bad output schema' },
        });
        await CalculateContainerBlock.validate(v, refWith());
        assert.deepEqual(v.errors, ['bad output schema']);
    });

    it('errors when an outputField references an undefined variable', async () => {
        const v = new FakeValidator({
            schemas: {
                'out-1': {
                    document: { properties: {}, required: [] },
                    fields: [],
                },
            },
        });
        await CalculateContainerBlock.validate(
            v,
            refWith({
                inputFields: [{ value: 'x', name: 'x_friendly' }],
                outputFields: [{ value: 'undeclared', name: 'whatever' }],
            }),
        );
        assert.include(v.errors, 'Variable undeclared not defined');
    });

    it('errors when the resolved output schema is not in the registry', async () => {
        const v = new FakeValidator({ schemas: {} });
        await CalculateContainerBlock.validate(v, refWith());
        assert.include(v.errors, 'Schema with id "out-1" does not exist');
    });
});

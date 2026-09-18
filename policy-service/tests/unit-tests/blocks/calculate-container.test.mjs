import { assert } from 'chai';
import { CalculateContainerBlock } from '../../../dist/policy-engine/block-validators/blocks/calculate-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._schemaIssues = opts.schemaIssues || {};
        this._schemas = opts.schemas || {};
        this._throw = !!opts.throwGetArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact() { if (this._throw) { throw new Error('artifact-down'); } return {}; }
    validateSchemaVariable(name, value, required) {
        if (this._schemaIssues[name]) { return this._schemaIssues[name]; }
        if (required && !value) { return `${name} required`; }
        return null;
    }
    getSchema(id) { return this._schemas[id] ?? null; }
}

const emptySchema = { document: { properties: {}, required: [] }, fields: [] };

const refWith = (options = {}, children = []) => ({
    options: { inputSchema: 'in', outputSchema: 'out', inputFields: [], outputFields: [], ...options },
    children,
});

describe('@unit P0 CalculateContainerBlock.validate', () => {
    it('blockType is calculateContainerBlock', () => {
        assert.equal(CalculateContainerBlock.blockType, 'calculateContainerBlock');
    });

    it('errors and returns early on bad inputSchema', async () => {
        const v = new FakeValidator({ schemaIssues: { inputSchema: 'bad input' } });
        await CalculateContainerBlock.validate(v, refWith());
        assert.deepEqual(v.errors, ['bad input']);
    });

    it('errors and returns early on bad outputSchema', async () => {
        const v = new FakeValidator({ schemaIssues: { outputSchema: 'bad output' } });
        await CalculateContainerBlock.validate(v, refWith());
        assert.deepEqual(v.errors, ['bad output']);
    });

    it('passes with empty fields and an empty registered output schema', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema } });
        await CalculateContainerBlock.validate(v, refWith());
        assert.deepEqual(v.errors, []);
    });

    it('errors when output schema is not registered', async () => {
        const v = new FakeValidator({ schemas: {} });
        await CalculateContainerBlock.validate(v, refWith());
        assert.include(v.errors, 'Schema with id "out" does not exist');
    });

    it('errors when an outputField references an undefined variable', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema } });
        await CalculateContainerBlock.validate(v, refWith({
            outputFields: [{ value: 'ghost', name: 'g' }],
        }));
        assert.include(v.errors, 'Variable ghost not defined');
    });

    it('accepts an outputField backed by an inputField variable', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema } });
        await CalculateContainerBlock.validate(v, refWith({
            inputFields: [{ value: 'x', name: 'X' }],
            outputFields: [{ value: 'x', name: 'mapped' }],
        }));
        assert.deepEqual(v.errors, []);
    });

    it('skips outputFields with a falsy value', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema } });
        await CalculateContainerBlock.validate(v, refWith({
            outputFields: [{ value: '', name: 'ignored' }],
        }));
        assert.deepEqual(v.errors, []);
    });

    it('resolves a variable supplied by a calculateMathAddon child', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema } });
        const child = { blockType: 'calculateMathAddon', options: { equations: [{ variable: 'sum', formula: 'a+b' }] } };
        await CalculateContainerBlock.validate(v, refWith({
            outputFields: [{ value: 'sum', name: 'total' }],
        }, [child]));
        assert.deepEqual(v.errors, []);
    });

    it('resolves a variable supplied by a calculateMathVariables child', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema } });
        const child = { blockType: 'calculateMathVariables', options: { variables: [{ variableName: 'v', variablePath: 'a.b' }] } };
        await CalculateContainerBlock.validate(v, refWith({
            outputFields: [{ value: 'v', name: 'mapped' }],
        }, [child]));
        assert.deepEqual(v.errors, []);
    });

    it('ignores unrelated child block types when collecting variables', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema } });
        const child = { blockType: 'somethingElse', options: {} };
        await CalculateContainerBlock.validate(v, refWith({
            outputFields: [{ value: 'nope', name: 'n' }],
        }, [child]));
        assert.include(v.errors, 'Variable nope not defined');
    });

    it('passes when a registered output schema has no required fields', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema } });
        await CalculateContainerBlock.validate(v, refWith({
            inputFields: [{ value: 'x', name: 'X' }],
            outputFields: [{ value: 'x', name: 'mapped' }],
        }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ schemas: { out: emptySchema }, throwGetArtifact: true });
        await CalculateContainerBlock.validate(v, refWith({ artifacts: [{ uuid: 'a' }] }));
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});

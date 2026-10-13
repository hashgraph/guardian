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

const link = (name, field, schema = '') => ({
    type: 'link',
    name,
    field,
    schema,
    description: '',
});

const expressionWith = ({ variables = [], outputs = [] }) => ({
    variables,
    formulas: [],
    outputs,
});

const field = (name, overrides = {}) => ({
    name,
    description: name,
    required: false,
    isArray: false,
    isRef: false,
    type: 'string',
    format: '',
    pattern: '',
    readOnly: false,
    unit: '',
    unitSystem: '',
    property: '',
    customType: '',
    fields: [],
    isUpdatable: false,
    ...overrides,
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

    it('fails validation when an input variable path is not found in the schema', async () => {
        const v = new FakeValidator({
            schemas: {
                'in-1': { fields: [field('existing')] },
                'out-1': { fields: [field('result')] },
            },
        });

        await MathBlock.validate(v, refWith({
            expression: expressionWith({
                variables: [link('x', 'missing')],
                outputs: [link('x', 'result')],
            }),
        }));

        assert.lengthOf(v.errors, 1);
        assert.include(v.errors[0], 'Path not found in schema for Math block inputs');
        assert.include(v.errors[0], 'missing.');
    });

    it('fails validation when an input variable references a missing relationship schema', async () => {
        const v = new FakeValidator({
            schemas: {
                'in-1': { fields: [field('existing')] },
                'out-1': { fields: [field('result')] },
            },
        });

        await MathBlock.validate(v, refWith({
            expression: expressionWith({
                variables: [link('x', 'anyPath', 'relationship-1')],
                outputs: [link('x', 'result')],
            }),
        }));

        assert.lengthOf(v.errors, 1);
        assert.include(v.errors[0], 'Path not found in schema for Math block inputs');
        assert.include(v.errors[0], 'anyPath');
    });

    it('includes schema ids only when missing input paths span multiple schemas', async () => {
        const v = new FakeValidator({
            schemas: {
                'in-1': { fields: [field('existing')] },
                'rel-1': { fields: [field('related')] },
                'out-1': { fields: [field('result')] },
            },
        });

        await MathBlock.validate(v, refWith({
            expression: expressionWith({
                variables: [
                    link('x', 'missingInput'),
                    link('y', 'missingRelated', 'rel-1'),
                ],
                outputs: [link('x', 'result')],
            }),
        }));

        assert.lengthOf(v.errors, 1);
        assert.include(v.errors[0], 'missingInput (in-1)');
        assert.include(v.errors[0], 'missingRelated (rel-1)');
    });

    it('fails validation when an output path is not found in the output schema', async () => {
        const v = new FakeValidator({
            schemas: {
                'in-1': { fields: [field('existing')] },
                'out-1': { fields: [field('result')] },
            },
        });

        await MathBlock.validate(v, refWith({
            expression: expressionWith({
                variables: [link('x', 'existing')],
                outputs: [link('x', 'missingOutput')],
            }),
        }));

        assert.lengthOf(v.errors, 1);
        assert.include(v.errors[0], 'Path not found in schema for Math block outputs');
        assert.include(v.errors[0], 'missingOutput.');
    });

    it('keeps input table column paths valid but rejects them for outputs', async () => {
        const table = field('siteTable', {
            customType: 'table',
            tableColumns: [{ name: 'Area (ha)', key: 'area_ha' }],
        });

        const v = new FakeValidator({
            schemas: {
                'in-1': { fields: [table] },
                'out-1': { fields: [table] },
            },
        });

        await MathBlock.validate(v, refWith({
            expression: expressionWith({
                variables: [link('x', 'siteTable.area_ha')],
                outputs: [link('x', 'siteTable.area_ha')],
            }),
        }));

        assert.lengthOf(v.errors, 1);
        assert.include(v.errors[0], 'Path not found in schema for Math block outputs');
        assert.include(v.errors[0], 'siteTable.area_ha.');
    });

    it('combines input and output path errors under one corrective action', async () => {
        const v = new FakeValidator({
            schemas: {
                'in-1': { fields: [field('existing')] },
                'out-1': { fields: [field('result')] },
            },
        });

        await MathBlock.validate(v, refWith({
            expression: expressionWith({
                variables: [link('x', 'missingInput')],
                outputs: [link('x', 'missingOutput')],
            }),
        }));

        assert.lengthOf(v.errors, 1);
        assert.include(v.errors[0], 'Path not found in schema for Math block paths');
        assert.include(v.errors[0], 'inputs: missingInput');
        assert.include(v.errors[0], 'outputs: missingOutput');
        assert.equal(
            v.errors[0].split('Review the Math block field paths and update references to existing schema fields.').length,
            2
        );
    });
});

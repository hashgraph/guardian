import { assert } from 'chai';
import { MathBlock } from '../../../dist/policy-engine/block-validators/blocks/math-block.js';
import { MathBlock as MathBlockRuntime } from '../../../dist/policy-engine/blocks/math-block.js';
import { makeBlock, restoreHarness } from './_block-exec-harness.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyCredential } from '../../../dist/policy-engine/helpers/policy-credential.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

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

const INPUT_IRI = '#input-schema';

const inputSchemaDocument = JSON.stringify({
    $id: INPUT_IRI,
    title: 'Input',
    type: 'object',
    properties: {
        total: {
            title: 'total',
            description: 'Total',
            type: 'number',
            readOnly: false,
            $comment: JSON.stringify({ term: 'total' })
        }
    },
    required: []
});

const runtimeRefWith = (options = {}) => ({
    blockType: 'mathBlock',
    uuid: 'uuid-1',
    policyId: 'policy-1',
    dryRun: null,
    policyOwner: 'did:owner',
    components: { generateUUID: async () => 'uuid-vc' },
    getOptions: async () => ({
        expression: { variables: [], formulas: [], outputs: [] },
        inputSchema: INPUT_IRI,
        outputSchema: '',
        ...options
    })
});

describe('MathBlock runtime output schema fallback', () => {
    let orig;
    let loaded;

    beforeEach(() => {
        orig = {
            loadSchemaByID: PolicyUtils.loadSchemaByID,
            getUserCredentials: PolicyUtils.getUserCredentials,
            createVC: PolicyUtils.createVC,
            setGuardianVersion: PolicyUtils.setGuardianVersion,
            policyCredentialCreateVC: PolicyCredential.createVC,
            blockErrorFn: PolicyComponentsUtils.BlockErrorFn
        };
        loaded = [];
        PolicyUtils.loadSchemaByID = async (_ref, id) => {
            loaded.push(id);
            return { iri: id, name: 'Schema', document: inputSchemaDocument, contextURL: 'ctx' };
        };
        PolicyUtils.getUserCredentials = async () => ({ loadDidDocument: async () => ({}) });
        PolicyUtils.setGuardianVersion = () => undefined;
        PolicyUtils.createVC = (_ref, owner, vc) => ({ owner, document: vc });
        PolicyCredential.createVC = async (_helper, subject) => ({ credentialSubject: [subject] });
        PolicyComponentsUtils.BlockErrorFn = async () => undefined;
    });

    afterEach(() => {
        Object.assign(PolicyUtils, {
            loadSchemaByID: orig.loadSchemaByID,
            getUserCredentials: orig.getUserCredentials,
            createVC: orig.createVC,
            setGuardianVersion: orig.setGuardianVersion
        });
        PolicyCredential.createVC = orig.policyCredentialCreateVC;
        PolicyComponentsUtils.BlockErrorFn = orig.blockErrorFn;
    });

    after(() => restoreHarness());

    const block = () => makeBlock(MathBlockRuntime, { options: { onErrorAction: 'no-action' } }).block;

    const metadata = { owner: 'did:user', id: 'id-1', relationships: [] };

    it('creates the VC with the input schema type and iri when outputSchema is unset', async () => {
        const item = await block().createDocument({ total: 1 }, metadata, runtimeRefWith(), 'user-1');

        assert.deepEqual(loaded, [INPUT_IRI]);
        assert.equal(item.type, INPUT_IRI);
        assert.equal(item.schema, INPUT_IRI);
    });

    it('prefers outputSchema over inputSchema when it is set', async () => {
        const item = await block().createDocument(
            { total: 1 },
            metadata,
            runtimeRefWith({ outputSchema: '#output-schema' }),
            'user-1'
        );

        assert.deepEqual(loaded, ['#output-schema']);
        assert.equal(item.type, '#output-schema');
        assert.equal(item.schema, '#output-schema');
    });
});
